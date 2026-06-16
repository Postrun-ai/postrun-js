import type {
  Connection,
  CreatePostInput,
  MediaResource,
  PostMetadata,
  PostPlatform,
  PostTypeFor,
  PostVariantInput,
  PublishMode,
  SettingsFor,
  UpdatePostInput,
} from './resources';

/** The posting platforms (type-checked against the contract via `satisfies`). */
export const POST_PLATFORMS = [
  'x',
  'linkedin',
  'facebook_page',
  'instagram',
] as const satisfies readonly PostPlatform[];

// Compile-time EXHAUSTIVENESS: if the contract adds a posting platform that
// isn't in POST_PLATFORMS (and so isn't dispatched in buildVariants), this fails
// the build — `satisfies` alone only proves the listed members are valid.
type AssertExhaustive<T extends never> = T;
type _PostPlatformsExhaustive = AssertExhaustive<
  Exclude<PostPlatform, (typeof POST_PLATFORMS)[number]>
>;

/** Narrow any platform string to a posting platform. */
export function isPostPlatform(value: string): value is PostPlatform {
  return POST_PLATFORMS.some((platform) => platform === value);
}

/* --------------------------------- types --------------------------------- */

/** A media attachment — the uploaded asset (or just its id + kind). */
export type MediaInput = Pick<MediaResource, 'id' | 'kind'>;

/** Base content, shared across channels unless a channel overrides it. */
export interface PostContent {
  body?: string;
  media?: readonly MediaInput[];
}

/**
 * Per-channel overrides. `settings` is a PARTIAL of this platform's native shape
 * — the customer overrides specific fields and the builder fills the dependent
 * ones (LinkedIn `content_kind`, Instagram `media_type`). Still strongly typed:
 * an Instagram setting on an X channel is a compile error.
 */
export interface ChannelOverride<P extends PostPlatform> {
  body?: string;
  media?: readonly MediaInput[];
  postType?: PostTypeFor<P>;
  settings?: Partial<SettingsFor<P>>;
  connectionId?: string;
}

/** Either a broadcast list of platforms, or a per-platform override map. */
export type Channels =
  | readonly PostPlatform[]
  | { [P in PostPlatform]?: ChannelOverride<P> };

export interface ComposePostInput {
  profileId: string;
  content: PostContent;
  channels: Channels;
  publish?: PublishMode;
  scheduleAt?: string;
  externalId?: string;
  metadata?: PostMetadata;
  tags?: readonly string[];
  notes?: string;
  dryRun?: boolean;
}

/** The connections a build resolves against (accepts a full `Connection[]`). */
export type ConnectionRef = Pick<Connection, 'id' | 'platform'>;

/** Thrown when a post can't be composed (no connection, missing media, …). */
export class ComposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeError';
  }
}

type VariantFor<P extends PostPlatform> = Extract<PostVariantInput, { platform: P }>;

interface BuildContext {
  content: PostContent;
  connections: readonly ConnectionRef[];
}

/* -------------------------------- helpers -------------------------------- */

/** A custom guard — `Array.isArray` doesn't narrow a `readonly` array union. */
function isPlatformList(channels: Channels): channels is readonly PostPlatform[] {
  return Array.isArray(channels);
}

function toOverrides(channels: Channels): { [P in PostPlatform]?: ChannelOverride<P> } {
  if (!isPlatformList(channels)) {
    return channels;
  }
  const overrides: { [P in PostPlatform]?: ChannelOverride<P> } = {};
  for (const platform of channels) {
    overrides[platform] = {};
  }
  return overrides;
}

function resolveConnectionId<P extends PostPlatform>(
  platform: P,
  override: ChannelOverride<P>,
  connections: readonly ConnectionRef[],
): string {
  if (override.connectionId) {
    return override.connectionId;
  }
  const match = connections.find((connection) => connection.platform === platform);
  if (!match) {
    throw new ComposeError(
      `No connection for "${platform}" on this profile. Connect the account or pass connectionId.`,
    );
  }
  return match.id;
}

function resolveMedia<P extends PostPlatform>(
  override: ChannelOverride<P>,
  content: PostContent,
): readonly MediaInput[] {
  return override.media ?? content.media ?? [];
}

function toMediaRefs(media: readonly MediaInput[]) {
  return media.map((item) => ({ media_id: item.id }));
}

/**
 * A document asset (LinkedIn PDF/DOC/…) can't be auto-composed: it needs
 * `content_kind: 'document'` and a `settings.document.title` we can't derive, and
 * deriving it as `single_image` would silently publish the file as an image. So
 * refuse the auto-path and tell the caller to be explicit.
 */
function guardNoDocument(media: readonly MediaInput[]): void {
  if (media.some((item) => item.kind === 'document')) {
    throw new ComposeError(
      "A document upload can't be auto-composed. Pass an explicit postType and settings " +
        '(LinkedIn documents need settings: { content_kind: "document", document: { title } }).',
    );
  }
}

function countKinds(media: readonly MediaInput[]) {
  let images = 0;
  let videos = 0;
  for (const item of media) {
    if (item.kind === 'video') {
      videos += 1;
    } else if (item.kind === 'image' || item.kind === 'gif') {
      images += 1;
    }
  }
  return { images, videos };
}

/* --------------------------- per-platform builders ------------------------ */

/** X and LinkedIn share the text/single/multi/video shape. */
function deriveStandardPostType(
  media: readonly MediaInput[],
): PostTypeFor<'x'> & PostTypeFor<'linkedin'> {
  guardNoDocument(media);
  if (media.length === 0) return 'text';
  const { images, videos } = countKinds(media);
  if (videos >= 1) return 'video';
  return images >= 2 ? 'multi_image' : 'single_image';
}

function buildX(override: ChannelOverride<'x'>, ctx: BuildContext): VariantFor<'x'> {
  const media = resolveMedia(override, ctx.content);
  return {
    platform: 'x',
    post_type: override.postType ?? deriveStandardPostType(media),
    connection_id: resolveConnectionId('x', override, ctx.connections),
    body: override.body ?? ctx.content.body,
    media: toMediaRefs(media),
    settings: override.settings ?? {},
  };
}

function linkedInContentKind(
  postType: PostTypeFor<'linkedin'>,
): NonNullable<SettingsFor<'linkedin'>['content_kind']> {
  return postType;
}

function buildLinkedIn(
  override: ChannelOverride<'linkedin'>,
  ctx: BuildContext,
): VariantFor<'linkedin'> {
  const media = resolveMedia(override, ctx.content);
  const postType = override.postType ?? deriveStandardPostType(media);
  return {
    platform: 'linkedin',
    post_type: postType,
    connection_id: resolveConnectionId('linkedin', override, ctx.connections),
    body: override.body ?? ctx.content.body,
    media: toMediaRefs(media),
    settings: {
      visibility: 'PUBLIC',
      content_kind: linkedInContentKind(postType),
      ...override.settings,
    },
  };
}

function deriveFacebookPostType(media: readonly MediaInput[]): PostTypeFor<'facebook_page'> {
  guardNoDocument(media);
  if (media.length === 0) return 'text';
  const { images, videos } = countKinds(media);
  if (videos >= 1) return 'reel';
  return images >= 2 ? 'multi_image' : 'single_image';
}

function buildFacebook(
  override: ChannelOverride<'facebook_page'>,
  ctx: BuildContext,
): VariantFor<'facebook_page'> {
  const media = resolveMedia(override, ctx.content);
  return {
    platform: 'facebook_page',
    post_type: override.postType ?? deriveFacebookPostType(media),
    connection_id: resolveConnectionId('facebook_page', override, ctx.connections),
    body: override.body ?? ctx.content.body,
    media: toMediaRefs(media),
    settings: override.settings ?? {},
  };
}

function deriveInstagramPostType(media: readonly MediaInput[]): PostTypeFor<'instagram'> {
  guardNoDocument(media);
  if (media.length === 0) {
    throw new ComposeError('Instagram requires at least one media item.');
  }
  const { images, videos } = countKinds(media);
  if (videos >= 1) return 'reel';
  return images >= 2 ? 'carousel' : 'single_image';
}

function instagramMediaType(
  postType: PostTypeFor<'instagram'>,
): NonNullable<SettingsFor<'instagram'>['media_type']> {
  if (postType === 'carousel') return 'CAROUSEL';
  if (postType === 'reel') return 'REELS';
  return 'IMAGE';
}

function buildInstagram(
  override: ChannelOverride<'instagram'>,
  ctx: BuildContext,
): VariantFor<'instagram'> {
  const media = resolveMedia(override, ctx.content);
  const postType = override.postType ?? deriveInstagramPostType(media);
  return {
    platform: 'instagram',
    post_type: postType,
    connection_id: resolveConnectionId('instagram', override, ctx.connections),
    body: override.body ?? ctx.content.body,
    media: toMediaRefs(media),
    settings: {
      media_type: instagramMediaType(postType),
      ...override.settings,
    },
  };
}

/* ---------------------------------- build --------------------------------- */

/** Build the typed `variants[]` from base content + per-channel overrides. */
function buildVariants(
  content: PostContent,
  channels: Channels,
  connections: readonly ConnectionRef[],
): PostVariantInput[] {
  const overrides = toOverrides(channels);
  const ctx: BuildContext = { content, connections };
  const variants: PostVariantInput[] = [];

  if (overrides.x) variants.push(buildX(overrides.x, ctx));
  if (overrides.linkedin) variants.push(buildLinkedIn(overrides.linkedin, ctx));
  if (overrides.facebook_page) variants.push(buildFacebook(overrides.facebook_page, ctx));
  if (overrides.instagram) variants.push(buildInstagram(overrides.instagram, ctx));

  if (variants.length === 0) {
    throw new ComposeError('At least one channel is required.');
  }
  return variants;
}

/**
 * Turn an ergonomic `{ content, channels }` compose input into the exact
 * `CreatePostInput` the API expects — resolving each channel's connection,
 * deriving `post_type` from the media, and filling the platform-dependent
 * settings (LinkedIn `content_kind`, Instagram `media_type`). The customer never
 * assembles a `variants[]` by hand, and never sees a `connection_id`.
 */
export function buildCreatePost(
  input: ComposePostInput,
  connections: readonly ConnectionRef[],
): CreatePostInput {
  return {
    profile_id: input.profileId,
    publish: input.publish,
    schedule_at: input.scheduleAt,
    external_id: input.externalId,
    metadata: input.metadata,
    tags: input.tags ? [...input.tags] : undefined,
    notes: input.notes,
    dry_run: input.dryRun,
    variants: buildVariants(input.content, input.channels, connections),
  };
}

/** A post edit. Omit `channels` for a light edit (reschedule/retag); include it
 *  to rebuild the variant set (PATCH replaces it). */
export interface ComposeUpdateInput {
  content?: PostContent;
  channels?: Channels;
  publish?: PublishMode;
  scheduleAt?: string;
  externalId?: string;
  metadata?: PostMetadata;
  tags?: readonly string[];
  notes?: string;
  dryRun?: boolean;
}

/**
 * Build an `UpdatePostInput`. With `channels`, the full variant set is rebuilt
 * (the API's PATCH replaces it); without it, only the envelope (schedule, tags,
 * publish mode…) changes and the variants are left untouched.
 */
/** The envelope fields the API counts as a real edit (`dry_run` deliberately not). */
const MUTABLE_ENVELOPE_KEYS = [
  'publish',
  'scheduleAt',
  'externalId',
  'metadata',
  'tags',
  'notes',
] as const satisfies readonly (keyof ComposeUpdateInput)[];

export function buildUpdatePost(
  input: ComposeUpdateInput,
  connections: readonly ConnectionRef[] = [],
): UpdatePostInput {
  const changesEnvelope = MUTABLE_ENVELOPE_KEYS.some(
    (key) => input[key] !== undefined,
  );
  if (!input.channels && !changesEnvelope) {
    throw new ComposeError(
      'A post update must change at least one field — pass content/channels or an ' +
        'envelope field (publish, scheduleAt, tags, …).',
    );
  }

  return {
    publish: input.publish,
    schedule_at: input.scheduleAt,
    external_id: input.externalId,
    metadata: input.metadata,
    tags: input.tags ? [...input.tags] : undefined,
    notes: input.notes,
    dry_run: input.dryRun,
    variants: input.channels
      ? buildVariants(input.content ?? {}, input.channels, connections)
      : undefined,
  };
}

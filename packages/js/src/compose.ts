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

/* --------------------------------- types --------------------------------- */

/** A media attachment — the uploaded asset (or just its id + kind). */
export type MediaInput = Pick<MediaResource, 'id' | 'kind'>;

/** Base content, shared across channels unless a channel overrides it. */
export interface PostContent {
  body?: string;
  media?: readonly MediaInput[];
}

/**
 * One channel's config. The SDK owns the plumbing (connection, media, assembly)
 * and derives `post_type` from the media; the CUSTOMER owns `settings` — the
 * platform's native, fully-typed config. An Instagram setting on an X channel is
 * a compile error. `postType` is an optional override of the derived value.
 */
export interface ChannelConfig<P extends PostPlatform> {
  settings: SettingsFor<P>;
  postType?: PostTypeFor<P>;
  body?: string;
  media?: readonly MediaInput[];
  connectionId?: string;
}

/** Channels keyed by platform — each value typed to that platform. */
export type Channels = { [P in PostPlatform]?: ChannelConfig<P> };

export interface ComposePostInput {
  profileId: string;
  content?: PostContent;
  channels: Channels;
  publish?: PublishMode;
  scheduleAt?: string;
  externalId?: string;
  metadata?: PostMetadata;
  tags?: readonly string[];
  notes?: string;
  dryRun?: boolean;
}

/** A post edit. Omit `channels` for a light edit; include it to rebuild variants. */
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

/** The connections a build resolves against (accepts a full `Connection[]`). */
export type ConnectionRef = Pick<Connection, 'id' | 'platform'>;

/** Thrown when a post can't be composed (no connection, unsupported media, …). */
export class ComposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeError';
  }
}

type VariantFor<P extends PostPlatform> = Extract<PostVariantInput, { platform: P }>;

/* ----------------------------- platform handlers -------------------------- */

/** What a handler receives once `post_type` is resolved (derived or explicit). */
interface ResolvedChannel<P extends PostPlatform> {
  settings: SettingsFor<P>;
  postType: PostTypeFor<P>;
  connectionId: string;
  body: string | undefined;
  media: readonly { media_id: string }[];
}

/**
 * Each platform implements two layers:
 *  - `derivePostType` — the SUGAR: guess `post_type` from the media. Pure; only
 *    runs when the caller doesn't pass `postType`.
 *  - `buildVariant` — the explicit CORE: assemble the typed variant from a
 *    resolved channel. Passes `settings` straight through (the customer owns it).
 * Splitting them keeps the core stable and the derivation purely additive.
 */
interface PlatformHandler<P extends PostPlatform> {
  derivePostType(media: readonly MediaInput[]): PostTypeFor<P>;
  buildVariant(resolved: ResolvedChannel<P>): VariantFor<P>;
}

function countKinds(media: readonly MediaInput[]) {
  let images = 0;
  let videos = 0;
  let documents = 0;
  for (const item of media) {
    if (item.kind === 'video') videos += 1;
    else if (item.kind === 'document') documents += 1;
    else images += 1; // image | gif
  }
  return { images, videos, documents };
}

function rejectDocuments(media: readonly MediaInput[], platform: string): void {
  if (countKinds(media).documents > 0) {
    throw new ComposeError(`${platform} does not support document uploads.`);
  }
}

/**
 * X / LinkedIn / Facebook have no mixed-media placement: a post is text, images,
 * OR a single video — never a blend. Reject the combos that have no valid
 * post_type here (a clear local error), not as a server 422.
 */
function deriveSinglePlacement<V extends 'video' | 'reel'>(
  media: readonly MediaInput[],
  platform: string,
  videoType: V,
): 'single_image' | 'multi_image' | V {
  const { images, videos } = countKinds(media);
  if (images > 0 && videos > 0) {
    throw new ComposeError(
      `${platform} can't combine images and video in one post — split them into separate posts.`,
    );
  }
  if (videos > 1) {
    throw new ComposeError(`${platform} allows at most one video per post.`);
  }
  if (videos === 1) return videoType;
  return images >= 2 ? 'multi_image' : 'single_image';
}

const xHandler: PlatformHandler<'x'> = {
  derivePostType: (media) => {
    if (media.length === 0) return 'text';
    rejectDocuments(media, 'X');
    return deriveSinglePlacement(media, 'X', 'video');
  },
  buildVariant: ({ settings, postType, connectionId, body, media }) => ({
    platform: 'x',
    post_type: postType,
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const linkedInHandler: PlatformHandler<'linkedin'> = {
  derivePostType: (media) => {
    if (media.length === 0) return 'text';
    if (countKinds(media).documents > 0) {
      // A document rides as a `single_image` post_type; the customer sets
      // `content_kind: 'document'` in settings — we don't infer it.
      if (media.length > 1) {
        throw new ComposeError('A LinkedIn document post takes a single document.');
      }
      return 'single_image';
    }
    return deriveSinglePlacement(media, 'LinkedIn', 'video');
  },
  buildVariant: ({ settings, postType, connectionId, body, media }) => ({
    platform: 'linkedin',
    post_type: postType,
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const facebookHandler: PlatformHandler<'facebook_page'> = {
  derivePostType: (media) => {
    if (media.length === 0) return 'text';
    rejectDocuments(media, 'Facebook');
    return deriveSinglePlacement(media, 'Facebook', 'reel');
  },
  buildVariant: ({ settings, postType, connectionId, body, media }) => ({
    platform: 'facebook_page',
    post_type: postType,
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const instagramHandler: PlatformHandler<'instagram'> = {
  derivePostType: (media) => {
    if (media.length === 0) {
      throw new ComposeError('Instagram requires at least one media item.');
    }
    rejectDocuments(media, 'Instagram');
    // 2+ items is always a carousel (the API allows it to mix image/gif/video);
    // a lone item is a reel (video) or a single image.
    if (media.length >= 2) return 'carousel';
    return countKinds(media).videos === 1 ? 'reel' : 'single_image';
  },
  buildVariant: ({ settings, postType, connectionId, body, media }) => ({
    platform: 'instagram',
    post_type: postType,
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

/**
 * The handler registry. A `Record<PostPlatform, …>` (no optional keys), so a
 * platform the contract defines without a handler here is a COMPILE ERROR.
 */
const PLATFORM_HANDLERS: { [P in PostPlatform]: PlatformHandler<P> } = {
  x: xHandler,
  linkedin: linkedInHandler,
  facebook_page: facebookHandler,
  instagram: instagramHandler,
};

/** Narrow any platform string to a posting platform. */
export function isPostPlatform(value: string): value is PostPlatform {
  return Object.prototype.hasOwnProperty.call(PLATFORM_HANDLERS, value);
}

/** Posting platforms — the single source, derived from the handler registry
 *  (the `.filter` type-guard narrows `string[]` → `PostPlatform[]`, cast-free). */
export const POST_PLATFORMS: PostPlatform[] =
  Object.keys(PLATFORM_HANDLERS).filter(isPostPlatform);

/* -------------------------------- assembly -------------------------------- */

function resolveConnectionId(
  platform: PostPlatform,
  connectionId: string | undefined,
  connections: readonly ConnectionRef[],
): string {
  if (connectionId) return connectionId;
  const match = connections.find((connection) => connection.platform === platform);
  if (!match) {
    throw new ComposeError(
      `No connection for "${platform}" on this profile. Connect the account or pass connectionId.`,
    );
  }
  return match.id;
}

/** Resolve one channel into its typed variant. Generic over the concrete `P`, so
 *  the handler / config / result stay correlated with no cast. */
function buildChannel<P extends PostPlatform>(
  handler: PlatformHandler<P>,
  platform: P,
  config: ChannelConfig<P>,
  content: PostContent,
  connections: readonly ConnectionRef[],
): VariantFor<P> {
  const media = config.media ?? content.media ?? [];
  return handler.buildVariant({
    settings: config.settings,
    postType: config.postType ?? handler.derivePostType(media),
    connectionId: resolveConnectionId(platform, config.connectionId, connections),
    body: config.body ?? content.body,
    media: media.map((item) => ({ media_id: item.id })),
  });
}

function buildVariants(
  content: PostContent,
  channels: Channels,
  connections: readonly ConnectionRef[],
): PostVariantInput[] {
  const variants: PostVariantInput[] = [];

  if (channels.x) variants.push(buildChannel(xHandler, 'x', channels.x, content, connections));
  if (channels.linkedin)
    variants.push(buildChannel(linkedInHandler, 'linkedin', channels.linkedin, content, connections));
  if (channels.facebook_page)
    variants.push(buildChannel(facebookHandler, 'facebook_page', channels.facebook_page, content, connections));
  if (channels.instagram)
    variants.push(buildChannel(instagramHandler, 'instagram', channels.instagram, content, connections));

  if (variants.length === 0) {
    throw new ComposeError('At least one channel is required.');
  }
  return variants;
}

/**
 * Turn an ergonomic `{ content, channels }` input into the exact
 * `CreatePostInput` the API expects — resolving each channel's connection,
 * attaching the shared/overridden media, and deriving `post_type` from that
 * media. The customer never assembles `variants[]` or sees a `connection_id`,
 * and owns each channel's typed `settings`.
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
    variants: buildVariants(input.content ?? {}, input.channels, connections),
  };
}

/** The envelope fields the API counts as a real edit (`dry_run` deliberately not). */
const MUTABLE_ENVELOPE_KEYS = [
  'publish',
  'scheduleAt',
  'externalId',
  'metadata',
  'tags',
  'notes',
] as const satisfies readonly (keyof ComposeUpdateInput)[];

/**
 * Build an `UpdatePostInput`. With `channels`, the full variant set is rebuilt
 * (the API's PATCH replaces it); without it, only the envelope changes.
 */
export function buildUpdatePost(
  input: ComposeUpdateInput,
  connections: readonly ConnectionRef[] = [],
): UpdatePostInput {
  const changesEnvelope = MUTABLE_ENVELOPE_KEYS.some((key) => input[key] !== undefined);
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

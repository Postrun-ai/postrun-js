import type {
  Connection,
  CreatePostInput,
  MediaResource,
  PostMetadata,
  PostPlatform,
  PostVariantInput,
  PublishMode,
  SettingsFor,
  UpdatePostInput,
} from './resources';

/* --------------------------------- types --------------------------------- */

/**
 * A media attachment — just the uploaded asset's id. The post SHAPE (`post_type`
 * and the LinkedIn `content_kind` / Instagram `media_type`) is DERIVED server-side
 * from the media's byte-detected kind, so the customer never declares a media
 * `kind` here — they attach the asset and we figure out the rest.
 */
export type MediaInput = Pick<MediaResource, 'id'>;

/** Base content, shared across channels unless a channel overrides it. */
export interface PostContent {
  body?: string;
  media?: readonly MediaInput[];
}

/**
 * One channel's config. The SDK owns the plumbing (connection, media, assembly);
 * the CUSTOMER owns `settings` — the platform's native, fully-typed config. An
 * Instagram setting on an X channel is a compile error. The post shape is never
 * specified here — the server derives it from the attached media.
 */
export interface ChannelConfig<P extends PostPlatform> {
  settings: SettingsFor<P>;
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

/**
 * Thrown only for a genuine USAGE error the SDK can't paper over — an
 * unresolvable connection, or a build with zero channels. It is NEVER thrown for
 * a media combination: validity (which media a platform accepts, document
 * support, count limits, …) is the SERVER's job — it derives the post shape from
 * the media and surfaces any problem as a typed `ValidationIssue` from
 * `POST /v1/posts/validate`. So the SDK can always build an in-progress composition.
 */
export class ComposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeError';
  }
}

type VariantFor<P extends PostPlatform> = Extract<PostVariantInput, { platform: P }>;

/* ----------------------------- platform handlers -------------------------- */

/** What a handler receives to assemble one variant. */
interface ResolvedChannel<P extends PostPlatform> {
  settings: SettingsFor<P>;
  connectionId: string;
  body: string | undefined;
  media: readonly { media_id: string }[];
}

/**
 * A per-platform variant builder: assemble the typed variant from a resolved
 * channel, passing `settings` straight through (the customer owns it). Each
 * platform gets its own builder so the literal `platform` discriminant ties the
 * result to the right union member with no cast — and so the registry is
 * exhaustive over `PostPlatform`. The post shape is NOT set here: the server
 * derives it from the media.
 */
interface PlatformHandler<P extends PostPlatform> {
  buildVariant(resolved: ResolvedChannel<P>): VariantFor<P>;
}

const xHandler: PlatformHandler<'x'> = {
  buildVariant: ({ settings, connectionId, body, media }) => ({
    platform: 'x',
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const linkedInHandler: PlatformHandler<'linkedin'> = {
  buildVariant: ({ settings, connectionId, body, media }) => ({
    platform: 'linkedin',
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const facebookHandler: PlatformHandler<'facebook_page'> = {
  buildVariant: ({ settings, connectionId, body, media }) => ({
    platform: 'facebook_page',
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const instagramHandler: PlatformHandler<'instagram'> = {
  buildVariant: ({ settings, connectionId, body, media }) => ({
    platform: 'instagram',
    connection_id: connectionId,
    body,
    media: [...media],
    settings,
  }),
};

const tiktokHandler: PlatformHandler<'tiktok'> = {
  buildVariant: ({ settings, connectionId, body, media }) => ({
    platform: 'tiktok',
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
  tiktok: tiktokHandler,
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
    connectionId: resolveConnectionId(platform, config.connectionId, connections),
    body: config.body ?? content.body,
    media: media.map((item) => ({ media_id: item.id })),
  });
}

/**
 * Resolve ONE platform's channel, or `undefined` when the caller didn't include
 * it. Generic over the concrete `P`, so `channels[platform]` and
 * `PLATFORM_HANDLERS[platform]` stay correlated to the same platform with no cast.
 * Wrapping the registry lookup in this generic is what lets `buildVariants`
 * iterate `POST_PLATFORMS` (a union) without the per-member variance error.
 */
function collectChannel<P extends PostPlatform>(
  platform: P,
  channels: Channels,
  content: PostContent,
  connections: readonly ConnectionRef[],
): VariantFor<P> | undefined {
  const config = channels[platform];
  if (!config) return undefined;
  return buildChannel(
    PLATFORM_HANDLERS[platform],
    platform,
    config,
    content,
    connections,
  );
}

function buildVariants(
  content: PostContent,
  channels: Channels,
  connections: readonly ConnectionRef[],
): PostVariantInput[] {
  // Driven by POST_PLATFORMS (derived from the exhaustive PLATFORM_HANDLERS), so a
  // new platform added to the registry is dispatched here automatically — no
  // hand-maintained per-platform branch to forget (the gap that once dropped TikTok).
  const variants = POST_PLATFORMS.flatMap((platform) => {
    const variant = collectChannel(platform, channels, content, connections);
    return variant ? [variant] : [];
  });

  if (variants.length === 0) {
    // The ONE retained composition-level guard: "you called build with no
    // channels" is a programmer USAGE error, not a per-end-user validity judgment.
    // It is NOT a verdict on whether the media is publishable — that authority
    // (and the post-shape derivation) lives entirely on the server.
    throw new ComposeError('At least one channel is required.');
  }
  return variants;
}

/**
 * Turn an ergonomic `{ content, channels }` input into the exact
 * `CreatePostInput` the API expects — resolving each channel's connection and
 * attaching the shared/overridden media. The server derives the post shape from
 * that media, so the build is TOTAL: it never throws for a media combination and
 * an in-progress post can always be built to validate. The customer never
 * assembles `variants[]` or sees a `connection_id`, and owns each channel's typed
 * `settings`.
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

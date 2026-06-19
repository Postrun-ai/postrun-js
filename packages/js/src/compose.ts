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

/**
 * Thrown only for a genuine USAGE error the SDK can't paper over — an
 * unresolvable connection, or a build with zero channels. It is NEVER thrown for
 * a media/`post_type` combination: validity (which media pair with which
 * post_type, document support, count limits, …) is the SERVER's job, surfaced as
 * typed `ValidationIssue`s by `POST /v1/posts/validate`. `derivePostType` is
 * best-effort SUGAR, so the SDK can always build an in-progress composition.
 */
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
 *  - `derivePostType` — the SUGAR: a BEST-EFFORT default `post_type` guessed from
 *    the media. Pure and TOTAL — it NEVER throws and never decides validity; it
 *    only runs when the caller doesn't pass `postType`. The SERVER
 *    (`POST /v1/posts/validate`) is the sole authority on whether the
 *    composition is publishable, returning typed `ValidationIssue`s.
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

/**
 * X / LinkedIn / Facebook have no mixed-media placement: a post is text, images,
 * OR a single video. This is a BEST-EFFORT guess — it never throws. When a video
 * is present it wins the placement (`video`/`reel`), else 2+ images is
 * `multi_image` and a lone item is `single_image`. The SERVER rules on whether
 * the actual combination (a blend, >1 video, a document) is publishable.
 */
function deriveSinglePlacement<V extends 'video' | 'reel'>(
  media: readonly MediaInput[],
  videoType: V,
): 'single_image' | 'multi_image' | V {
  const { images, videos } = countKinds(media);
  if (videos >= 1) return videoType;
  return images >= 2 ? 'multi_image' : 'single_image';
}

const xHandler: PlatformHandler<'x'> = {
  derivePostType: (media) => {
    if (media.length === 0) return 'text';
    return deriveSinglePlacement(media, 'video');
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
      // `content_kind: 'document'` in settings — we don't infer it. Best-effort:
      // multi-document is a server concern, not a local throw.
      return 'single_image';
    }
    return deriveSinglePlacement(media, 'video');
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
    return deriveSinglePlacement(media, 'reel');
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
    // Best-effort: empty media falls back to `single_image` (the server rules on
    // whether Instagram needs media). 2+ items is a carousel (the API allows it
    // to mix image/gif/video); a lone video is a reel, else a single image.
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

const tiktokHandler: PlatformHandler<'tiktok'> = {
  derivePostType: (media) => {
    // Best-effort: TikTok keeps video and photo posts separate (a video post is
    // one standalone video; photos form a single image or a multi-photo
    // carousel). A video present wins `video`; else 2+ images is a carousel and a
    // lone item is `single_image`. The SERVER rules on a blend / >1 video / docs /
    // empty media.
    const { images, videos } = countKinds(media);
    if (videos >= 1) return 'video';
    return images >= 2 ? 'carousel' : 'single_image';
  },
  buildVariant: ({ settings, postType, connectionId, body, media }) => ({
    platform: 'tiktok',
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
    postType: config.postType ?? handler.derivePostType(media),
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
    // It is NOT a verdict on whether any media/post_type combination is
    // publishable — that authority lives entirely on the server.
    throw new ComposeError('At least one channel is required.');
  }
  return variants;
}

/**
 * Turn an ergonomic `{ content, channels }` input into the exact
 * `CreatePostInput` the API expects — resolving each channel's connection,
 * attaching the shared/overridden media, and deriving a best-effort `post_type`
 * from that media (sugar — the server validates the real composition). The build
 * is TOTAL: it never throws for a media/post_type combination, so an in-progress
 * post can always be built to validate. The customer never assembles `variants[]`
 * or sees a `connection_id`, and owns each channel's typed `settings`.
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

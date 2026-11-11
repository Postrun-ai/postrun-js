import type {
  Connection,
  MediaKind,
  PostPlatform,
  PostVariant,
  SettingsFor,
} from '@postrun/js';

import type { VariantMediaRef } from './media-resolver';

/**
 * A platform's FETCHED (read) variant — one member of a stored `Post`'s
 * `variants`, as returned by `usePost`/`usePosts`/the calendar. A typed
 * discriminated union carrying the typed `settings`/`body`, the read-only
 * `id`/`status`/`result`/`error`, the server-DERIVED post shape (`post_type`, and
 * the LinkedIn `content_kind` / Instagram `media_type`), AND the enriched
 * `media[].media` (the full `MediaResource` inline) — so a fetched post previews
 * with no extra fetch.
 */
export type ReadPostVariant<P extends PostVariant['platform']> = Extract<
  PostVariant,
  { platform: P }
>;

/**
 * What a preview's `variant` prop accepts: only what the cards read. A draft
 * (`XPostVariant`, …), a fetched variant, a half-built draft, or a fetched
 * variant with new draft media all fit. Publish-only fields such as
 * `connection_id` and LinkedIn's `visibility` (the card defaults it to `PUBLIC`)
 * are not required. `platform` stays so one network's variant can't be handed to
 * another network's preview. Fetched media carries its asset inline; draft media
 * is resolved by id against the `media` prop.
 */
type PreviewVariant<P extends PostPlatform> = {
  platform: P;
  body?: PostVariant['body'];
  media?: readonly VariantMediaRef[];
  settings?: Partial<NonNullable<SettingsFor<P>>>;
};

export type XPreviewVariant = PreviewVariant<'x'>;
export type LinkedInPreviewVariant = PreviewVariant<'linkedin'>;
export type TikTokPreviewVariant = PreviewVariant<'tiktok'>;
export type InstagramPreviewVariant = PreviewVariant<'instagram'>;

/**
 * The author a preview header renders. It is DERIVED from the SDK `Connection`
 * (the system of record for who's posting) — the card reads `avatar_url`,
 * `username`, and `external_account_name` straight off it, so the header can't
 * drift from the connection. Pass the whole connection; the card picks what it
 * needs.
 *
 * The two things our API does NOT store on a connection are presentation extras
 * a customer may supply via the preview's own props: a `verified` badge and a
 * LinkedIn `headline`. Everything else comes from the connection.
 */
export type PreviewConnection = Pick<
  Connection,
  'platform' | 'username' | 'avatar_url' | 'external_account_name'
>;

/** The media kinds a social preview can render (documents are not previewable
 * here) — derived from the SDK's `MediaKind`, never re-listed. */
export type PreviewMediaKind = Extract<MediaKind, 'image' | 'video' | 'gif'>;

/**
 * One media item resolved for rendering — the shared shape every platform card's
 * renderer consumes. Produced by `resolveVariantMedia` straight from the SDK
 * `MediaResource`; pixels come from the per-platform rendition `url`, never a
 * local `File`.
 *
 * `state` is honest: a `ready` item has its `src` (the rendition URL); a
 * `processing` item has NO `src` (the asset or its rendition isn't ready) and the
 * card shows the shared "Processing media…" placeholder in its place.
 */
export type ResolvedMedia =
  | {
      kind: PreviewMediaKind;
      state: 'ready';
      src: string;
      width?: number;
      height?: number;
      alt?: string;
    }
  | {
      kind: PreviewMediaKind;
      state: 'processing';
      src?: undefined;
      width?: number;
      height?: number;
      alt?: string;
    };

/** A resolved item that has pixels — the `ready` member of {@link ResolvedMedia}
 * (so `src` is guaranteed). Renderers that draw actual media take this; the
 * card decides up front whether to render pixels or the processing placeholder. */
export type ReadyMedia = Extract<ResolvedMedia, { state: 'ready' }>;

/** Narrow a resolved item to its ready (has-pixels) form. */
export function isReadyMedia(item: ResolvedMedia): item is ReadyMedia {
  return item.state === 'ready';
}

/**
 * Content for the nested quoted card. Supplied separately because our schema
 * carries only an opaque `quote_tweet_id` (no quoted text/author/media).
 */
export interface XPreviewQuotedTweet {
  /** The quoted account's display name. */
  name: string;
  /** The quoted account's @handle. */
  username?: string | null;
  /** The quoted account's avatar URL. */
  avatar_url?: string | null;
  body?: string;
  media?: ResolvedMedia[];
}

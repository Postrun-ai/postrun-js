import type { MediaKind } from '@postrun/js';

/**
 * Public input types for the post-preview components. These describe data the
 * CUSTOMER supplies for presentation — NOT shapes from our OpenAPI contract — so
 * they are authored here rather than derived. The one value with a contract
 * counterpart, a media asset's `kind`, IS derived from the SDK's `MediaKind`.
 *
 * Why author/media live outside the post schema: a connection stores only a
 * cached account name (no avatar, no `@handle`, no verified flag), and a variant
 * references media by id, not by pixels — at compose time the only pixels that
 * exist are a local `File`.
 */

/** The author identity rendered in the preview header. */
export interface XPreviewAuthor {
  /** Display name, e.g. "Acme Studio". */
  name: string;
  /** Handle WITHOUT the leading `@`, e.g. "acmestudio". */
  handle: string;
  /** Avatar image URL. Omit for a neutral placeholder. */
  avatarUrl?: string;
  /** Show the verified badge. Default false. */
  verified?: boolean;
}

/** The media kinds a social preview can render (documents are not previewable
 * here) — derived from the SDK's `MediaKind`, never re-listed. */
export type PreviewMediaKind = Extract<MediaKind, 'image' | 'video' | 'gif'>;

/**
 * One resolved media item for the preview. Provide a `url` (e.g. the processed
 * `MediaResource.per_platform.x.url`) OR a `file` (a compose-time blob, before
 * upload) — the component turns a `file` into an object URL and revokes it on
 * unmount. An item with neither is skipped.
 */
export interface XPreviewMedia {
  kind: PreviewMediaKind;
  url?: string;
  file?: File;
  /** Natural pixel width — improves layout fidelity when known. */
  width?: number;
  /** Natural pixel height — improves layout fidelity when known. */
  height?: number;
  /** Alt text; falls back to the variant media's `alt_text_override`. */
  alt?: string;
  /** Poster frame for a video; falls back to `url`/`file`. */
  posterUrl?: string;
}

/**
 * Content for the nested quoted card. Supplied separately because our schema
 * carries only an opaque `quote_tweet_id` (no quoted text/author).
 */
export interface XPreviewQuotedTweet {
  author: XPreviewAuthor;
  body?: string;
  media?: XPreviewMedia[];
}

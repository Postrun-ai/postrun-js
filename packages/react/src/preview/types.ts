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

/** The author identity rendered in an X preview header. */
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

/** The author identity rendered in a LinkedIn preview header. LinkedIn shows a
 * name + a one-line headline (role/tagline), not an `@handle`. */
export interface LinkedInPreviewAuthor {
  /** Display name, e.g. "Acme Studio". */
  name: string;
  /** One-line headline under the name, e.g. "Founder & CEO at Acme". */
  headline?: string;
  /** Avatar image URL. Omit for a neutral placeholder. */
  avatarUrl?: string;
  /** Show the verified badge. Default false. */
  verified?: boolean;
}

/** The media kinds a social preview can render (documents are not previewable
 * here) — derived from the SDK's `MediaKind`, never re-listed. */
export type PreviewMediaKind = Extract<MediaKind, 'image' | 'video' | 'gif'>;

/**
 * One media item to preview. Provide a `url` (e.g. the processed
 * `MediaResource.per_platform.<platform>.url`) OR a `file` (a compose-time blob,
 * before upload) — the component turns a `file` into an object URL and revokes it
 * on unmount. An item with neither is skipped.
 */
export interface PreviewMedia {
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

/** @deprecated Use {@link PreviewMedia}. Kept as an alias for back-compat. */
export type XPreviewMedia = PreviewMedia;

/** A media item with its pixels already resolved to a single URL by the
 * component (shared by every platform preview's renderer). */
export interface ResolvedMedia {
  kind: PreviewMediaKind;
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  posterSrc?: string;
}

/**
 * Content for the nested quoted card. Supplied separately because our schema
 * carries only an opaque `quote_tweet_id` (no quoted text/author).
 */
export interface XPreviewQuotedTweet {
  author: XPreviewAuthor;
  body?: string;
  media?: PreviewMedia[];
}

import type { Connection, MediaKind } from '@postrun/js';

/**
 * Public input types for the post-preview components.
 *
 * Identity that our API DOES store on a `Connection` (`username`, `avatar_url`,
 * `profile_url`) is DERIVED from the SDK `Connection` type — never re-declared —
 * so a preview author can be built straight from a connection and can't drift.
 * Fields the API does NOT store (a verified badge, a display name distinct from
 * the handle, a LinkedIn headline) are presentation extras the customer supplies;
 * those are the documented backend gaps. Media `kind` derives from `MediaKind`;
 * pixels are still a `url`/`File` because a variant references media by id.
 */

/** The identity fields our `Connection` stores — the SDK-driven base every
 * preview author derives from (so the field names + nullability match the API). */
export type ConnectionIdentity = Pick<Connection, 'username' | 'avatar_url'>;

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

/**
 * The author identity rendered in an Instagram preview header. Instagram shows
 * the `username` (no separate display name) + an optional verified badge.
 *
 * `username` / `avatar_url` are DERIVED from the SDK `Connection` (`string | null`,
 * so build it straight from `useConnections()`). `verified` is a presentation
 * extra — our API does NOT store verified status on a connection (a backend gap),
 * so the customer supplies it (or omit it).
 */
export type InstagramPreviewAuthor = ConnectionIdentity & {
  /** Verified badge. NOT sourced from our Connection — presentation-only. */
  verified?: boolean;
};

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

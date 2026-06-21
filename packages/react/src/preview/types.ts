import type {
  Connection,
  InstagramPostVariant,
  LinkedInPostVariant,
  MediaKind,
  PostVariant,
  TikTokPostVariant,
  XPostVariant,
} from '@postrun/js';

/**
 * A platform's FETCHED (read) variant — one member of a stored `Post`'s
 * `variants`, as returned by `usePost`/`usePosts`/the calendar. Since the API's
 * read variant is now a typed discriminated union, it carries the SAME typed
 * `settings`/`body`/`post_type`/`media` the write variant does, plus the
 * read-only `id`/`status`/`result`/`error`.
 */
export type ReadPostVariant<P extends PostVariant['platform']> = Extract<
  PostVariant,
  { platform: P }
>;

/**
 * What a preview's `variant` prop accepts: EITHER the compose-time **write**
 * variant (`XPostVariant`, …) OR the fetched **read** variant. Both expose the
 * typed `settings`, `body`, `post_type`, and `media[].alt_text_override` the cards
 * read — so you can hand a preview a post you just built OR one you fetched from
 * the API, with no transform.
 */
export type XPreviewVariant = XPostVariant | ReadPostVariant<'x'>;
export type LinkedInPreviewVariant =
  | LinkedInPostVariant
  | ReadPostVariant<'linkedin'>;
export type TikTokPreviewVariant = TikTokPostVariant | ReadPostVariant<'tiktok'>;
export type InstagramPreviewVariant =
  | InstagramPostVariant
  | ReadPostVariant<'instagram'>;

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

/**
 * The author identity rendered in an X preview header. `username` (the `@handle`)
 * and `avatar_url` are DERIVED from the SDK `Connection`; `name` (the display
 * name) and `verified` are presentation extras our API doesn't store.
 */
export type XPreviewAuthor = ConnectionIdentity & {
  /** Display name, e.g. "Acme Studio". NOT on Connection — caller-supplied. */
  name: string;
  /** Show the verified badge. NOT on Connection — caller-supplied. */
  verified?: boolean;
};

/**
 * The author identity rendered in a LinkedIn preview header. LinkedIn shows a
 * display `name` + a one-line `headline`. `username`/`avatar_url` are DERIVED
 * from the SDK `Connection`; `name`/`headline`/`verified` are presentation extras
 * our API doesn't store (LinkedIn's `username` is also documented as NULL today).
 */
export type LinkedInPreviewAuthor = ConnectionIdentity & {
  /** Display name, e.g. "Acme Studio". NOT on Connection — caller-supplied. */
  name: string;
  /** One-line headline under the name. NOT on Connection — caller-supplied. */
  headline?: string;
  /** Show the verified badge. NOT on Connection — caller-supplied. */
  verified?: boolean;
};

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

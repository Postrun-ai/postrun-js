import type {
  MediaResource,
  MediaTarget,
  PostVariant,
  PostVariantInput,
} from '@postrun/js';

import type { PreviewMediaKind, ResolvedMedia } from './types';

/**
 * The single media resolver every platform preview shares. It turns a variant's
 * ordered media references into the `ResolvedMedia[]` a card renders — pulling
 * pixels from the SDK `MediaResource` ONLY (the per-platform rendition `url`),
 * never a local `File`/object URL.
 *
 * A variant references media by id (`media[].media_id`). Two ways the full asset
 * arrives, and we read whichever is present:
 *  - **Read / enriched variant:** `media[].media` carries the full `MediaResource`
 *    inline (the GET /v1/posts shape) — used directly.
 *  - **Compose / draft variant:** the write variant has only ids, so the host
 *    passes the uploaded assets as `fallback` (e.g. `useMediaUpload().ready`),
 *    matched by `media_id`.
 *
 * Media STATE is honest, straight off the resource: an asset still uploading /
 * processing (or whose this-platform rendition isn't ready) resolves with
 * `state: 'processing'` and no `src` — the card shows the shared "Processing
 * media…" placeholder; a ready rendition resolves with `state: 'ready'` + its
 * pixel URL. Documents aren't previewable and are dropped.
 */

/** One variant's media reference — the WRITE (compose, id-only) OR the READ
 * (enriched, carries the full `MediaResource` inline) shape. Both are derived
 * from the SDK variant unions, never re-declared. The read member's inline asset
 * IS the shared `Media` component (same type as `MediaResource`), so no bridge. */
type VariantMediaRef =
  | NonNullable<PostVariantInput['media']>[number]
  | NonNullable<PostVariant['media']>[number];

/** The media kinds a social card can render — documents are dropped. */
function previewKind(kind: MediaResource['kind']): PreviewMediaKind | null {
  return kind === 'image' || kind === 'video' || kind === 'gif' ? kind : null;
}

/** The full asset behind a reference: the enriched read payload if present, else
 * the matching uploaded asset the host supplied for a compose-time draft. */
function resourceFor(
  ref: VariantMediaRef,
  fallback: readonly MediaResource[] | undefined,
): MediaResource | undefined {
  if ('media' in ref && ref.media) {
    return ref.media;
  }
  return fallback?.find((asset) => asset.id === ref.media_id);
}

/**
 * Resolve a variant's media to renderable items for ONE platform target.
 *
 * @param refs     the variant's `media` array (write or read shape)
 * @param target   the media render target for this platform (`x`, `linkedin`,
 *                 `instagram`, `tiktok`, `facebook_page`)
 * @param fallback uploaded assets to resolve compose-time ids against (the read
 *                 variant carries its own enriched assets, so this is optional)
 */
export function resolveVariantMedia(
  refs: readonly VariantMediaRef[] | undefined,
  target: MediaTarget,
  fallback?: readonly MediaResource[],
): ResolvedMedia[] {
  return (refs ?? []).flatMap((ref): ResolvedMedia[] => {
    const asset = resourceFor(ref, fallback);
    if (!asset) {
      return [];
    }
    const kind = previewKind(asset.kind);
    if (!kind) {
      return [];
    }

    const alt = ref.alt_text_override ?? asset.alt_text ?? undefined;
    const width = asset.source?.width ?? undefined;
    const height = asset.source?.height ?? undefined;
    const rendition = asset.per_platform[target];

    // Ready ONLY when this platform's rendition has produced a URL. Anything
    // else — asset still uploading/processing/failed, or the rendition not yet
    // ready — is an honest "processing" tile (no pixels), never a fake src.
    if (
      asset.status === 'ready' &&
      rendition?.status === 'ready' &&
      rendition.url
    ) {
      return [
        {
          kind,
          state: 'ready',
          src: rendition.url,
          width: rendition.width ?? width,
          height: rendition.height ?? height,
          alt,
        },
      ];
    }

    return [{ kind, state: 'processing', width, height, alt }];
  });
}

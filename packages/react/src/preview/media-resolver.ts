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
 * (enriched, carries the full asset inline) shape. Both are derived from the SDK
 * variant unions, never re-declared. The write member is `media_id`-only; the
 * read member adds `media`/`position`. */
type VariantMediaRef =
  | NonNullable<PostVariantInput['media']>[number]
  | NonNullable<PostVariant['media']>[number];

/** The enriched asset the READ variant carries inline. It's the same shape as
 * `MediaResource` ("same shape as GET /v1/media") but a distinct generated type
 * (its `per_platform` warnings/errors are typed loosely inline) — so we derive
 * the resolver's asset shape from it and accept the GET `MediaResource` too, by
 * reading only the fields BOTH provide. Never re-declared. */
type InlineAsset = NonNullable<
  Extract<NonNullable<PostVariant['media']>[number], { media: unknown }>['media']
>;

/** The minimal asset shape the resolver reads — the fields `MediaResource` and
 * the read variant's inline asset agree on (kind, status, source dims, alt, and
 * the per-target rendition's status/url/dims). Both SDK types satisfy it, so we
 * never cast between the two unrelated-but-identical generated shapes. */
type PreviewAsset = Pick<
  InlineAsset,
  'id' | 'kind' | 'status' | 'source' | 'alt_text'
> & {
  per_platform: Record<
    string,
    Pick<
      InlineAsset['per_platform'][string],
      'status' | 'url' | 'width' | 'height'
    >
  >;
};

/** The media kinds a social card can render — documents are dropped. */
function previewKind(kind: PreviewAsset['kind']): PreviewMediaKind | null {
  return kind === 'image' || kind === 'video' || kind === 'gif' ? kind : null;
}

/** The full asset behind a reference: the enriched read payload if present, else
 * the matching uploaded asset the host supplied for a compose-time draft. */
function resourceFor(
  ref: VariantMediaRef,
  fallback: readonly PreviewAsset[] | undefined,
): PreviewAsset | undefined {
  if ('media' in ref && ref.media) {
    return ref.media;
  }
  return fallback?.find((asset) => asset.id === ref.media_id);
}

/** This platform's rendition entry on an asset (`per_platform[target]`), or
 * undefined if it hasn't been targeted/produced yet. */
function renditionFor(asset: PreviewAsset, target: MediaTarget) {
  return asset.per_platform[target];
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
    const rendition = renditionFor(asset, target);

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

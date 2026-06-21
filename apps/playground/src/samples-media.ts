import type { MediaResource, MediaTarget } from '@postrun/js';
import type { PreviewConnection } from '@preview/types';

/**
 * Shared playground media fixtures — real SDK `MediaResource` shapes, so the
 * playground exercises the actual `resolveVariantMedia` path (no hand-rolled
 * preview media). Includes ready + processing assets for the honest-media journey.
 */

const PHOTO = (id: string, w = 1080, h = 1080) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop`;
const VIDEO =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/** A `PreviewConnection` (the slice cards read off a `Connection`). */
export function conn(over: Partial<PreviewConnection> = {}): PreviewConnection {
  return {
    platform: 'x',
    username: 'acmestudio',
    avatar_url: PHOTO('photo-1535713875002-d1d0cf377fde', 200, 200),
    external_account_name: 'Acme Studio',
    ...over,
  };
}

/** Base ready asset, with one rendition per requested target pointing at `url`. */
function ready(
  id: string,
  url: string,
  targets: readonly MediaTarget[],
  over: Partial<MediaResource> = {},
): MediaResource {
  return {
    id,
    object: 'media',
    profile_id: 'prof_demo',
    kind: 'image',
    content_type: 'image/jpeg',
    status: 'ready',
    progress: { stage: 'done', percent: 100 },
    raw: false,
    error: null,
    source: {
      format: 'image/jpeg',
      bytes: 1,
      width: 1080,
      height: 1080,
      duration_ms: null,
    },
    alt_text: null,
    per_platform: Object.fromEntries(
      targets.map((t) => [
        t,
        {
          status: 'ready' as const,
          url,
          width: 1080,
          height: 1080,
          bytes: 1,
          warnings: [],
          errors: [],
        },
      ]),
    ),
    external_id: null,
    metadata: {},
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z',
    ...over,
  };
}

/** A ready IMAGE asset rendered for every social target. */
export function readyImage(
  id: string,
  photoId: string,
  alt?: string,
): MediaResource {
  return ready(id, PHOTO(photoId), ALL_TARGETS, { alt_text: alt ?? null });
}

/** A ready VIDEO asset rendered for every social target. */
export function readyVideoAsset(id: string): MediaResource {
  return ready(id, VIDEO, ALL_TARGETS, {
    kind: 'video',
    content_type: 'video/mp4',
    source: {
      format: 'video/mp4',
      bytes: 1,
      width: 1080,
      height: 1920,
      duration_ms: 6000,
    },
  });
}

/** A still-PROCESSING asset (mid-transcode) — no rendition url yet. */
export function processingAsset(id: string): MediaResource {
  return ready(id, '', [], {
    status: 'processing',
    progress: { stage: 'transcoding', percent: 45 },
    per_platform: {},
  });
}

const ALL_TARGETS: readonly MediaTarget[] = [
  'x',
  'linkedin',
  'instagram',
  'tiktok',
  'facebook_page',
];

import type { MediaResource, MediaTarget } from '@postrun/js';

import type { PreviewConnection } from './types';

/**
 * Shared preview-test fixtures. Builds real SDK shapes (`MediaResource`,
 * `PreviewConnection`) so the component tests exercise the actual resolver path
 * — never hand-rolled preview media.
 */

/** A `PreviewConnection` (the slice the cards read off a `Connection`). */
export function connection(
  over: Partial<PreviewConnection> = {},
): PreviewConnection {
  return {
    platform: 'x',
    username: 'acmestudio',
    avatar_url: 'https://cdn.test/a.png',
    external_account_name: 'Acme Studio',
    ...over,
  };
}

/** A ready image asset with a rendition produced for `target` (default `x`). */
export function readyMedia(
  id: string,
  target: MediaTarget = 'x',
  over: Partial<MediaResource> = {},
): MediaResource {
  return mediaAsset(id, {
    per_platform: {
      [target]: {
        status: 'ready',
        url: `https://cdn.test/${id}.jpg`,
        width: 1080,
        height: 1080,
        bytes: 1,
        warnings: [],
        errors: [],
      },
    },
    ...over,
  });
}

/** A ready VIDEO asset with a rendition for `target`. */
export function readyVideo(
  id: string,
  target: MediaTarget = 'x',
): MediaResource {
  return mediaAsset(id, {
    kind: 'video',
    content_type: 'video/mp4',
    source: {
      format: 'video/mp4',
      bytes: 1,
      width: 1080,
      height: 1920,
      duration_ms: 5000,
    },
    per_platform: {
      [target]: {
        status: 'ready',
        url: `https://cdn.test/${id}.mp4`,
        width: 1080,
        height: 1920,
        bytes: 1,
        warnings: [],
        errors: [],
      },
    },
  });
}

/** A still-processing asset (no rendition url yet). */
export function processingMedia(id: string): MediaResource {
  return mediaAsset(id, {
    status: 'processing',
    progress: { stage: 'transcoding', percent: 40 },
    per_platform: {},
  });
}

/** The base asset shell (all required `MediaResource` fields). */
export function mediaAsset(
  id: string,
  over: Partial<MediaResource> = {},
): MediaResource {
  return {
    id,
    object: 'media',
    profile_id: 'prof_1',
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
    per_platform: {},
    external_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

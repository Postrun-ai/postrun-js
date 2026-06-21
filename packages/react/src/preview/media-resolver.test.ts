import type { MediaResource } from '@postrun/js';
import { describe, expect, it } from 'vitest';

import { resolveVariantMedia } from './media-resolver';

/** A ready image asset whose `x` rendition is produced. */
function asset(over: Partial<MediaResource> = {}): MediaResource {
  return {
    id: 'med_1',
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
      width: 1200,
      height: 800,
      duration_ms: null,
    },
    alt_text: null,
    per_platform: {
      x: {
        status: 'ready',
        url: 'https://cdn/x.jpg',
        width: 1200,
        height: 800,
        bytes: 1,
        warnings: [],
        errors: [],
      },
    },
    external_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('resolveVariantMedia', () => {
  it('resolves a ready asset to its per-platform rendition url', () => {
    const out = resolveVariantMedia([{ media_id: 'med_1' }], 'x', [asset()]);
    expect(out).toEqual([
      {
        kind: 'image',
        state: 'ready',
        src: 'https://cdn/x.jpg',
        width: 1200,
        height: 800,
        alt: undefined,
      },
    ]);
  });

  it('reads the enriched read-variant asset inline (no fallback needed)', () => {
    const out = resolveVariantMedia(
      [{ media_id: 'med_1', media: asset() }],
      'x',
    );
    expect(out[0]).toMatchObject({ state: 'ready', src: 'https://cdn/x.jpg' });
  });

  it('prefers the enriched inline asset over the fallback', () => {
    const inline = asset({
      per_platform: {
        x: { status: 'ready', url: 'https://cdn/inline.jpg', width: null, height: null, bytes: null, warnings: [], errors: [] },
      },
    });
    const out = resolveVariantMedia(
      [{ media_id: 'med_1', media: inline }],
      'x',
      [asset()],
    );
    expect(out[0]?.src).toBe('https://cdn/inline.jpg');
  });

  it('is processing while the asset itself is still processing', () => {
    const out = resolveVariantMedia([{ media_id: 'med_1' }], 'x', [
      asset({ status: 'processing', progress: { stage: 'transcoding', percent: 50 } }),
    ]);
    expect(out).toEqual([
      { kind: 'image', state: 'processing', src: undefined, width: 1200, height: 800, alt: undefined },
    ]);
  });

  it('is processing when this platform rendition is not ready yet', () => {
    const out = resolveVariantMedia([{ media_id: 'med_1' }], 'x', [
      asset({
        per_platform: {
          x: { status: 'processing', url: null, width: null, height: null, bytes: null, warnings: [], errors: [] },
        },
      }),
    ]);
    expect(out[0]?.state).toBe('processing');
    expect(out[0]?.src).toBeUndefined();
  });

  it('is processing when the platform was never targeted (no rendition entry)', () => {
    const out = resolveVariantMedia([{ media_id: 'med_1' }], 'linkedin', [asset()]);
    expect(out[0]).toMatchObject({ state: 'processing' });
  });

  it('drops a reference with no resolvable asset', () => {
    expect(resolveVariantMedia([{ media_id: 'missing' }], 'x', [asset()])).toEqual([]);
    expect(resolveVariantMedia([{ media_id: 'med_1' }], 'x', [])).toEqual([]);
  });

  it('drops documents (not previewable)', () => {
    const out = resolveVariantMedia([{ media_id: 'med_1' }], 'x', [
      asset({ kind: 'document', content_type: 'application/pdf' }),
    ]);
    expect(out).toEqual([]);
  });

  it('prefers alt_text_override, then the asset alt_text', () => {
    expect(
      resolveVariantMedia([{ media_id: 'med_1', alt_text_override: 'override' }], 'x', [
        asset({ alt_text: 'asset alt' }),
      ])[0]?.alt,
    ).toBe('override');
    expect(
      resolveVariantMedia([{ media_id: 'med_1' }], 'x', [asset({ alt_text: 'asset alt' })])[0]?.alt,
    ).toBe('asset alt');
  });

  it('preserves order and filters dropped refs', () => {
    const img = asset({ id: 'a' });
    const doc = asset({ id: 'b', kind: 'document' });
    const vid = asset({
      id: 'c',
      kind: 'video',
      per_platform: {
        x: { status: 'ready', url: 'https://cdn/v.mp4', width: null, height: null, bytes: null, warnings: [], errors: [] },
      },
    });
    const out = resolveVariantMedia(
      [{ media_id: 'a' }, { media_id: 'b' }, { media_id: 'c' }],
      'x',
      [img, doc, vid],
    );
    expect(out.map((m) => m.kind)).toEqual(['image', 'video']);
  });

  it('returns [] for empty/undefined refs', () => {
    expect(resolveVariantMedia(undefined, 'x', [asset()])).toEqual([]);
    expect(resolveVariantMedia([], 'x', [asset()])).toEqual([]);
  });
});

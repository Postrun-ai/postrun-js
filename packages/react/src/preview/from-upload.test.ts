import type { MediaResource } from '@postrun/js';
import { describe, expect, it } from 'vitest';

import type { MediaUploadItem } from '../media';
import { toPreviewMedia } from './from-upload';

function media(over: Partial<MediaResource> = {}): MediaResource {
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
    source: { format: 'image/jpeg', bytes: 1, width: 800, height: 600, duration_ms: null },
    alt_text: null,
    per_platform: {},
    external_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function item(over: Partial<MediaUploadItem> = {}): MediaUploadItem {
  return {
    id: 'u1',
    file: new File([], 'f', { type: '' }),
    status: 'ready',
    progress: 1,
    media: null,
    error: undefined,
    ...over,
  };
}

describe('toPreviewMedia', () => {
  it('maps a detected image to a preview item carrying the File', () => {
    const f = new File([], 'a.jpg', { type: 'image/jpeg' });
    const out = toPreviewMedia([item({ file: f, media: media({ kind: 'image' }) })]);
    expect(out).toEqual([
      { kind: 'image', file: f, width: 800, height: 600, alt: undefined },
    ]);
  });

  it('drops documents (not previewable)', () => {
    expect(toPreviewMedia([item({ media: media({ kind: 'document' }) })])).toEqual([]);
  });

  it('derives kind from the file MIME before detection settles', () => {
    expect(
      toPreviewMedia([item({ file: new File([], 'v.mp4', { type: 'video/mp4' }) })]),
    ).toEqual([{ kind: 'video', file: expect.any(File), width: undefined, height: undefined, alt: undefined }]);
    expect(
      toPreviewMedia([item({ file: new File([], 'g.gif', { type: 'image/gif' }) })])[0]?.kind,
    ).toBe('gif');
  });

  it('drops an unidentifiable / non-previewable file', () => {
    expect(
      toPreviewMedia([item({ file: new File([], 'd.pdf', { type: 'application/pdf' }) })]),
    ).toEqual([]);
  });

  it('passes through alt text from the settled asset', () => {
    const out = toPreviewMedia([item({ media: media({ kind: 'image', alt_text: 'a cat' }) })]);
    expect(out[0]?.alt).toBe('a cat');
  });

  it('preserves order and filters dropped items', () => {
    const out = toPreviewMedia([
      item({ id: 'a', media: media({ kind: 'image' }) }),
      item({ id: 'b', media: media({ kind: 'document' }) }),
      item({ id: 'c', file: new File([], 'v.mp4', { type: 'video/mp4' }) }),
    ]);
    expect(out.map((m) => m.kind)).toEqual(['image', 'video']);
  });
});

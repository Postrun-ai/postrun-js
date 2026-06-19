import { expect, test } from 'vitest';

import { buildCreatePost, buildUpdatePost } from './compose';
import type { MediaKind } from './resources';

const conns = [
  { id: 'conn_x', platform: 'x' },
  { id: 'conn_li', platform: 'linkedin' },
  { id: 'conn_ig', platform: 'instagram' },
  { id: 'conn_fb', platform: 'facebook_page' },
  { id: 'conn_tt', platform: 'tiktok' },
] as const;

const media = (id: string, kind: MediaKind) => ({ id, kind });
const img = (id: string) => media(id, 'image');
const vid = (id: string) => media(id, 'video');
const doc = (id: string) => media(id, 'document');

/* ------------------------------- the cut --------------------------------- */

test('derives post_type from media and passes settings through verbatim (no auto-fill)', () => {
  const post = buildCreatePost(
    {
      profileId: 'prof_1',
      content: { body: 'Launch!', media: [img('m1')] },
      channels: {
        x: { settings: { reply_settings: 'following' } },
        linkedin: { settings: { visibility: 'PUBLIC', content_kind: 'single_image' } },
        instagram: { settings: {} },
      },
    },
    conns,
  );

  const x = post.variants.find((v) => v.platform === 'x')!;
  expect(x.post_type).toBe('single_image'); // derived from the image
  expect(x.connection_id).toBe('conn_x');
  expect(x.body).toBe('Launch!');
  expect(x.settings).toEqual({ reply_settings: 'following' }); // passthrough — NOT auto-filled

  const li = post.variants.find((v) => v.platform === 'linkedin')!;
  // exactly what the customer passed — no derived content_kind, no PUBLIC default added by us
  expect(li.settings).toEqual({ visibility: 'PUBLIC', content_kind: 'single_image' });

  // No auto-fill: we do NOT inject media_type for the customer (they own settings).
  const ig = post.variants.find((v) => v.platform === 'instagram')!;
  expect(ig.settings).toEqual({});
});

/* --------------------------- post_type derivation ------------------------- */

test('derives post_type per platform from media count + kind', () => {
  const single = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [img('m1')] },
      channels: { x: { settings: {} }, instagram: { settings: { media_type: 'IMAGE' } } },
    },
    conns,
  );
  expect(single.variants.find((v) => v.platform === 'x')!.post_type).toBe('single_image');
  expect(single.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('single_image');

  const multi = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [img('m1'), img('m2')] },
      channels: { x: { settings: {} }, instagram: { settings: { media_type: 'CAROUSEL' } } },
    },
    conns,
  );
  expect(multi.variants.find((v) => v.platform === 'x')!.post_type).toBe('multi_image');
  expect(multi.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('carousel');

  const video = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [vid('m1')] },
      channels: { x: { settings: {} }, instagram: { settings: { media_type: 'REELS' } } },
    },
    conns,
  );
  expect(video.variants.find((v) => v.platform === 'x')!.post_type).toBe('video');
  expect(video.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('reel');
});

test('TikTok derives video / single_image / carousel and resolves its connection', () => {
  const build = (items: ReturnType<typeof media>[]) =>
    buildCreatePost(
      { profileId: 'p', content: { media: items }, channels: { tiktok: { settings: {} } } },
      conns,
    ).variants.find((v) => v.platform === 'tiktok')!;

  expect(build([vid('m1')]).post_type).toBe('video');
  expect(build([img('m1')]).post_type).toBe('single_image');
  expect(build([img('m1'), img('m2')]).post_type).toBe('carousel');
  expect(build([vid('m1')]).connection_id).toBe('conn_tt');
});

test('TikTok rejects empty media, mixed media, multiple videos, and documents', () => {
  const build = (items: ReturnType<typeof media>[]) =>
    buildCreatePost(
      { profileId: 'p', content: { media: items }, channels: { tiktok: { settings: {} } } },
      conns,
    );

  expect(() => build([])).toThrow(/tiktok requires at least one media/i);
  expect(() => build([img('m1'), vid('m2')])).toThrow(/can't combine images and video/i);
  expect(() => build([vid('m1'), vid('m2')])).toThrow(/at most one video/i);
  expect(() => build([doc('m1')])).toThrow(/document/i);
});

test('Instagram derives carousel for any 2+ item set (mixed image+video allowed)', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [img('m1'), vid('m2')] },
      channels: { instagram: { settings: { media_type: 'CAROUSEL' } } },
    },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('carousel');
});

test('throws on image+video mix on a single-placement platform (X)', () => {
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [img('m1'), vid('m2')] }, channels: { x: { settings: {} } } },
      conns,
    ),
  ).toThrow(/images and video/i);
});

test('throws on multiple videos for a single-video platform (X)', () => {
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [vid('v1'), vid('v2')] }, channels: { x: { settings: {} } } },
      conns,
    ),
  ).toThrow(/at most one video/i);
});

test('Instagram requires media', () => {
  expect(() =>
    buildCreatePost({ profileId: 'p', content: { body: 'hi' }, channels: { instagram: { settings: {} } } }, conns),
  ).toThrow(/instagram.*media/i);
});

/* ------------------------------- documents -------------------------------- */

test('LinkedIn document → single_image post_type, customer-owned content_kind passes through', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [doc('d1')] },
      channels: {
        linkedin: { settings: { visibility: 'PUBLIC', content_kind: 'document', document: { title: 'Q3' } } },
      },
    },
    conns,
  );
  const v = post.variants[0]!;
  expect(v.post_type).toBe('single_image');
  expect(v.settings).toEqual({ visibility: 'PUBLIC', content_kind: 'document', document: { title: 'Q3' } });
});

test('throws on a document for a platform that does not support documents (X)', () => {
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [doc('d1')] }, channels: { x: { settings: {} } } },
      conns,
    ),
  ).toThrow(/document/i);
});

/* ----------------------------- overrides & plumbing ----------------------- */

test('explicit postType overrides media derivation', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { media: [vid('v1')] }, channels: { x: { settings: {}, postType: 'video' } } },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('video');
});

test('per-channel body + media override the shared base', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'base', media: [img('base')] },
      channels: {
        x: { settings: {} },
        instagram: { settings: { media_type: 'REELS' }, body: '🚀', media: [vid('ig')] },
      },
    },
    conns,
  );
  const x = post.variants.find((v) => v.platform === 'x')!;
  expect(x.body).toBe('base');
  expect(x.media).toEqual([{ media_id: 'base' }]);
  const ig = post.variants.find((v) => v.platform === 'instagram')!;
  expect(ig.body).toBe('🚀');
  expect(ig.media).toEqual([{ media_id: 'ig' }]);
  expect(ig.post_type).toBe('reel');
});

test('uses an explicit connectionId override', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { body: 'hi' }, channels: { x: { settings: {}, connectionId: 'conn_x2' } } },
    conns,
  );
  expect(post.variants[0]!.connection_id).toBe('conn_x2');
});

test('throws a clear error when a channel has no connection', () => {
  expect(() =>
    buildCreatePost({ profileId: 'p', content: { body: 'hi' }, channels: { x: { settings: {} } } }, [
      { id: 'conn_li', platform: 'linkedin' },
    ]),
  ).toThrow(/connection.*x/i);
});

test('throws when no channels are given', () => {
  expect(() => buildCreatePost({ profileId: 'p', content: { body: 'hi' }, channels: {} }, conns)).toThrow(
    /at least one/i,
  );
});

test('maps top-level fields to the request body', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'hi' },
      channels: { x: { settings: {} } },
      publish: 'schedule',
      scheduleAt: '2026-06-20T14:00:00Z',
      tags: ['q3'],
      externalId: 'ext1',
      notes: 'n',
      dryRun: true,
      metadata: { campaign: 'x' },
    },
    conns,
  );
  expect(post).toMatchObject({
    publish: 'schedule',
    schedule_at: '2026-06-20T14:00:00Z',
    tags: ['q3'],
    external_id: 'ext1',
    notes: 'n',
    dry_run: true,
    metadata: { campaign: 'x' },
  });
});

/* ------------------------------- updates ---------------------------------- */

test('buildUpdatePost (light edit) sends only the envelope, no variants', () => {
  const body = buildUpdatePost({ scheduleAt: '2026-06-20T14:00:00Z', tags: ['q3'] });
  expect(body.variants).toBeUndefined();
  expect(body).toMatchObject({ schedule_at: '2026-06-20T14:00:00Z', tags: ['q3'] });
});

test('buildUpdatePost (content edit) rebuilds the variant set', () => {
  const body = buildUpdatePost(
    {
      content: { body: 'Revised' },
      channels: { x: { settings: {} }, linkedin: { settings: { visibility: 'PUBLIC', content_kind: 'text' } } },
    },
    conns,
  );
  expect(body.variants).toHaveLength(2);
  expect(body.variants!.find((v) => v.platform === 'x')!.body).toBe('Revised');
});

test('buildUpdatePost throws on an empty edit', () => {
  expect(() => buildUpdatePost({})).toThrow(/at least one/i);
  expect(() => buildUpdatePost({ dryRun: true })).toThrow(/at least one/i);
});

/* ------------------------------ strong typing ----------------------------- */

test('settings are typed per platform (compile-time)', () => {
  buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'hi' },
      channels: {
        // @ts-expect-error — media_type is an Instagram setting, not an X setting
        x: { settings: { media_type: 'REELS' } },
      },
    },
    conns,
  );
});

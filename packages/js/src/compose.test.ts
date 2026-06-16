import { expect, test } from 'vitest';

import { buildCreatePost, buildUpdatePost } from './compose';
import type { MediaKind } from './resources';

const conns = [
  { id: 'conn_x', platform: 'x' },
  { id: 'conn_li', platform: 'linkedin' },
  { id: 'conn_ig', platform: 'instagram' },
  { id: 'conn_fb', platform: 'facebook_page' },
] as const;

const media = (id: string, kind: MediaKind) => ({ id, kind });
const img = (id: string) => media(id, 'image');
const vid = (id: string) => media(id, 'video');

test('broadcast array → one variant per channel with resolved connection ids', () => {
  const post = buildCreatePost(
    { profileId: 'prof_1', content: { body: 'Launch day!' }, channels: ['x', 'linkedin'] },
    conns,
  );

  expect(post.profile_id).toBe('prof_1');
  expect(post.variants).toHaveLength(2);
  const x = post.variants.find((v) => v.platform === 'x')!;
  expect(x.connection_id).toBe('conn_x');
  expect(x.body).toBe('Launch day!');
  expect(x.post_type).toBe('text');
});

test('derives post_type from media, per platform', () => {
  const single = buildCreatePost(
    { profileId: 'p', content: { media: [img('m1')] }, channels: ['x', 'instagram'] },
    conns,
  );
  expect(single.variants.find((v) => v.platform === 'x')!.post_type).toBe('single_image');
  expect(single.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('single_image');

  const multi = buildCreatePost(
    { profileId: 'p', content: { media: [img('m1'), img('m2')] }, channels: ['x', 'instagram'] },
    conns,
  );
  expect(multi.variants.find((v) => v.platform === 'x')!.post_type).toBe('multi_image');
  expect(multi.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('carousel');

  const video = buildCreatePost(
    { profileId: 'p', content: { media: [vid('m1')] }, channels: ['x', 'instagram'] },
    conns,
  );
  expect(video.variants.find((v) => v.platform === 'x')!.post_type).toBe('video');
  expect(video.variants.find((v) => v.platform === 'instagram')!.post_type).toBe('reel');
});

test('fills dependent settings (LinkedIn content_kind + visibility, Instagram media_type)', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { body: 'hi', media: [img('m1')] }, channels: ['linkedin', 'instagram'] },
    conns,
  );
  expect(post.variants.find((v) => v.platform === 'linkedin')!.settings).toMatchObject({
    visibility: 'PUBLIC',
    content_kind: 'single_image',
  });
  expect(post.variants.find((v) => v.platform === 'instagram')!.settings).toMatchObject({
    media_type: 'IMAGE',
  });
});

test('per-channel overrides: body, settings, and inheritance', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'base', media: [img('m1')] },
      channels: {
        x: {},
        instagram: { body: '🚀 #launch', settings: { location_id: '123' } },
        linkedin: { settings: { visibility: 'CONNECTIONS' } },
      },
    },
    conns,
  );
  expect(post.variants.find((v) => v.platform === 'x')!.body).toBe('base');
  expect(post.variants.find((v) => v.platform === 'instagram')!.body).toBe('🚀 #launch');
  expect(post.variants.find((v) => v.platform === 'instagram')!.settings).toMatchObject({
    location_id: '123',
    media_type: 'IMAGE',
  });
  expect(post.variants.find((v) => v.platform === 'linkedin')!.settings).toMatchObject({
    visibility: 'CONNECTIONS',
  });
});

test('uses an explicit connectionId override', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { body: 'hi' }, channels: { x: { connectionId: 'conn_x2' } } },
    conns,
  );
  expect(post.variants[0]!.connection_id).toBe('conn_x2');
});

test('throws a clear error when a channel has no connection', () => {
  expect(() =>
    buildCreatePost({ profileId: 'p', content: { body: 'hi' }, channels: ['x'] }, [
      { id: 'conn_li', platform: 'linkedin' },
    ]),
  ).toThrow(/connection.*x/i);
});

test('throws when Instagram has no media', () => {
  expect(() =>
    buildCreatePost({ profileId: 'p', content: { body: 'hi' }, channels: ['instagram'] }, conns),
  ).toThrow(/instagram.*media/i);
});

test('maps top-level fields to the request body', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'hi' },
      channels: ['x'],
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

test('buildUpdatePost (light edit) sends only the envelope, no variants', () => {
  const body = buildUpdatePost({ scheduleAt: '2026-06-20T14:00:00Z', tags: ['q3'] });
  expect(body.variants).toBeUndefined();
  expect(body).toMatchObject({ schedule_at: '2026-06-20T14:00:00Z', tags: ['q3'] });
});

test('buildUpdatePost (content edit) rebuilds the variant set', () => {
  const body = buildUpdatePost(
    { content: { body: 'Revised' }, channels: ['x', 'linkedin'] },
    conns,
  );
  expect(body.variants).toHaveLength(2);
  expect(body.variants!.find((v) => v.platform === 'x')!.body).toBe('Revised');
});

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

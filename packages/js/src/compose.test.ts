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

test('Instagram derives a carousel for a 2+ mixed set (backend allows video in carousel)', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { media: [img('m1'), vid('m2')] }, channels: ['instagram'] },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('carousel');
  expect(post.variants[0]!.settings).toMatchObject({ media_type: 'CAROUSEL' });
});

test('throws when mixing images and video on a single-placement platform (X)', () => {
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [img('m1'), vid('m2')] }, channels: ['x'] },
      conns,
    ),
  ).toThrow(/images and video/i);
});

test('throws on multiple videos for a single-video platform (X)', () => {
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [vid('v1'), vid('v2')] }, channels: ['x'] },
      conns,
    ),
  ).toThrow(/at most one video/i);
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

test('throws on a document upload without explicit settings (cannot auto-derive)', () => {
  // A LinkedIn document post needs content_kind: 'document' + a title we can't
  // derive — auto-deriving it as single_image would publish the PDF as an image.
  expect(() =>
    buildCreatePost(
      { profileId: 'p', content: { media: [media('d1', 'document')] }, channels: ['linkedin'] },
      conns,
    ),
  ).toThrow(/document/i);
});

test('buildUpdatePost throws on an empty edit (no field changes)', () => {
  expect(() => buildUpdatePost({})).toThrow(/at least one/i);
  expect(() => buildUpdatePost({ dryRun: true })).toThrow(/at least one/i);
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

/* ---------------- advanced settings × derivation interactions ---------------- */

test('LinkedIn document post works from a content_kind:document signal (no explicit postType)', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [media('d1', 'document')] },
      channels: {
        linkedin: { settings: { content_kind: 'document', document: { title: 'Q3 Report' } } },
      },
    },
    conns,
  );
  const v = post.variants[0]!;
  expect(v.post_type).toBe('single_image');
  expect(v.settings).toMatchObject({
    content_kind: 'document',
    document: { title: 'Q3 Report' },
    visibility: 'PUBLIC',
  });
  expect(v.media).toEqual([{ media_id: 'd1' }]);
});

test('LinkedIn article post (no media) → text + content_kind:article', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'See the report' },
      channels: {
        linkedin: { settings: { content_kind: 'article', article: { source: 'https://ex.com/a' } } },
      },
    },
    conns,
  );
  const v = post.variants[0]!;
  expect(v.post_type).toBe('text');
  expect(v.settings).toMatchObject({ content_kind: 'article', article: { source: 'https://ex.com/a' } });
});

test('LinkedIn poll post (no media) → text + content_kind:poll', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'Vote' },
      channels: {
        linkedin: {
          settings: { content_kind: 'poll', poll: { question: 'A or B?', options: ['A', 'B'], duration: 'ONE_DAY' } },
        },
      },
    },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('text');
  expect(post.variants[0]!.settings).toMatchObject({ content_kind: 'poll' });
});

test('Instagram reel carries reel-only settings (video → reel)', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [vid('v1')] },
      channels: { instagram: { settings: { share_to_feed: true, thumb_offset: 100 } } },
    },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('reel');
  expect(post.variants[0]!.settings).toMatchObject({
    media_type: 'REELS',
    share_to_feed: true,
    thumb_offset: 100,
  });
});

test('X poll post (no media) → text + the poll', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: {},
      channels: { x: { settings: { poll: { options: ['A', 'B'], duration_minutes: 1440 } } } },
    },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('text');
  expect(post.variants[0]!.settings).toMatchObject({ poll: { options: ['A', 'B'], duration_minutes: 1440 } });
});

test('X quote post (no media) → text + quote_tweet_id', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: {}, channels: { x: { settings: { quote_tweet_id: '123' } } } },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('text');
  expect(post.variants[0]!.settings).toMatchObject({ quote_tweet_id: '123' });
});

test('explicit postType overrides media derivation', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { media: [vid('v1')] }, channels: { x: { postType: 'video' } } },
    conns,
  );
  expect(post.variants[0]!.post_type).toBe('video');
});

test('per-channel media override replaces base media (and re-derives)', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'hi', media: [img('base')] },
      channels: { x: {}, instagram: { media: [vid('ig_video')] } },
    },
    conns,
  );
  expect(post.variants.find((v) => v.platform === 'x')!.media).toEqual([{ media_id: 'base' }]);
  const ig = post.variants.find((v) => v.platform === 'instagram')!;
  expect(ig.media).toEqual([{ media_id: 'ig_video' }]);
  expect(ig.post_type).toBe('reel');
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

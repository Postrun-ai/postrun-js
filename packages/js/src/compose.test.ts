import { expect, test } from 'vitest';

import { buildCreatePost, buildUpdatePost } from './compose';

const conns = [
  { id: 'conn_x', platform: 'x' },
  { id: 'conn_li', platform: 'linkedin' },
  { id: 'conn_ig', platform: 'instagram' },
  { id: 'conn_fb', platform: 'facebook_page' },
  { id: 'conn_tt', platform: 'tiktok' },
] as const;

/** A media attachment — just the asset id (the customer never declares a kind;
 * the server derives the post shape from the uploaded media). */
const media = (id: string) => ({ id });

/* ------------------------------ assembly --------------------------------- */

test('assembles variants and passes settings through verbatim (no shape, no auto-fill)', () => {
  const post = buildCreatePost(
    {
      profileId: 'prof_1',
      content: { body: 'Launch!', media: [media('m1')] },
      channels: {
        x: { settings: { reply_settings: 'following' } },
        linkedin: { settings: { visibility: 'PUBLIC' } },
        instagram: { settings: {} },
      },
    },
    conns,
  );

  const x = post.variants.find((v) => v.platform === 'x')!;
  expect(x.connection_id).toBe('conn_x');
  expect(x.body).toBe('Launch!');
  expect(x.media).toEqual([{ media_id: 'm1' }]);
  // passthrough — NOT auto-filled, and NO post_type sent (server derives it).
  expect(x.settings).toEqual({ reply_settings: 'following' });
  expect('post_type' in x).toBe(false);

  // exactly what the customer passed — no derived content_kind, no extras added.
  const li = post.variants.find((v) => v.platform === 'linkedin')!;
  expect(li.settings).toEqual({ visibility: 'PUBLIC' });

  // No auto-fill: we do NOT inject media_type for the customer (they own settings).
  const ig = post.variants.find((v) => v.platform === 'instagram')!;
  expect(ig.settings).toEqual({});
});

test('attaches media as ordered { media_id } refs for every platform', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [media('m1'), media('m2')] },
      channels: { x: { settings: {} }, tiktok: { settings: {} } },
    },
    conns,
  );
  for (const v of post.variants) {
    expect(v.media).toEqual([{ media_id: 'm1' }, { media_id: 'm2' }]);
  }
});

test('TikTok resolves its connection from the profile', () => {
  const post = buildCreatePost(
    { profileId: 'p', content: { media: [media('m1')] }, channels: { tiktok: { settings: {} } } },
    conns,
  );
  expect(post.variants[0]!.connection_id).toBe('conn_tt');
});

/* ------------------------------- documents -------------------------------- */

test('LinkedIn document — the document sub-object passes through (shape is server-derived)', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { media: [media('d1')] },
      channels: {
        linkedin: { settings: { visibility: 'PUBLIC', document: { title: 'Q3' } } },
      },
    },
    conns,
  );
  const v = post.variants[0]!;
  expect(v.media).toEqual([{ media_id: 'd1' }]);
  expect(v.settings).toEqual({ visibility: 'PUBLIC', document: { title: 'Q3' } });
});

/* ----------------------------- overrides & plumbing ----------------------- */

test('per-channel body + media override the shared base', () => {
  const post = buildCreatePost(
    {
      profileId: 'p',
      content: { body: 'base', media: [media('base')] },
      channels: {
        x: { settings: {} },
        instagram: { settings: {}, body: '🚀', media: [media('ig')] },
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
      channels: { x: { settings: {} }, linkedin: { settings: { visibility: 'PUBLIC' } } },
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
        // @ts-expect-error — media_type is not an X setting (and is server-derived)
        x: { settings: { media_type: 'REELS' } },
      },
    },
    conns,
  );
});

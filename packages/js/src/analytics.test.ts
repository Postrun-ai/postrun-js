import { describe, expect, it } from 'vitest';

import {
  accountMetricRows,
  accountTrend,
  formatMetric,
  hasAnalytics,
  hasPostAnalytics,
  postMetricRows,
} from './analytics';
import type {
  FacebookPageDay,
  FacebookPostMetrics,
  InstagramPostMetrics,
  TikTokAccountDay,
  TikTokPostMetrics,
} from './client/types.gen';

const TIKTOK_POST: TikTokPostMetrics = {
  platform: 'tiktok',
  video_views: 1231,
  reach: 154,
  likes: 10,
  comments: 2,
  shares: 0,
  favorites: 3,
  average_time_watched: 4.118,
  total_time_watched: 695.942,
  full_video_watched_rate: 0.0237,
  new_followers: 1,
  profile_views: null,
};

const INSTAGRAM_REEL: InstagramPostMetrics = {
  platform: 'instagram',
  views: 5400,
  reach: 3100,
  likes: 220,
  comments: 14,
  shares: 31,
  saved: 45,
  reposts: 6,
  total_interactions: 316,
  follows: null,
  profile_visits: null,
  profile_activity: null,
  ig_reels_avg_watch_time: 6120,
  ig_reels_video_view_total_time: 33_048_000,
  reels_skip_rate: 41.2,
};

const FACEBOOK_POST: FacebookPostMetrics = {
  platform: 'facebook_page',
  post_media_view: 2300,
  post_total_media_view_unique: 1800,
  post_reactions_by_type_total: { like: 40, love: 6 },
  post_clicks: 95,
  post_clicks_by_type: { 'other clicks': 35, 'link clicks': 60 },
  comments: 7,
  shares: 3,
  blue_reels_play_count: null,
  fb_reels_total_plays: null,
  fb_reels_replay_count: null,
  post_video_avg_time_watched: null,
  post_video_view_time: null,
  post_video_followers: null,
  post_video_likes_by_reaction_type: null,
};

const labels = (rows: ReadonlyArray<{ label: string }>) =>
  rows.map((row) => row.label);

describe('postMetricRows', () => {
  it('lists a TikTok post’s metrics with their raw values', () => {
    const rows = postMetricRows(TIKTOK_POST, 'video');

    expect(labels(rows)).toEqual([
      'Views',
      'Reach',
      'Likes',
      'Comments',
      'Shares',
      'Saves',
      'Avg. watch time',
      'Completion',
      'New followers',
      'Profile views',
    ]);
    expect(rows[6]).toEqual({
      key: 'average_time_watched',
      label: 'Avg. watch time',
      format: 'seconds',
      value: 4.118,
    });
  });

  it('gives an Instagram reel the reel metrics, not the feed-only ones', () => {
    const rows = postMetricRows(INSTAGRAM_REEL, 'reel');

    expect(labels(rows)).toEqual([
      'Views',
      'Reach',
      'Likes',
      'Comments',
      'Shares',
      'Saves',
      'Reposts',
      'Interactions',
      'Avg. watch time',
      'Watch time',
      'Skip rate',
    ]);
    expect(rows.find((row) => row.key === 'reels_skip_rate')).toMatchObject({
      format: 'percent',
      value: 41.2,
    });
  });

  it.each(['single_image', 'carousel'] as const)(
    'gives an Instagram %s post the feed metrics, not the reel ones',
    (postType) => {
      expect(labels(postMetricRows(INSTAGRAM_REEL, postType))).toEqual([
        'Views',
        'Reach',
        'Likes',
        'Comments',
        'Shares',
        'Saves',
        'Reposts',
        'Interactions',
        'Follows',
        'Profile visits',
        'Profile activity',
      ]);
    },
  );

  it.each(['text', 'single_image', 'multi_image'] as const)(
    'gives a Facebook %s post the post metrics, breakdowns included',
    (postType) => {
      const rows = postMetricRows(FACEBOOK_POST, postType);

      expect(labels(rows)).toEqual([
        'Views',
        'Viewers',
        'Reactions',
        'Clicks',
        'Clicks by type',
        'Comments',
        'Shares',
      ]);
      expect(rows[2]?.value).toEqual({ like: 40, love: 6 });
    },
  );

  it('gives a Facebook reel the reel metrics', () => {
    expect(labels(postMetricRows(FACEBOOK_POST, 'reel'))).toEqual([
      'Plays',
      'Total plays',
      'Replays',
      'Avg. watch time',
      'Watch time',
      'New followers',
      'Reactions',
    ]);
  });
});

describe('formatMetric', () => {
  it('shows a metric the platform did not report as "—", never 0', () => {
    for (const format of [
      'count',
      'seconds',
      'milliseconds',
      'ratio',
      'percent',
    ] as const) {
      expect(formatMetric(null, format)).toBe('—');
    }
  });

  it('keeps a real zero', () => {
    expect(formatMetric(0)).toBe('0');
    expect(formatMetric(0, 'ratio')).toBe('0%');
  });

  it('compacts large counts and leaves small ones exact', () => {
    expect(formatMetric(999)).toBe('999');
    expect(formatMetric(1_234)).toBe('1.2K');
    expect(formatMetric(1_240_000)).toBe('1.2M');
  });

  it('shows a duration in the largest unit that keeps it readable', () => {
    expect(formatMetric(4.118, 'seconds')).toBe('4.1s');
    expect(formatMetric(6120, 'milliseconds')).toBe('6.1s');
    expect(formatMetric(750, 'seconds')).toBe('12.5m');
    expect(formatMetric(33_048_000, 'milliseconds')).toBe('9.2h');
  });

  it('moves up a unit when rounding reaches the next one', () => {
    expect(formatMetric(59.96, 'seconds')).toBe('1m');
    expect(formatMetric(3599, 'seconds')).toBe('1h');
  });

  it('reads a ratio as 0–1 and a percent as 0–100', () => {
    expect(formatMetric(0.024, 'ratio')).toBe('2.4%');
    expect(formatMetric(41.2, 'percent')).toBe('41.2%');
  });

  it('lists a breakdown largest first under Meta’s own keys', () => {
    expect(formatMetric({ love: 3, like: 1_234 })).toBe('Like 1.2K · Love 3');
    expect(formatMetric({ 'other clicks': 35, 'link clicks': 60 })).toBe(
      'Link clicks 60 · Other clicks 35',
    );
  });

  it('shows an empty breakdown as 0', () => {
    expect(formatMetric({})).toBe('0');
  });
});

describe('accountMetricRows', () => {
  it('lists a TikTok account’s totals', () => {
    expect(
      accountMetricRows({
        platform: 'tiktok',
        followers_count: 1200,
        following_count: 30,
        total_likes: 9800,
        videos_count: 42,
        daily: [],
      }),
    ).toEqual([
      {
        key: 'followers_count',
        label: 'Followers',
        format: 'count',
        value: 1200,
      },
      {
        key: 'following_count',
        label: 'Following',
        format: 'count',
        value: 30,
      },
      { key: 'total_likes', label: 'Likes', format: 'count', value: 9800 },
      { key: 'videos_count', label: 'Videos', format: 'count', value: 42 },
    ]);
  });

  it('lists an Instagram account’s totals, then its last 30 days', () => {
    const rows = accountMetricRows({
      platform: 'instagram',
      followers_count: 5200,
      follows_count: 310,
      media_count: 128,
      last_30_days: {
        views: 48_000,
        reach: 21_000,
        accounts_engaged: 1900,
        total_interactions: 3400,
        likes: 2800,
        comments: 190,
        shares: 240,
        saves: 170,
        reposts: 12,
        replies: 30,
        profile_links_taps: 44,
        follows_and_unfollows: { follower: 120, non_follower: 9 },
      },
      daily: [],
    });

    expect(labels(rows)).toEqual([
      'Followers',
      'Following',
      'Posts',
      'Views · 30d',
      'Reach · 30d',
      'Engaged · 30d',
      'Interactions · 30d',
    ]);
    expect(rows[3]?.value).toBe(48_000);
  });

  it('lists a Facebook Page’s followers', () => {
    expect(
      labels(
        accountMetricRows({
          platform: 'facebook_page',
          followers_count: 870,
          daily: [],
        }),
      ),
    ).toEqual(['Followers']);
  });
});

describe('accountTrend', () => {
  const tiktokDay = (
    date: string,
    followers_count: number | null,
  ): TikTokAccountDay => ({
    date,
    followers_count,
    daily_new_followers: null,
    daily_lost_followers: null,
    video_views: null,
    profile_views: null,
    likes: null,
    comments: null,
    shares: null,
  });

  const pageDay = (
    date: string,
    page_follows: number | null,
  ): FacebookPageDay => ({
    date,
    page_media_view: null,
    page_total_media_view_unique: null,
    page_follows,
    page_daily_follows_unique: null,
    page_daily_unfollows_unique: null,
    page_post_engagements: null,
    page_views_total: null,
    page_video_views: null,
    page_total_actions: null,
  });

  it('follows a TikTok account’s followers, skipping unreported days and keeping zeros', () => {
    expect(
      accountTrend({
        platform: 'tiktok',
        followers_count: 1200,
        following_count: null,
        total_likes: null,
        videos_count: null,
        daily: [
          tiktokDay('2026-10-01', 0),
          tiktokDay('2026-10-02', null),
          tiktokDay('2026-10-03', 1200),
        ],
      }),
    ).toEqual({
      label: 'Followers',
      points: [
        { date: '2026-10-01', value: 0 },
        { date: '2026-10-03', value: 1200 },
      ],
    });
  });

  it('follows an Instagram account’s daily reach, the only daily metric Meta gives', () => {
    expect(
      accountTrend({
        platform: 'instagram',
        followers_count: null,
        follows_count: null,
        media_count: null,
        last_30_days: {
          views: null,
          reach: null,
          accounts_engaged: null,
          total_interactions: null,
          likes: null,
          comments: null,
          shares: null,
          saves: null,
          reposts: null,
          replies: null,
          profile_links_taps: null,
          follows_and_unfollows: null,
        },
        daily: [
          { date: '2026-10-01', reach: 900 },
          { date: '2026-10-02', reach: null },
        ],
      }),
    ).toEqual({ label: 'Reach', points: [{ date: '2026-10-01', value: 900 }] });
  });

  it('follows a Facebook Page’s end-of-day followers', () => {
    expect(
      accountTrend({
        platform: 'facebook_page',
        followers_count: 870,
        daily: [pageDay('2026-10-01', 860), pageDay('2026-10-02', 870)],
      }),
    ).toEqual({
      label: 'Followers',
      points: [
        { date: '2026-10-01', value: 860 },
        { date: '2026-10-02', value: 870 },
      ],
    });
  });
});

describe('hasAnalytics', () => {
  it.each([
    ['tiktok', true],
    ['instagram', true],
    ['facebook_page', true],
    ['x', false],
    ['linkedin', false],
  ])('is %s → %s', (platform, expected) => {
    expect(hasAnalytics(platform)).toBe(expected);
  });
});

describe('hasPostAnalytics', () => {
  it('is true only for a variant that published to a network with analytics', () => {
    expect(
      hasPostAnalytics({ platform: 'instagram', status: 'published' }),
    ).toBe(true);
    expect(
      hasPostAnalytics({ platform: 'facebook_page', status: 'published' }),
    ).toBe(true);
    expect(hasPostAnalytics({ platform: 'tiktok', status: 'failed' })).toBe(
      false,
    );
    expect(hasPostAnalytics({ platform: 'x', status: 'published' })).toBe(
      false,
    );
  });
});

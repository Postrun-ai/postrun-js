import type {
  AccountMetrics,
  FacebookPageMetrics,
  FacebookPostMetrics,
  InstagramAccountMetrics,
  InstagramPostMetrics,
  PostMetrics,
  PostVariantStatus,
  TikTokAccountMetrics,
  TikTokPostMetrics,
} from './client/types.gen';
// From `./resources`, which re-declares these names: importing the generated
// ones too gives the d.ts bundle two symbols under one exported name, and
// @postrun/react's inferred hook types then fail TS2742.
import type { PostPlatform, PostType } from './resources';

/**
 * Presentation helpers for the analytics reads (`postsGetAnalytics`,
 * `connectionsGetAnalytics`). The wire keeps each network's own field names;
 * these carry the domain knowledge a UI needs on top: which metrics apply to a
 * post type, their labels, and their units. Pure — pin them in tests.
 */

/** How to read a metric's number: `ratio` is 0–1, `percent` is 0–100. */
export type MetricFormat =
  | 'count'
  | 'seconds'
  | 'milliseconds'
  | 'ratio'
  | 'percent';

/** A count, a breakdown keyed by the network's own type names, or `null` when
 * the network didn't report it. */
export type MetricValue = number | Record<string, number> | null;

export interface MetricRow {
  key: string;
  label: string;
  format: MetricFormat;
  value: MetricValue;
}

export interface MetricPoint {
  date: string;
  value: number;
}

const ANALYTICS_PLATFORMS = [
  'tiktok',
  'instagram',
  'facebook_page',
] as const satisfies readonly PostPlatform[];

export type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

/** Whether Postrun reads analytics for this network. */
export function hasAnalytics(platform: string): platform is AnalyticsPlatform {
  return ANALYTICS_PLATFORMS.some((supported) => supported === platform);
}

/** Only a published variant on a network with analytics has metrics to read. */
export function hasPostAnalytics(variant: {
  platform: PostPlatform;
  status: PostVariantStatus;
}): boolean {
  return variant.status === 'published' && hasAnalytics(variant.platform);
}

interface MetricField<Key> {
  key: Key;
  label: string;
  format?: MetricFormat;
}

type Fields<Metrics> = readonly MetricField<
  Exclude<keyof Metrics, 'platform'>
>[];

// `total_time_watched` is left out: next to views and average watch time it
// adds nothing a reader acts on.
const TIKTOK_POST: Fields<TikTokPostMetrics> = [
  { key: 'video_views', label: 'Views' },
  { key: 'reach', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'favorites', label: 'Saves' },
  { key: 'average_time_watched', label: 'Avg. watch time', format: 'seconds' },
  { key: 'full_video_watched_rate', label: 'Completion', format: 'ratio' },
  { key: 'new_followers', label: 'New followers' },
  { key: 'profile_views', label: 'Profile views' },
];

const INSTAGRAM_SHARED: Fields<InstagramPostMetrics> = [
  { key: 'views', label: 'Views' },
  { key: 'reach', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'saved', label: 'Saves' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'total_interactions', label: 'Interactions' },
];

// Meta reports these for single image and carousel posts only.
const INSTAGRAM_FEED: Fields<InstagramPostMetrics> = [
  ...INSTAGRAM_SHARED,
  { key: 'follows', label: 'Follows' },
  { key: 'profile_visits', label: 'Profile visits' },
  { key: 'profile_activity', label: 'Profile activity' },
];

const INSTAGRAM_REEL: Fields<InstagramPostMetrics> = [
  ...INSTAGRAM_SHARED,
  {
    key: 'ig_reels_avg_watch_time',
    label: 'Avg. watch time',
    format: 'milliseconds',
  },
  {
    key: 'ig_reels_video_view_total_time',
    label: 'Watch time',
    format: 'milliseconds',
  },
  { key: 'reels_skip_rate', label: 'Skip rate', format: 'percent' },
];

const FACEBOOK_FEED: Fields<FacebookPostMetrics> = [
  { key: 'post_media_view', label: 'Views' },
  { key: 'post_total_media_view_unique', label: 'Viewers' },
  { key: 'post_reactions_by_type_total', label: 'Reactions' },
  { key: 'post_clicks', label: 'Clicks' },
  { key: 'post_clicks_by_type', label: 'Clicks by type' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
];

const FACEBOOK_REEL: Fields<FacebookPostMetrics> = [
  { key: 'blue_reels_play_count', label: 'Plays' },
  { key: 'fb_reels_total_plays', label: 'Total plays' },
  { key: 'fb_reels_replay_count', label: 'Replays' },
  {
    key: 'post_video_avg_time_watched',
    label: 'Avg. watch time',
    format: 'milliseconds',
  },
  { key: 'post_video_view_time', label: 'Watch time', format: 'milliseconds' },
  { key: 'post_video_followers', label: 'New followers' },
  { key: 'post_video_likes_by_reaction_type', label: 'Reactions' },
];

function rowsOf<Key extends string>(
  fields: readonly MetricField<Key>[],
  metrics: Record<Key, MetricValue>,
): MetricRow[] {
  return fields.map(({ key, label, format = 'count' }) => ({
    key,
    label,
    format,
    value: metrics[key],
  }));
}

/**
 * The metrics that apply to a post, in display order. Meta reports different
 * metrics for Reels than for other posts, so `postType` (the variant's
 * `post_type`) picks the set; a metric that doesn't apply is left out rather
 * than shown as unreported.
 */
export function postMetricRows(
  metrics: PostMetrics,
  postType: PostType | null,
): MetricRow[] {
  switch (metrics.platform) {
    case 'tiktok':
      return rowsOf(TIKTOK_POST, metrics);
    case 'instagram':
      return rowsOf(
        postType === 'reel' ? INSTAGRAM_REEL : INSTAGRAM_FEED,
        metrics,
      );
    case 'facebook_page':
      return rowsOf(
        postType === 'reel' ? FACEBOOK_REEL : FACEBOOK_FEED,
        metrics,
      );
  }
}

const TIKTOK_ACCOUNT: Fields<Omit<TikTokAccountMetrics, 'daily'>> = [
  { key: 'followers_count', label: 'Followers' },
  { key: 'following_count', label: 'Following' },
  { key: 'total_likes', label: 'Likes' },
  { key: 'videos_count', label: 'Videos' },
];

const INSTAGRAM_ACCOUNT: Fields<
  Omit<InstagramAccountMetrics, 'daily' | 'last_30_days'>
> = [
  { key: 'followers_count', label: 'Followers' },
  { key: 'follows_count', label: 'Following' },
  { key: 'media_count', label: 'Posts' },
];

const INSTAGRAM_LAST_30_DAYS: Fields<InstagramAccountMetrics['last_30_days']> =
  [
    { key: 'views', label: 'Views · 30d' },
    { key: 'reach', label: 'Reach · 30d' },
    { key: 'accounts_engaged', label: 'Engaged · 30d' },
    { key: 'total_interactions', label: 'Interactions · 30d' },
  ];

const FACEBOOK_ACCOUNT: Fields<Omit<FacebookPageMetrics, 'daily'>> = [
  { key: 'followers_count', label: 'Followers' },
];

/** An account's headline numbers, in display order. */
export function accountMetricRows(metrics: AccountMetrics): MetricRow[] {
  switch (metrics.platform) {
    case 'tiktok':
      return rowsOf(TIKTOK_ACCOUNT, metrics);
    case 'instagram':
      return [
        ...rowsOf(INSTAGRAM_ACCOUNT, metrics),
        ...rowsOf(INSTAGRAM_LAST_30_DAYS, metrics.last_30_days),
      ];
    case 'facebook_page':
      return rowsOf(FACEBOOK_ACCOUNT, metrics);
  }
}

function pointsOf<Key extends string>(
  daily: ReadonlyArray<{ date: string } & Record<Key, number | null>>,
  key: Key,
): MetricPoint[] {
  return daily.flatMap((day) => {
    const value = day[key];

    return value === null ? [] : [{ date: day.date, value }];
  });
}

/**
 * The account's main daily series for a trend line, oldest first, leaving out
 * days the network didn't report. Instagram's is reach: it is the only account
 * metric Meta reports per day.
 */
export function accountTrend(metrics: AccountMetrics): {
  label: string;
  points: MetricPoint[];
} {
  switch (metrics.platform) {
    case 'tiktok':
      return {
        label: 'Followers',
        points: pointsOf(metrics.daily, 'followers_count'),
      };
    case 'instagram':
      return { label: 'Reach', points: pointsOf(metrics.daily, 'reach') };
    case 'facebook_page':
      return {
        label: 'Followers',
        points: pointsOf(metrics.daily, 'page_follows'),
      };
  }
}

// Pinned to en-US to match the English labels: a reader's locale would turn
// "1.2K" into "12L" (en-IN) next to them.
const COUNT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const PERCENT = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const unit = (name: 'second' | 'minute' | 'hour') =>
  new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: name,
    unitDisplay: 'narrow',
    maximumFractionDigits: 1,
  });
const SECONDS = unit('second');
const MINUTES = unit('minute');
const HOURS = unit('hour');

// Compared after rounding to the shown precision, so 59.96 s reads "1m", not "60s".
const roundsBelow = (value: number, limit: number) =>
  Math.round(value * 10) / 10 < limit;

function formatDuration(seconds: number): string {
  if (roundsBelow(seconds, 60)) {
    return SECONDS.format(seconds);
  }

  const minutes = seconds / 60;

  return roundsBelow(minutes, 60)
    ? MINUTES.format(minutes)
    : HOURS.format(minutes / 60);
}

function formatNumber(value: number, format: MetricFormat): string {
  switch (format) {
    case 'count':
      return COUNT.format(value);
    case 'seconds':
      return formatDuration(value);
    case 'milliseconds':
      return formatDuration(value / 1000);
    case 'ratio':
      return PERCENT.format(value);
    case 'percent':
      return PERCENT.format(value / 100);
  }
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * A metric for display. `null` (not reported) reads "—", never a made-up 0. A
 * breakdown lists its types largest first: "Like 1.2K · Love 3".
 */
export function formatMetric(
  value: MetricValue,
  format: MetricFormat = 'count',
): string {
  if (value === null) {
    return '—';
  }

  if (typeof value === 'number') {
    return formatNumber(value, format);
  }

  const entries = Object.entries(value).sort(([, a], [, b]) => b - a);

  return entries.length === 0
    ? '0'
    : entries
        .map(([type, count]) => `${capitalize(type)} ${COUNT.format(count)}`)
        .join(' · ');
}

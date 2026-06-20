import type { TikTokCreatorInfo, TikTokPostVariant } from '@postrun/js';
import type { PreviewMedia } from '@preview/types';

/**
 * Realistic sample data for the playground — shaped EXACTLY like what the host
 * passes the component: a TikTok variant (our Post object), the live creator
 * info, and resolved media pixels. No API calls; this is the review fixture.
 */

export const creatorInfo: TikTokCreatorInfo = {
  creator: {
    nickname: 'Acme Studio',
    username: 'acmestudio',
    avatar_url:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  },
  privacy_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

/** A CORS-friendly sample video (cover-cropped into the 9:16 frame). */
const SAMPLE_VIDEO =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const PORTRAIT = (id: string) =>
  `https://images.unsplash.com/${id}?w=1080&h=1920&fit=crop`;

export const videoMedia: PreviewMedia[] = [
  { kind: 'video', url: SAMPLE_VIDEO, width: 1080, height: 1920 },
];

export const carouselMedia: PreviewMedia[] = [
  { kind: 'image', url: PORTRAIT('photo-1469474968028-56623f02e42e'), width: 1080, height: 1920, alt: 'Mountain vista' },
  { kind: 'image', url: PORTRAIT('photo-1501785888041-af3ef285b470'), width: 1080, height: 1920, alt: 'Lake at dusk' },
  { kind: 'image', url: PORTRAIT('photo-1470071459604-3b5ec3a7fe05'), width: 1080, height: 1920, alt: 'Foggy forest' },
];

export const singleImageMedia: PreviewMedia[] = [carouselMedia[0]!];

const CONN = 'conn_sample0000000000000000';

export const videoVariant: TikTokPostVariant = {
  platform: 'tiktok',
  post_type: 'video',
  connection_id: CONN,
  body: 'Behind the scenes of our spring shoot 🌸 #bts #studio @acmestudio',
  media: [{ media_id: 'med_video00000000000000000' }],
  settings: {
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_comment: false,
    disable_duet: false,
    disable_stitch: true,
    is_aigc: false,
  },
};

export const carouselVariant: TikTokPostVariant = {
  platform: 'tiktok',
  post_type: 'carousel',
  connection_id: CONN,
  body: 'Three frames from the trip 📸 swipe → #travel #photography',
  media: [
    { media_id: 'med_photo10000000000000000' },
    { media_id: 'med_photo20000000000000000' },
    { media_id: 'med_photo30000000000000000' },
  ],
  settings: {
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_comment: false,
    auto_add_music: true,
    photo_cover_index: 0,
  },
};

export const singleImageVariant: TikTokPostVariant = {
  platform: 'tiktok',
  post_type: 'single_image',
  connection_id: CONN,
  body: 'One shot from golden hour.',
  media: [{ media_id: 'med_photo10000000000000000' }],
  settings: {
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_comment: false,
  },
};

export interface Sample {
  id: string;
  label: string;
  variant: TikTokPostVariant;
  media: PreviewMedia[];
}

export const SAMPLES: Sample[] = [
  { id: 'video', label: 'Video', variant: videoVariant, media: videoMedia },
  { id: 'carousel', label: 'Photo carousel', variant: carouselVariant, media: carouselMedia },
  { id: 'single', label: 'Single image', variant: singleImageVariant, media: singleImageMedia },
];

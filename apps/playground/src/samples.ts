import type {
  MediaResource,
  PostType,
  TikTokCreatorInfo,
  TikTokPostVariant,
} from '@postrun/js';

import { processingAsset, readyImage, readyVideoAsset } from './samples-media';

/**
 * Realistic sample data for the playground — shaped EXACTLY like what the host
 * passes the component: a TikTok variant (our Post object), the live creator
 * info, and uploaded `MediaResource` assets. No API calls; this is the review
 * fixture.
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

export const videoMedia: MediaResource[] = [readyVideoAsset('med_video')];

export const carouselMedia: MediaResource[] = [
  readyImage('med_photo1', 'photo-1469474968028-56623f02e42e', 'Mountain vista'),
  readyImage('med_photo2', 'photo-1501785888041-af3ef285b470', 'Lake at dusk'),
  readyImage('med_photo3', 'photo-1470071459604-3b5ec3a7fe05', 'Foggy forest'),
];

export const singleImageMedia: MediaResource[] = [carouselMedia[0]!];

const CONN = 'conn_sample0000000000000000';

export const videoVariant: TikTokPostVariant = {
  platform: 'tiktok',
  connection_id: CONN,
  body: 'Behind the scenes of our spring shoot 🌸 #bts #studio @acmestudio',
  media: [{ media_id: 'med_video' }],
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
  connection_id: CONN,
  body: 'Three frames from the trip 📸 swipe → #travel #photography',
  media: [
    { media_id: 'med_photo1' },
    { media_id: 'med_photo2' },
    { media_id: 'med_photo3' },
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
  connection_id: CONN,
  body: 'One shot from golden hour.',
  media: [{ media_id: 'med_photo1' }],
  settings: {
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_comment: false,
  },
};

export const processingVariant: TikTokPostVariant = {
  platform: 'tiktok',
  connection_id: CONN,
  body: 'New drop incoming — clip still processing.',
  media: [{ media_id: 'med_video' }],
  settings: { privacy_level: 'PUBLIC_TO_EVERYONE', disable_comment: false },
};

export interface Sample {
  id: string;
  label: string;
  variant: TikTokPostVariant;
  /** The shape this post is — server-derived from the media on the live API; the
   * composer passes the shape it's building so the panel sizes captions + the
   * media-count rule correctly. */
  postType: PostType;
  media: MediaResource[];
}

export const SAMPLES: Sample[] = [
  { id: 'video', label: 'Video', variant: videoVariant, postType: 'video', media: videoMedia },
  {
    id: 'carousel',
    label: 'Photo carousel',
    variant: carouselVariant,
    postType: 'carousel',
    media: carouselMedia,
  },
  {
    id: 'single',
    label: 'Single image',
    variant: singleImageVariant,
    postType: 'single_image',
    media: singleImageMedia,
  },
  {
    id: 'processing',
    label: 'Processing',
    variant: processingVariant,
    postType: 'video',
    media: [processingAsset('med_video')],
  },
];

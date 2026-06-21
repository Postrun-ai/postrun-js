import type { InstagramPostVariant, MediaResource } from '@postrun/js';
import type { PreviewConnection } from '@preview/types';

import { conn, processingAsset, readyImage, readyVideoAsset } from './samples-media';

/** Instagram preview fixtures — shaped exactly like our Post object. */

export const connection: PreviewConnection = conn({ platform: 'instagram' });

const CONN = 'conn_ig000000000000000000';

function v(overrides: Partial<InstagramPostVariant>): InstagramPostVariant {
  return {
    platform: 'instagram',
    post_type: 'single_image',
    connection_id: CONN,
    body: '',
    media: [],
    settings: { media_type: 'IMAGE' },
    ...overrides,
  };
}

export interface IgSample {
  id: string;
  label: string;
  variant: InstagramPostVariant;
  media: MediaResource[];
}

export const IG_SAMPLES: IgSample[] = [
  {
    id: 'image',
    label: 'Image',
    variant: v({
      body: 'Golden hour from the offsite 🌅 #design #team @acmestudio',
      media: [{ media_id: 'med_i1' }],
      settings: { media_type: 'IMAGE', collaborators: ['janedev'] },
    }),
    media: [readyImage('med_i1', 'photo-1469474968028-56623f02e42e', 'Mountain vista')],
  },
  {
    id: 'carousel',
    label: 'Carousel',
    variant: v({
      post_type: 'carousel',
      body: 'Three frames from the trip — swipe → 📸 #travel #photography',
      media: [{ media_id: 'med_i1' }, { media_id: 'med_i2' }, { media_id: 'med_i3' }],
      settings: { media_type: 'CAROUSEL' },
    }),
    media: [
      readyImage('med_i1', 'photo-1469474968028-56623f02e42e'),
      readyImage('med_i2', 'photo-1501785888041-af3ef285b470'),
      readyImage('med_i3', 'photo-1470071459604-3b5ec3a7fe05'),
    ],
  },
  {
    id: 'reel',
    label: 'Reel',
    variant: v({
      post_type: 'reel',
      body: 'Behind the scenes of our spring shoot 🌸 #bts #reels',
      media: [{ media_id: 'med_v1' }],
      settings: {
        media_type: 'REELS',
        audio_name: 'Original audio · acmestudio',
        share_to_feed: true,
      },
    }),
    media: [readyVideoAsset('med_v1')],
  },
  {
    id: 'processing',
    label: 'Processing',
    variant: v({
      body: 'Fresh from the shoot — processing now.',
      media: [{ media_id: 'med_i1' }],
      settings: { media_type: 'IMAGE' },
    }),
    media: [processingAsset('med_i1')],
  },
  {
    id: 'empty',
    label: 'Empty',
    variant: v({ media: [], settings: { media_type: 'IMAGE' } }),
    media: [],
  },
  {
    id: 'reel-empty',
    label: 'Reel (empty)',
    variant: v({ post_type: 'reel', media: [], settings: { media_type: 'REELS' } }),
    media: [],
  },
];

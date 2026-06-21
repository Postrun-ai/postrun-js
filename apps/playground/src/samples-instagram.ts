import type { InstagramPostVariant } from '@postrun/js';
import type { InstagramPreviewAuthor, PreviewMedia } from '@preview/types';

/** Instagram preview fixtures — shaped exactly like our Post object. */

export const author: InstagramPreviewAuthor = {
  username: 'acmestudio',
  avatar_url:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  verified: true,
};

const SQUARE = (id: string) =>
  `https://images.unsplash.com/${id}?w=1080&h=1080&fit=crop`;
const VIDEO =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

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
  media: PreviewMedia[];
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
    media: [{ kind: 'image', url: SQUARE('photo-1469474968028-56623f02e42e'), alt: 'Mountain vista' }],
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
      { kind: 'image', url: SQUARE('photo-1469474968028-56623f02e42e') },
      { kind: 'image', url: SQUARE('photo-1501785888041-af3ef285b470') },
      { kind: 'image', url: SQUARE('photo-1470071459604-3b5ec3a7fe05') },
    ],
  },
  {
    id: 'reel',
    label: 'Reel',
    variant: v({
      post_type: 'reel',
      body: 'Behind the scenes of our spring shoot 🌸 #bts #reels',
      media: [{ media_id: 'med_v1' }],
      settings: { media_type: 'REELS', audio_name: 'Original audio · acmestudio', share_to_feed: true },
    }),
    media: [{ kind: 'video', url: VIDEO }],
  },
  {
    id: 'empty',
    label: 'Empty',
    variant: v({ media: [], settings: { media_type: 'IMAGE' } }),
    media: [],
  },
  {
    id: 'processing',
    label: 'Processing',
    variant: v({ media: [{ media_id: 'med_i1' }], settings: { media_type: 'IMAGE' } }),
    // Referenced but not yet resolved to pixels (no url/file) → processing.
    media: [{ kind: 'image' }],
  },
  {
    id: 'reel-empty',
    label: 'Reel (empty)',
    variant: v({ post_type: 'reel', media: [], settings: { media_type: 'REELS' } }),
    media: [],
  },
];

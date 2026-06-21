import type { LinkedInPostVariant, MediaResource } from '@postrun/js';
import type { PreviewConnection } from '@preview/types';

import { conn, processingAsset, readyImage } from './samples-media';

/** LinkedIn preview fixtures — one per content_kind, shaped exactly like our Post
 * object (LinkedInPostVariant). */

export const connection: PreviewConnection = conn({
  platform: 'linkedin',
  external_account_name: 'Acme Studio',
});
export const HEADLINE = 'Design & engineering for ambitious teams';

const CONN = 'conn_li000000000000000000';

function v(overrides: Partial<LinkedInPostVariant>): LinkedInPostVariant {
  return {
    platform: 'linkedin',
    post_type: 'text',
    connection_id: CONN,
    body: '',
    media: [],
    settings: { visibility: 'PUBLIC', content_kind: 'text' },
    ...overrides,
  };
}

export interface LiSample {
  id: string;
  label: string;
  variant: LinkedInPostVariant;
  media: MediaResource[];
}

export const LI_SAMPLES: LiSample[] = [
  {
    id: 'article',
    label: 'Article',
    variant: v({
      post_type: 'text',
      body: 'Wrote up everything we learned shipping our preview SDK. The "match the real platform" rule changed how we build. 👇',
      media: [{ media_id: 'med_li_thumb' }],
      settings: {
        visibility: 'PUBLIC',
        content_kind: 'article',
        article: {
          source: 'https://www.acme.com/blog/social-preview-playbook',
          title: 'The social preview playbook: match the platform, not the mock',
          description:
            'Lessons from building pixel-faithful, compliant post previews.',
        },
      },
    }),
    media: [readyImage('med_li_thumb', 'photo-1467232004584-a241de8bcf5d')],
  },
  {
    id: 'poll',
    label: 'Poll',
    variant: v({
      post_type: 'text',
      body: 'Settling a team debate — when do you actually like to ship?',
      settings: {
        visibility: 'PUBLIC',
        content_kind: 'poll',
        poll: {
          question: 'Best day to deploy to production?',
          options: ['Monday', 'Wednesday', 'Friday', 'Never on Friday'],
          duration: 'SEVEN_DAYS',
        },
      },
    }),
    media: [],
  },
  {
    id: 'multi_image',
    label: 'Multi-image',
    variant: v({
      post_type: 'multi_image',
      body: 'A few frames from the offsite. #team #design',
      media: [
        { media_id: 'med_i1' },
        { media_id: 'med_i2' },
        { media_id: 'med_i3' },
        { media_id: 'med_i4' },
      ],
      settings: { visibility: 'PUBLIC', content_kind: 'multi_image' },
    }),
    media: [
      readyImage('med_i1', 'photo-1469474968028-56623f02e42e'),
      readyImage('med_i2', 'photo-1501785888041-af3ef285b470'),
      readyImage('med_i3', 'photo-1470071459604-3b5ec3a7fe05'),
      readyImage('med_i4', 'photo-1444703686981-a3abbc4d4fe3'),
    ],
  },
  {
    id: 'processing',
    label: 'Processing',
    variant: v({
      post_type: 'single_image',
      body: 'New case study — the hero shot is still rendering.',
      media: [{ media_id: 'med_i1' }],
      settings: { visibility: 'PUBLIC', content_kind: 'single_image' },
    }),
    media: [processingAsset('med_i1')],
  },
  {
    id: 'empty',
    label: 'Empty',
    variant: v({
      body: '',
      settings: { visibility: 'PUBLIC', content_kind: 'text' },
    }),
    media: [],
  },
];

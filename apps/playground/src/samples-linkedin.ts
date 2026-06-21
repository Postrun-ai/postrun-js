import type { LinkedInPostVariant } from '@postrun/js';
import type { LinkedInPreviewAuthor, PreviewMedia } from '@preview/types';

/** LinkedIn preview fixtures — one per content_kind, shaped exactly like our Post
 * object (LinkedInPostVariant). */

export const author: LinkedInPreviewAuthor = {
  name: 'Acme Studio',
  headline: 'Design & engineering for ambitious teams',
  username: 'acmestudio',
  avatar_url:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  verified: true,
};

const LANDSCAPE = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&h=630&fit=crop`;
const SQUARE = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&h=800&fit=crop`;

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
  media: PreviewMedia[];
}

export const LI_SAMPLES: LiSample[] = [
  {
    id: 'article',
    label: 'Article',
    variant: v({
      post_type: 'text',
      body: 'Wrote up everything we learned shipping our preview SDK. The "match the real platform" rule changed how we build. 👇',
      settings: {
        visibility: 'PUBLIC',
        content_kind: 'article',
        article: {
          source: 'https://www.acme.com/blog/social-preview-playbook',
          title: 'The social preview playbook: match the platform, not the mock',
          description: 'Lessons from building pixel-faithful, compliant post previews.',
        },
      },
    }),
    media: [{ kind: 'image', url: LANDSCAPE('photo-1467232004584-a241de8bcf5d') }],
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
    id: 'document',
    label: 'Document',
    variant: v({
      post_type: 'single_image',
      body: 'Our Q3 investor update — the full deck is attached. 📊',
      media: [{ media_id: 'med_doc0000000000000000000' }],
      settings: {
        visibility: 'PUBLIC',
        content_kind: 'document',
        document: { title: 'Acme — Q3 Investor Update.pdf' },
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
      { kind: 'image', url: SQUARE('photo-1469474968028-56623f02e42e') },
      { kind: 'image', url: SQUARE('photo-1501785888041-af3ef285b470') },
      { kind: 'image', url: SQUARE('photo-1470071459604-3b5ec3a7fe05') },
      { kind: 'image', url: SQUARE('photo-1444703686981-a3abbc4d4fe3') },
    ],
  },
];

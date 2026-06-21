import type { XPostVariant } from '@postrun/js';
import type {
  PreviewMedia,
  XPreviewAuthor,
  XPreviewQuotedTweet,
} from '@preview/types';

/** X preview fixtures — shaped exactly like our Post object (XPostVariant). */

export const author: XPreviewAuthor = {
  name: 'Acme Studio',
  username: 'acmestudio',
  avatar_url:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  verified: true,
};

const PHOTO = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&h=800&fit=crop`;

const CONN = 'conn_x0000000000000000000';

function v(overrides: Partial<XPostVariant>): XPostVariant {
  return {
    platform: 'x',
    post_type: 'text',
    connection_id: CONN,
    body: '',
    media: [],
    settings: {},
    ...overrides,
  };
}

export interface XSample {
  id: string;
  label: string;
  variant: XPostVariant;
  media: PreviewMedia[];
  quotedTweet?: XPreviewQuotedTweet;
  replyToHandle?: string;
}

export const X_SAMPLES: XSample[] = [
  {
    id: 'text',
    label: 'Text',
    variant: v({
      body: 'Shipped the preview SDK today. Matching the real platform pixel-for-pixel beats a mock every time. More soon → https://postrun.ai #buildinpublic @acmestudio',
    }),
    media: [],
  },
  {
    id: 'image',
    label: 'Image',
    variant: v({
      post_type: 'single_image',
      body: 'Golden hour from the offsite 🌅',
      media: [{ media_id: 'med_x1' }],
    }),
    media: [{ kind: 'image', url: PHOTO('photo-1469474968028-56623f02e42e'), alt: 'Mountain vista' }],
  },
  {
    id: 'poll',
    label: 'Poll',
    variant: v({
      body: 'Hot take season — settle it for me:',
      settings: {
        poll: {
          options: ['Tabs', 'Spaces', 'Prettier decides'],
          duration_minutes: 1440,
        },
      },
    }),
    media: [],
  },
  {
    id: 'quote',
    label: 'Quote',
    variant: v({
      body: 'This is exactly right 👇',
      settings: { quote_tweet_id: '1700000000000000000' },
    }),
    media: [],
    quotedTweet: {
      author: { name: 'Jane Dev', username: 'janedev', avatar_url: null, verified: true },
      body: 'The best preview is the one that looks identical to the real thing.',
    },
  },
  {
    id: 'reply',
    label: 'Reply',
    variant: v({
      body: 'Totally agree — and the consent gate matters even more for compliance.',
      settings: { reply: { in_reply_to_tweet_id: '1700000000000000001' } },
    }),
    media: [],
    replyToHandle: 'janedev',
  },
];

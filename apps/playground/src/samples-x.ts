import type { MediaResource, XPostVariant } from '@postrun/js';
import type { PreviewConnection, XPreviewQuotedTweet } from '@preview/types';

import { conn, processingAsset, readyImage } from './samples-media';

/** X preview fixtures — shaped exactly like our Post object (XPostVariant). */

export const connection: PreviewConnection = conn({ platform: 'x' });

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
  /** Uploaded assets the compose variant resolves its ids against. */
  media: MediaResource[];
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
    media: [
      readyImage('med_x1', 'photo-1469474968028-56623f02e42e', 'Mountain vista'),
    ],
  },
  {
    id: 'processing',
    label: 'Processing',
    variant: v({
      post_type: 'single_image',
      body: 'Uploading the keynote clip…',
      media: [{ media_id: 'med_x1' }],
    }),
    // Attached but still transcoding → the honest processing tile.
    media: [processingAsset('med_x1')],
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
      name: 'Jane Dev',
      username: 'janedev',
      avatar_url: null,
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
  {
    id: 'empty',
    label: 'Empty',
    variant: v({ body: '' }),
    media: [],
  },
];

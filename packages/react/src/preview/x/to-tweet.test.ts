import type { XPostVariant } from '@postrun/js';
import { describe, expect, it } from 'vitest';

import type { ReadyMedia } from '../types';
import { toTweet } from './to-tweet';
import type { XAuthor } from './to-tweet';

const author: XAuthor = {
  name: 'Acme Studio',
  username: 'acmestudio',
  avatar_url: 'https://cdn.test/acme.png',
  verified: true,
};

/** Build a minimal valid X variant with typed settings, overridable per test. */
function xVariant(overrides: Partial<XPostVariant> = {}): XPostVariant {
  return {
    platform: 'x',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: {},
    ...overrides,
  };
}

const photo = (src: string, alt?: string): ReadyMedia => ({
  kind: 'image',
  state: 'ready',
  src,
  width: 1200,
  height: 800,
  alt,
});

describe('toTweet — author → user', () => {
  it('maps name, handle and avatar onto the tweet user', () => {
    const tweet = toTweet({ variant: xVariant(), author });

    expect(tweet.user.name).toBe('Acme Studio');
    expect(tweet.user.screen_name).toBe('acmestudio');
    expect(tweet.user.profile_image_url_https).toBe('https://cdn.test/acme.png');
  });

  it('shows the verified badge when author.verified is true', () => {
    const tweet = toTweet({ variant: xVariant(), author });
    expect(tweet.user.is_blue_verified).toBe(true);
  });

  it('omits the verified badge by default', () => {
    const tweet = toTweet({
      variant: xVariant(),
      author: { name: 'No Badge', username: 'nobadge', avatar_url: null },
    });
    expect(tweet.user.is_blue_verified).toBe(false);
  });

  it('falls back to a non-empty placeholder avatar when none is given', () => {
    const tweet = toTweet({
      variant: xVariant(),
      author: { name: 'No Avatar', username: 'noavatar', avatar_url: null },
    });
    expect(tweet.user.profile_image_url_https.length).toBeGreaterThan(0);
  });
});

describe('toTweet — body → text + entities', () => {
  it('maps the variant body to the tweet text', () => {
    const tweet = toTweet({
      variant: xVariant({ body: 'shipping day' }),
      author,
    });
    expect(tweet.text).toBe('shipping day');
  });

  it('extracts hashtags into entities', () => {
    const tweet = toTweet({
      variant: xVariant({ body: 'launch #buildinpublic' }),
      author,
    });
    expect(tweet.entities?.hashtags.map((h) => h.text)).toEqual([
      'buildinpublic',
    ]);
  });

  it('treats a missing body as empty text', () => {
    const tweet = toTweet({
      variant: xVariant({ body: undefined }),
      author,
    });
    expect(tweet.text).toBe('');
  });

  it('sets display_text_range in codepoints (astral-safe), not UTF-16 units', () => {
    const body = 'hi 🙌 there'; // 9 codepoints, 10 UTF-16 units
    const tweet = toTweet({ variant: xVariant({ body }), author });
    expect(tweet.display_text_range).toEqual([0, Array.from(body).length]);
  });
});

describe('toTweet — media', () => {
  it('produces no mediaDetails for a text post with no media', () => {
    const tweet = toTweet({ variant: xVariant(), author });
    expect(tweet.mediaDetails ?? []).toHaveLength(0);
  });

  it('maps a single image to one photo mediaDetail', () => {
    const tweet = toTweet({
      variant: xVariant(),
      author,
      media: [photo('https://cdn.test/a.jpg', 'a cat')],
    });

    expect(tweet.mediaDetails).toHaveLength(1);
    const detail = tweet.mediaDetails![0]!;
    expect(detail.type).toBe('photo');
    expect(detail.media_url_https).toBe('https://cdn.test/a.jpg');
  });

  it('maps multiple images preserving order', () => {
    const tweet = toTweet({
      variant: xVariant(),
      author,
      media: [
        photo('https://cdn.test/1.jpg'),
        photo('https://cdn.test/2.jpg'),
        photo('https://cdn.test/3.jpg'),
      ],
    });

    expect(tweet.mediaDetails?.map((m) => m.media_url_https)).toEqual([
      'https://cdn.test/1.jpg',
      'https://cdn.test/2.jpg',
      'https://cdn.test/3.jpg',
    ]);
  });

  it('maps a video to a video mediaDetail carrying the source variant', () => {
    const tweet = toTweet({
      variant: xVariant(),
      author,
      media: [
        {
          kind: 'video',
          state: 'ready',
          src: 'https://cdn.test/clip.mp4',
          width: 1280,
          height: 720,
        },
      ],
    });

    const detail = tweet.mediaDetails![0]!;
    expect(detail.type).toBe('video');
    expect(detail.type === 'video' && detail.video_info.variants[0]?.url).toBe(
      'https://cdn.test/clip.mp4',
    );
  });
});

describe('toTweet — quote tweet', () => {
  it('builds the quoted card from the quotedTweet content', () => {
    const tweet = toTweet({
      variant: xVariant({ settings: { quote_tweet_id: '123' } }),
      author,
      quotedTweet: {
        author: { name: 'Quoted Co', username: 'quotedco', avatar_url: null },
        body: 'original take',
      },
    });

    expect(tweet.quoted_tweet?.text).toBe('original take');
    expect(tweet.quoted_tweet?.user.name).toBe('Quoted Co');
  });

  it('renders a placeholder quoted card when only the id is known', () => {
    const tweet = toTweet({
      variant: xVariant({ settings: { quote_tweet_id: '123' } }),
      author,
    });
    expect(tweet.quoted_tweet).toBeDefined();
  });

  it('has no quoted card when there is no quote', () => {
    const tweet = toTweet({ variant: xVariant(), author });
    expect(tweet.quoted_tweet).toBeUndefined();
  });
});

describe('toTweet — reply context', () => {
  it('sets the reply screen name when a reply and handle are present', () => {
    const tweet = toTweet({
      variant: xVariant({ settings: { reply: { in_reply_to_tweet_id: '99' } } }),
      author,
      replyToHandle: 'someone',
    });
    expect(tweet.in_reply_to_screen_name).toBe('someone');
  });

  it('omits reply context when the parent handle is unknown', () => {
    const tweet = toTweet({
      variant: xVariant({ settings: { reply: { in_reply_to_tweet_id: '99' } } }),
      author,
    });
    expect(tweet.in_reply_to_screen_name).toBeUndefined();
  });

  it('sets the parent status id so the reply link is a real URL, not /status/undefined', () => {
    const tweet = toTweet({
      variant: xVariant({ settings: { reply: { in_reply_to_tweet_id: '99' } } }),
      author,
      replyToHandle: 'someone',
    });
    expect(tweet.in_reply_to_status_id_str).toBe('99');
  });
});

describe('toTweet — honesty (no fabricated metrics)', () => {
  it('reports zero engagement and identifies as a Tweet', () => {
    const tweet = toTweet({ variant: xVariant({ body: 'hi' }), author });
    expect(tweet.__typename).toBe('Tweet');
    expect(tweet.favorite_count).toBe(0);
    expect(tweet.conversation_count).toBe(0);
  });
});

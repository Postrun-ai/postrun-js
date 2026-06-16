import twitterText from 'twitter-text';
import type { TweetEntities } from 'react-tweet/api';

// twitter-text's ESM entry exposes a single default object (no named exports),
// so a default import is the only form that resolves across bundlers — named
// imports compile under @types but break in esbuild/rollup at the consumer.
const {
  extractCashtagsWithIndices,
  extractHashtagsWithIndices,
  extractMentionsWithIndices,
  extractUrlsWithIndices,
} = twitterText;

/**
 * Extract the X text entities (hashtags, @mentions, URLs, $cashtags) from a post
 * body, in the shape `react-tweet`'s `enrichTweet` consumes to rebuild the rich
 * body. Indices come straight from `twitter-text` — the reference implementation
 * X itself uses — so highlighting matches the real platform exactly (Unicode,
 * punctuation boundaries, and all). We never hand-roll the parsing.
 *
 * Fields X's syndication payload carries that a compose-time preview cannot know
 * (a mention's numeric `id_str` / display `name`) are filled with honest stand-ins
 * (`screen_name`), which is all the renderer needs to draw the entity.
 */
export function extractEntities(text: string): TweetEntities {
  const hashtags = extractHashtagsWithIndices(text).map((h) => ({
    text: h.hashtag,
    indices: h.indices,
  }));

  const user_mentions = extractMentionsWithIndices(text).map((m) => ({
    id_str: '',
    name: m.screenName,
    screen_name: m.screenName,
    indices: m.indices,
  }));

  const urls = extractUrlsWithIndices(text).map((u) => ({
    display_url: u.url,
    expanded_url: u.url,
    url: u.url,
    indices: u.indices,
  }));

  const symbols = extractCashtagsWithIndices(text).map((c) => ({
    text: c.cashtag,
    indices: c.indices,
  }));

  return { hashtags, urls, user_mentions, symbols };
}

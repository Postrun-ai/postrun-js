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
  modifyIndicesFromUTF16ToUnicode,
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
  const hashtags = extractHashtagsWithIndices(text);
  const mentions = extractMentionsWithIndices(text);
  const urls = extractUrlsWithIndices(text);
  const cashtags = extractCashtagsWithIndices(text);

  // twitter-text's regex indices are UTF-16; react-tweet slices `Array.from(text)`
  // (codepoint-aware), so convert in place — otherwise any astral char (emoji)
  // before an entity shifts every later highlight. Converting one combined array
  // keeps the per-list references in sync (the helper mutates `.indices`).
  modifyIndicesFromUTF16ToUnicode(text, [
    ...hashtags,
    ...mentions,
    ...urls,
    ...cashtags,
  ]);

  return {
    hashtags: hashtags.map((h) => ({ text: h.hashtag, indices: h.indices })),
    user_mentions: mentions.map((m) => ({
      id_str: '',
      name: m.screenName,
      screen_name: m.screenName,
      indices: m.indices,
    })),
    urls: urls.map((u) => ({
      display_url: u.url,
      expanded_url: u.url,
      url: u.url,
      indices: u.indices,
    })),
    symbols: cashtags.map((c) => ({ text: c.cashtag, indices: c.indices })),
  };
}

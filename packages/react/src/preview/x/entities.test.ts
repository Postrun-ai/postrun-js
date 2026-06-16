import { describe, expect, it } from 'vitest';

import { extractEntities } from './entities';

/** Slicing the original text by an entity's indices must yield that entity's
 * raw token — that is exactly how react-tweet's `enrichTweet` reconstructs the
 * rich body, so correct indices are the whole point of this module. */
function sliceByIndices(text: string, [start, end]: [number, number]): string {
  return text.slice(start, end);
}

describe('extractEntities', () => {
  it('extracts a hashtag with text and slice-accurate indices', () => {
    const text = 'launch day #buildinpublic';
    const entities = extractEntities(text);

    expect(entities.hashtags).toHaveLength(1);
    expect(entities.hashtags[0]?.text).toBe('buildinpublic');
    expect(sliceByIndices(text, entities.hashtags[0]!.indices)).toBe(
      '#buildinpublic',
    );
  });

  it('extracts an @mention with screen_name and slice-accurate indices', () => {
    const text = 'cc @acmestudio nice work';
    const entities = extractEntities(text);

    expect(entities.user_mentions).toHaveLength(1);
    expect(entities.user_mentions[0]?.screen_name).toBe('acmestudio');
    expect(sliceByIndices(text, entities.user_mentions[0]!.indices)).toBe(
      '@acmestudio',
    );
  });

  it('extracts a url with display/expanded set and slice-accurate indices', () => {
    const text = 'read more at https://postrun.ai/docs';
    const entities = extractEntities(text);

    expect(entities.urls).toHaveLength(1);
    const url = entities.urls[0]!;
    expect(url.expanded_url).toBe('https://postrun.ai/docs');
    expect(sliceByIndices(text, url.indices)).toBe('https://postrun.ai/docs');
  });

  it('extracts a $cashtag as a symbol', () => {
    const text = 'bullish on $TSLA';
    const entities = extractEntities(text);

    expect(entities.symbols).toHaveLength(1);
    expect(entities.symbols[0]?.text).toBe('TSLA');
  });

  it('reports codepoint indices so highlighting survives astral chars (emoji)', () => {
    // react-tweet slices `Array.from(text)` (codepoint-aware), so indices must be
    // in codepoints, not UTF-16 units. An emoji before the hashtag is 2 UTF-16
    // units but 1 codepoint — the index must account for that.
    const text = 'ship it 🙌 #launch';
    const codepoints = Array.from(text);
    const entities = extractEntities(text);

    expect(entities.hashtags).toHaveLength(1);
    const [start, end] = entities.hashtags[0]!.indices;
    expect(codepoints.slice(start, end).join('')).toBe('#launch');
  });

  it('returns empty entity arrays for plain text', () => {
    const entities = extractEntities('just some plain words');

    expect(entities.hashtags).toEqual([]);
    expect(entities.urls).toEqual([]);
    expect(entities.user_mentions).toEqual([]);
    expect(entities.symbols).toEqual([]);
  });
});

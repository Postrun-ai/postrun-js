import { describe, expect, it } from 'vitest';

import { linkedinPollDurationLabel } from './linkedin';
import type { LinkedInPollDuration } from './linkedin';

/**
 * `linkedinPollDurationLabel` — the pure presentation helper mapping the closed
 * poll-duration union (derived from the contract) to a short human label for the
 * poll card. Exhaustive, no `default` branch, so a new duration upstream is a
 * compile error rather than a silent raw enum render.
 */
describe('linkedinPollDurationLabel', () => {
  it.each([
    ['ONE_DAY', '1 day left'],
    ['THREE_DAYS', '3 days left'],
    ['SEVEN_DAYS', '1 week left'],
    ['FOURTEEN_DAYS', '2 weeks left'],
  ] satisfies [LinkedInPollDuration, string][])(
    'labels %s as "%s"',
    (value, label) => {
      expect(linkedinPollDurationLabel(value)).toBe(label);
    },
  );
});

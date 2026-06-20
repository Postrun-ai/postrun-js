import { describe, expect, it } from 'vitest';

import { xPollDurationLabel } from './x';

/**
 * `xPollDurationLabel` — the pure helper that turns an X poll's `duration_minutes`
 * (5–10080) into the "time left" label the poll card shows. Floors to the
 * coarsest sensible unit and pluralizes.
 */
describe('xPollDurationLabel', () => {
  it.each([
    [5, '5 minutes left'],
    [1, '1 minute left'],
    [60, '1 hour left'],
    [150, '2 hours left'],
    [1440, '1 day left'],
    [10080, '7 days left'],
  ] satisfies [number, string][])('labels %i min as "%s"', (mins, label) => {
    expect(xPollDurationLabel(mins)).toBe(label);
  });
});

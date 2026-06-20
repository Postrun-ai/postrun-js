import type { LinkedInPostVariant } from './resources';

/**
 * One LinkedIn poll duration — DERIVED from the contract (the poll `duration`
 * field), never hand-listed, so it can't drift from the API shape.
 */
export type LinkedInPollDuration = NonNullable<
  NonNullable<LinkedInPostVariant['settings']>['poll']
>['duration'];

/**
 * Map a poll duration to the short "time left" label LinkedIn shows on the poll
 * card — the presentation the wire keeps enum-only. Exhaustive over the closed
 * union with no `default` branch, so adding a duration upstream surfaces as a
 * compile error here rather than silently rendering a raw enum string.
 */
export function linkedinPollDurationLabel(value: LinkedInPollDuration): string {
  switch (value) {
    case 'ONE_DAY':
      return '1 day left';
    case 'THREE_DAYS':
      return '3 days left';
    case 'SEVEN_DAYS':
      return '1 week left';
    case 'FOURTEEN_DAYS':
      return '2 weeks left';
  }
}

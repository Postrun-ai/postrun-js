import type { XPostVariant } from './resources';

/** An X poll's settings shape — DERIVED from the contract, never re-declared. */
export type XPoll = NonNullable<
  NonNullable<XPostVariant['settings']>['poll']
>;

/** `n unit left`, pluralizing the unit. */
function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'} left`;
}

/**
 * Turn an X poll's `duration_minutes` (5–10080, i.e. 5 min – 7 days) into the
 * "time left" label the poll card shows, floored to the coarsest sensible unit
 * (days ≥ 1 day, else hours ≥ 1 hour, else minutes). Pure — pin it in tests.
 */
export function xPollDurationLabel(durationMinutes: number): string {
  if (durationMinutes >= 1440) {
    return plural(Math.floor(durationMinutes / 1440), 'day');
  }
  if (durationMinutes >= 60) {
    return plural(Math.floor(durationMinutes / 60), 'hour');
  }
  return plural(durationMinutes, 'minute');
}

import { describe, expect, it } from 'vitest';

import { conversionEventSchema } from './conversions';

const base = {
  event_timestamp: '2026-06-21T14:32:00Z',
  event_source: 'WEB' as const,
};

describe('conversionEventSchema — match signal (the API superRefine)', () => {
  it('accepts an event with a gclid', () => {
    expect(
      conversionEventSchema.safeParse({ ...base, gclid: 'abc' }).success,
    ).toBe(true);
  });

  it('accepts an event with a gbraid or wbraid', () => {
    expect(
      conversionEventSchema.safeParse({ ...base, gbraid: 'g' }).success,
    ).toBe(true);
    expect(
      conversionEventSchema.safeParse({ ...base, wbraid: 'w' }).success,
    ).toBe(true);
  });

  it('accepts an event matched by user_data (email)', () => {
    expect(
      conversionEventSchema.safeParse({
        ...base,
        user_data: [{ email_address: 'jane@example.com' }],
      }).success,
    ).toBe(true);
  });

  it('rejects an event with NO match signal', () => {
    const result = conversionEventSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /match signal/i.test(i.message))).toBe(
        true,
      );
    }
  });
});

describe('conversionEventSchema — user_data one-of (the API refine)', () => {
  it('rejects a user_data identifier with none of email/phone/address', () => {
    const result = conversionEventSchema.safeParse({
      ...base,
      user_data: [{}],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join('.') === 'user_data.0'),
      ).toBe(true);
    }
  });

  it('accepts a phone-only identifier', () => {
    expect(
      conversionEventSchema.safeParse({
        ...base,
        user_data: [{ phone_number: '+15551234567' }],
      }).success,
    ).toBe(true);
  });
});

describe('conversionEventSchema — event_timestamp offset (bug #1)', () => {
  it('accepts a UTC Z timestamp', () => {
    expect(
      conversionEventSchema.safeParse({ ...base, gclid: 'x' }).success,
    ).toBe(true);
  });

  it('accepts an explicit timezone offset', () => {
    expect(
      conversionEventSchema.safeParse({
        event_timestamp: '2026-06-21T14:32:00-04:00',
        event_source: 'WEB',
        gclid: 'x',
      }).success,
    ).toBe(true);
  });

  it('rejects a timestamp with no timezone at all', () => {
    expect(
      conversionEventSchema.safeParse({
        event_timestamp: '2026-06-21T14:32:00',
        event_source: 'WEB',
        gclid: 'x',
      }).success,
    ).toBe(false);
  });
});

describe('conversionEventSchema — base field rules still apply', () => {
  it('rejects a missing event_source', () => {
    expect(
      conversionEventSchema.safeParse({
        event_timestamp: '2026-06-21T14:32:00Z',
        gclid: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects a negative conversion_value', () => {
    expect(
      conversionEventSchema.safeParse({
        ...base,
        gclid: 'x',
        conversion_value: -1,
      }).success,
    ).toBe(false);
  });
});

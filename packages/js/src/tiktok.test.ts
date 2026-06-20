import { describe, expect, it } from 'vitest';

import type { TikTokPrivacyLevel } from './resources';
import { tiktokPrivacyLabel } from './tiktok';

/**
 * `tiktokPrivacyLabel` — the pure presentation helper that maps a closed
 * `TikTokPrivacyLevel` to a short human label for the composer's privacy
 * dropdown. Labels live in the SDK (the wire stays typed, label-free).
 */
describe('tiktokPrivacyLabel', () => {
  it.each([
    ['PUBLIC_TO_EVERYONE', 'Everyone'],
    ['MUTUAL_FOLLOW_FRIENDS', 'Friends'],
    ['FOLLOWER_OF_CREATOR', 'Followers'],
    ['SELF_ONLY', 'Only you'],
  ] satisfies [TikTokPrivacyLevel, string][])(
    'labels %s as "%s"',
    (value, label) => {
      expect(tiktokPrivacyLabel(value)).toBe(label);
    },
  );
});

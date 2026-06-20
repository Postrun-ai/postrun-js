import type { TikTokPrivacyLevel } from './resources';

/**
 * Map a TikTok privacy level to a short, human label for the composer's privacy
 * dropdown — the presentation the API deliberately keeps OFF the wire (the
 * `creator-info` response returns the typed `privacy_options`; the SDK owns how
 * they read).
 *
 * Exhaustive over the closed `TikTokPrivacyLevel` union with no `default` branch,
 * so adding a TikTok privacy level upstream surfaces as a compile error here
 * rather than silently rendering a raw enum string.
 */
export function tiktokPrivacyLabel(value: TikTokPrivacyLevel): string {
  switch (value) {
    case 'PUBLIC_TO_EVERYONE':
      return 'Everyone';
    case 'MUTUAL_FOLLOW_FRIENDS':
      return 'Friends';
    case 'FOLLOWER_OF_CREATOR':
      return 'Followers';
    case 'SELF_ONLY':
      return 'Only you';
  }
}

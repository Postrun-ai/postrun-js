import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiShare,
} from 'react-icons/fi';

/**
 * A static, honest action row for the X preview: reply, repost, like, views, and
 * share — real Feather icons (via react-icons), NO fabricated counts and no
 * outbound links (a draft hasn't been engaged with). We render our own row rather
 * than react-tweet's `TweetActions` because that one prints a `0` like-count,
 * which would be a lie on an unpublished post.
 *
 * Color inherits react-tweet's CSS variable, so it matches the card in light and
 * dark and restyles with the same variable the rest of the card uses.
 */

const ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  maxWidth: 425,
  marginTop: 12,
  color: 'var(--tweet-color-gray-secondary, #536471)',
};

const ACTIONS: { label: string; Icon: IconType }[] = [
  { label: 'Reply', Icon: FiMessageCircle },
  { label: 'Repost', Icon: FiRepeat },
  { label: 'Like', Icon: FiHeart },
  { label: 'Views', Icon: FiBarChart2 },
  { label: 'Share', Icon: FiShare },
];

export function XPreviewActions() {
  return (
    <div style={ROW}>
      {ACTIONS.map(({ label, Icon }) => (
        <Icon key={label} size={18} aria-label={label} role="img" />
      ))}
    </div>
  );
}

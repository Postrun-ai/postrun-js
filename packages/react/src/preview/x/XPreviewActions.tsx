import type { CSSProperties } from 'react';

/**
 * A static, honest action row for the preview: the authentic X icons (reply,
 * repost, like, views, share) with NO fabricated counts and no outbound links —
 * a draft hasn't been engaged with. We render our own row rather than
 * react-tweet's `TweetActions` because that one prints a `0` like-count, which
 * would be a lie on an unpublished post.
 *
 * Colors inherit react-tweet's CSS variables (`--tweet-color-blue-secondary`,
 * etc.), so it matches the card in both light and dark themes and restyles with
 * the same variables the rest of the card uses.
 */

const ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  maxWidth: 425,
  marginTop: 12,
  color: 'var(--tweet-color-gray-secondary, #536471)',
};

const ICON: CSSProperties = {
  width: 18,
  height: 18,
  fill: 'currentColor',
};

const PATHS = {
  reply:
    'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z',
  repost:
    'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  like: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.667-1.84-2.908-1.91z',
  views:
    'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
  share:
    'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z',
};

function ActionIcon({ label, path }: { label: string; path: string }) {
  return (
    <svg viewBox="0 0 24 24" style={ICON} aria-label={label} role="img">
      <path d={path} />
    </svg>
  );
}

export function XPreviewActions() {
  return (
    <div style={ROW} aria-hidden={false}>
      <ActionIcon label="Reply" path={PATHS.reply} />
      <ActionIcon label="Repost" path={PATHS.repost} />
      <ActionIcon label="Like" path={PATHS.like} />
      <ActionIcon label="Views" path={PATHS.views} />
      <ActionIcon label="Share" path={PATHS.share} />
    </div>
  );
}

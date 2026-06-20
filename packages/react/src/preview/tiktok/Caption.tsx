import type { CSSProperties } from 'react';

/**
 * The post description as TikTok renders it over the media: plain white body with
 * #hashtags and @mentions tinted in TikTok's link color. Clamped to two lines in
 * the card overlay (TikTok shows a "more" fold; the full text lives in the
 * editable caption field, a later chunk).
 */

/** TikTok's description link color for hashtags/mentions. */
const LINK_COLOR = '#8ab4ff';

/** Split on hashtags/mentions, keeping the delimiters so they can be tinted. */
const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu;
/** Non-global twin for per-part testing (avoids `lastIndex` statefulness). */
const IS_TOKEN = /^[#@][\p{L}\p{N}_.]+$/u;

export function Caption({ body }: { body: string }) {
  const parts = body.split(TOKEN);

  return (
    <div style={captionStyle}>
      {parts.map((part, i) =>
        IS_TOKEN.test(part) ? (
          <span key={i} style={{ color: LINK_COLOR }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}

const captionStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

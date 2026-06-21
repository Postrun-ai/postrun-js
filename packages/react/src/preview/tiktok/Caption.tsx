'use client';

import type { CSSProperties } from 'react';

import { ExpandableText } from '../ExpandableText';

/**
 * The post description as TikTok renders it over the media: plain white body with
 * #hashtags and @mentions tinted in TikTok's link color, line breaks preserved.
 * Clamps to two lines with a shared "more"/"less" fold that expands to the FULL
 * caption (no inner scrollbar) — so the reviewer can read the entire to-be-posted
 * content in the preview (TikTok Required UX §5a). The full text is also always in
 * the editable caption field.
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
    <ExpandableText lines={2} toggleColor="rgba(255,255,255,0.82)" style={wrapStyle}>
      {parts.map((part, i) =>
        IS_TOKEN.test(part) ? (
          <span key={i} style={{ color: LINK_COLOR }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </ExpandableText>
  );
}

const wrapStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
};

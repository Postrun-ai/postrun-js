'use client';

import type { CSSProperties } from 'react';

import { ExpandableText } from '../ExpandableText';

/**
 * The post description as TikTok renders it over the media: plain white body with
 * #hashtags and @mentions tinted in TikTok's link color, line breaks preserved.
 * Folds at two lines with the shared "… more" that expands to the FULL
 * caption (no inner scrollbar) — so the reviewer can read the entire to-be-posted
 * content in the preview (nothing is hidden from the reviewer). The full text is also always in
 * the editable caption field.
 */

/** TikTok's description link color for hashtags/mentions. */
const LINK_COLOR = '#8ab4ff';

/** Split on hashtags/mentions, keeping the delimiters so they can be tinted. */
const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu;
/** Non-global twin for per-part testing (avoids `lastIndex` statefulness). */
const IS_TOKEN = /^[#@][\p{L}\p{N}_.]+$/u;

export function Caption({ body }: { body: string }) {
  return (
    <ExpandableText
      text={body}
      render={highlight}
      lines={2}
      toggleColor="rgba(255,255,255,0.82)"
      style={wrapStyle}
    />
  );
}

function highlight(text: string) {
  return text.split(TOKEN).map((part, i) =>
    IS_TOKEN.test(part) ? (
      <span key={i} style={{ color: LINK_COLOR }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const wrapStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
};

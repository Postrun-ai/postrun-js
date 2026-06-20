'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * The post description as TikTok renders it over the media: plain white body with
 * #hashtags and @mentions tinted in TikTok's link color, line breaks preserved.
 *
 * Collapsed it clamps to two lines with a "more" toggle (TikTok's pattern); when
 * the text overflows, the FULL caption is always reachable — "more" expands it
 * and a long caption scrolls within the card. This guarantees the reviewer can
 * read the entire to-be-posted content in the preview (TikTok Required UX §5a),
 * never silently truncated. The full text is also always in the editable caption
 * field.
 */

/** TikTok's description link color for hashtags/mentions. */
const LINK_COLOR = '#8ab4ff';

/** Split on hashtags/mentions, keeping the delimiters so they can be tinted. */
const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu;
/** Non-global twin for per-part testing (avoids `lastIndex` statefulness). */
const IS_TOKEN = /^[#@][\p{L}\p{N}_.]+$/u;

export function Caption({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Detect whether the clamped text actually overflows (so "more" only shows
  // when there's hidden content). Re-measures on body/collapse changes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) {
      return;
    }
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [body, expanded]);

  const parts = body.split(TOKEN);

  return (
    <div style={wrapStyle}>
      <div ref={ref} style={expanded ? expandedTextStyle : clampedTextStyle}>
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
      {overflowing || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse caption' : 'Expand caption'}
          onClick={() => setExpanded((v) => !v)}
          style={moreStyle}
        >
          {expanded ? 'less' : 'more'}
        </button>
      ) : null}
    </div>
  );
}

const wrapStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
};

const clampedTextStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const expandedTextStyle: CSSProperties = {
  maxHeight: 180,
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overscrollBehavior: 'contain',
};

const moreStyle: CSSProperties = {
  display: 'inline-block',
  marginTop: 2,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'rgba(255,255,255,0.82)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

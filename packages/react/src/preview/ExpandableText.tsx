'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * The shared caption fold every preview card uses, so "more"/"less" behaves and
 * looks identical across X*, LinkedIn, Instagram, and TikTok. Collapsed it clamps
 * to `lines` (the platform's native fold depth); "more" expands to the FULL text
 * — no inner scrollbar, no max-height (the old TikTok behavior). "less" collapses
 * again. The toggle only appears when the text actually overflows.
 *
 * Callers pass already-rendered content (username prefix, entity highlighting,
 * hashtag colors) as `children`; this owns only the clamp + toggle.
 *
 * *X renders its body via react-tweet and keeps that card's native fold.
 */
export function ExpandableText({
  children,
  lines = 2,
  toggleColor,
  style,
}: {
  children: ReactNode;
  /** Lines shown before the fold (platform-native: IG/TikTok 2, LinkedIn 3). */
  lines?: number;
  /** Color of the "more"/"less" toggle. Defaults to inheriting the text color. */
  toggleColor?: string;
  style?: CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) {
      return;
    }
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [expanded, children]);

  const textStyle: CSSProperties = expanded
    ? FULL
    : { ...FULL, ...clampStyle(lines) };

  return (
    <div style={style}>
      <div ref={ref} style={textStyle}>
        {children}
      </div>
      {overflowing || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less' : 'Show more'}
          onClick={() => setExpanded((v) => !v)}
          style={{ ...toggleStyle, color: toggleColor ?? 'inherit' }}
        >
          {expanded ? 'less' : 'more'}
        </button>
      ) : null}
    </div>
  );
}

const FULL: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

function clampStyle(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

const toggleStyle: CSSProperties = {
  display: 'inline-block',
  marginTop: 2,
  padding: 0,
  border: 0,
  background: 'transparent',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
};

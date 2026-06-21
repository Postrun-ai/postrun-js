'use client';

import { Fragment, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * The LinkedIn post body: entity-highlighted text with the platform's faithful
 * "…more" fold. LinkedIn truncates a long post to a few lines with an inline
 * "…more" toggle; we mirror that. Hashtags, URLs, and supplied @mention names
 * render in the accent color, exactly as they appear in-feed.
 */

/** Roughly the in-feed fold point — long posts collapse here behind "…more". */
const FOLD_CHARS = 200;

export interface PostBodyColors {
  accent: string;
  muted: string;
}

export interface PostBodyProps {
  text: string;
  /** Names to highlight as @mentions (from `settings.mentions[].name`). */
  mentionNames?: readonly string[];
  colors: PostBodyColors;
}

const BODY_STYLE: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: 14,
  lineHeight: 1.43,
};

/** Truncate to at most `max` characters, backing up to the last word boundary. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : max);
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build the tokenizer: hashtags, URLs, then any supplied mention names. */
function buildPattern(mentionNames: readonly string[]): RegExp {
  const mentionAlt = mentionNames
    .filter((name) => name.trim().length > 0)
    .map(escapeRegExp)
    .join('|');
  const parts = [
    'https?:\\/\\/[^\\s]+', // urls
    '#[\\p{L}\\p{N}_]+', // hashtags (unicode-aware)
    ...(mentionAlt ? [mentionAlt] : []),
  ];
  return new RegExp(`(${parts.join('|')})`, 'gu');
}

function linkStyle(color: string): CSSProperties {
  return { color, textDecoration: 'none', fontWeight: 500 };
}

/** Split text into plain runs and highlighted entity nodes. */
function linkify(
  text: string,
  colors: PostBodyColors,
  mentionNames: readonly string[],
): ReactNode[] {
  const pattern = buildPattern(mentionNames);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>,
      );
    }
    if (token.startsWith('http')) {
      nodes.push(
        <a
          key={key++}
          href={token}
          style={linkStyle(colors.accent)}
          target="_blank"
          rel="noreferrer"
        >
          {token}
        </a>,
      );
    } else if (token.startsWith('#')) {
      nodes.push(
        // Preview-only hashtag: no real destination, so prevent the host SPA from
        // navigating / scrolling to top on click.
        <a
          key={key++}
          href="#"
          style={linkStyle(colors.accent)}
          onClick={(e) => e.preventDefault()}
        >
          {token}
        </a>,
      );
    } else {
      nodes.push(
        <span key={key++} style={linkStyle(colors.accent)}>
          {token}
        </span>,
      );
    }
    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

export function PostBody({ text, mentionNames = [], colors }: PostBodyProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > FOLD_CHARS;
  const shown = isLong && !expanded ? truncateAtWord(text, FOLD_CHARS) : text;

  // Recompute the entity-highlighted nodes only when the rendered text/colors/
  // mentions change — not on every parent re-render.
  const nodes = useMemo(
    () => linkify(shown, colors, mentionNames),
    [shown, colors, mentionNames],
  );

  const toggleStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: colors.muted,
    fontWeight: 600,
    fontSize: 14,
  };

  return (
    <div style={BODY_STYLE}>
      {nodes}
      {isLong ? (
        <>
          {!expanded ? '… ' : ' '}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            style={toggleStyle}
          >
            {expanded ? 'see less' : 'more'}
          </button>
        </>
      ) : null}
    </div>
  );
}

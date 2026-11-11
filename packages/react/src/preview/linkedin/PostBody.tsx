'use client';

import { Fragment } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { ExpandableText } from '../ExpandableText';

/**
 * The LinkedIn post body: entity-highlighted text folded at LinkedIn's three
 * lines behind an inline "… more". Hashtags, URLs, and supplied @mention names
 * render in the accent color, exactly as they appear in-feed.
 */

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
  fontSize: 14,
  lineHeight: 1.43,
};

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
  return (
    <ExpandableText
      text={text}
      render={(shown) => linkify(shown, colors, mentionNames)}
      lines={3}
      lessLabel="see less"
      toggleColor={colors.muted}
      style={BODY_STYLE}
    />
  );
}

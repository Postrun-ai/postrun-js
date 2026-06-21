'use client';

import type { CSSProperties } from 'react';

import { ExpandableText } from '../ExpandableText';
import { IG_VAR, varRef } from './theme';

/**
 * The Instagram caption: a bold `username` prefix then the body, with #hashtags
 * and @mentions in the link color. Clamped to two lines with the shared
 * "more"/"less" fold (expands to the full caption, no inner scrollbar).
 */

const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu;
const IS_TOKEN = /^[#@][\p{L}\p{N}_.]+$/u;

export function Caption({
  username,
  body,
}: {
  /** Author handle (`Connection.username`, nullable). Omitted when absent. */
  username: string | null;
  body: string;
}) {
  const parts = body.split(TOKEN);

  return (
    <ExpandableText
      lines={2}
      toggleColor={varRef(IG_VAR.muted)}
      style={wrapStyle}
    >
      {username ? <span style={{ fontWeight: 600 }}>{username} </span> : null}
      {parts.map((part, i) =>
        IS_TOKEN.test(part) ? (
          <span key={i} style={{ color: varRef(IG_VAR.accent) }}>
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
  padding: '4px 12px 0',
  fontSize: 14,
  lineHeight: 1.4,
  color: varRef(IG_VAR.text),
};

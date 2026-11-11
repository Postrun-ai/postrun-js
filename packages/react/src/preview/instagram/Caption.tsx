'use client';

import type { CSSProperties } from 'react';

import { ExpandableText } from '../ExpandableText';
import { IG_VAR, varRef } from './theme';

/**
 * The Instagram caption: a bold `username` prefix then the body, with #hashtags
 * and @mentions in the link color, folded at two lines by the shared "… more".
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
  const prefix = username ? `${username} ` : '';

  return (
    <ExpandableText
      text={prefix + body}
      render={(shown) => (
        <>
          {prefix ? (
            <span style={{ fontWeight: 600 }}>{shown.slice(0, prefix.length)}</span>
          ) : null}
          {highlight(shown.slice(prefix.length))}
        </>
      )}
      lines={2}
      toggleColor={varRef(IG_VAR.muted)}
      style={wrapStyle}
    />
  );
}

function highlight(text: string) {
  return text.split(TOKEN).map((part, i) =>
    IS_TOKEN.test(part) ? (
      <span key={i} style={{ color: varRef(IG_VAR.accent) }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const wrapStyle: CSSProperties = {
  padding: '4px 12px 0',
  fontSize: 14,
  lineHeight: 1.4,
  color: varRef(IG_VAR.text),
};

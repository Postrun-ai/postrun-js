import type { CSSProperties } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';

import type { InstagramPreviewAuthor } from '../types';
import { IG_VAR, varRef } from './theme';

/**
 * The Instagram post header: avatar, username (+ optional verified seal), an
 * optional collaborators line ("with @c1, @c2"), and the overflow "⋯". Identity
 * is SDK-driven (`InstagramPreviewAuthor` derives from `Connection`); `verified`
 * is the one presentation extra our API doesn't store.
 */

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
      '<circle cx="16" cy="16" r="16" fill="#b3b3b3"/></svg>',
  );

export function Header({
  author,
  collaborators,
}: {
  author: InstagramPreviewAuthor;
  collaborators: readonly string[];
}) {
  return (
    <div style={rowStyle}>
      <img
        src={author.avatar_url ?? PLACEHOLDER_AVATAR}
        alt=""
        width={32}
        height={32}
        style={avatarStyle}
      />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={nameStyle}>
          {author.username ?? ''}
          {author.verified ? (
            <MdVerified
              size={13}
              aria-label="Verified"
              role="img"
              style={{ color: '#3897f0', marginLeft: 3, flex: '0 0 auto' }}
            />
          ) : null}
        </span>
        {collaborators.length > 0 ? (
          <span style={collabStyle}>
            with {collaborators.map((c) => `@${c}`).join(', ')}
          </span>
        ) : null}
      </div>
      <FiMoreHorizontal
        size={18}
        aria-hidden
        style={{ marginLeft: 'auto', color: varRef(IG_VAR.text) }}
      />
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
};

const avatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  objectFit: 'cover',
  flex: '0 0 auto',
};

const nameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: varRef(IG_VAR.text),
  lineHeight: 1.2,
};

const collabStyle: CSSProperties = {
  fontSize: 12,
  color: varRef(IG_VAR.muted),
  lineHeight: 1.2,
};

import type { LinkedInPostVariant } from '@postrun/js';
import { FiGlobe, FiUsers } from 'react-icons/fi';
import { LuBadgeCheck } from 'react-icons/lu';

import { LI_VAR, varRef } from './theme';

/** The LinkedIn header's identity view-model — `name`/`avatar_url` derive from
 * the connection; `headline`/`verified` are caller-supplied (not stored). */
export interface LinkedInAuthor {
  name: string;
  avatar_url?: string | null;
  headline?: string;
  verified?: boolean;
}

/**
 * The LinkedIn post header: avatar, actor name (+ optional verified badge),
 * one-line headline, then a muted row with a relative time and the audience icon
 * (globe = public, people = connections-only). Real Feather/Lucide icons via
 * react-icons — no hand-drawn paths.
 */

/** Audience for a member post — DERIVED from the contract, never hand-listed. */
export type LinkedInVisibility = NonNullable<
  LinkedInPostVariant['settings']
>['visibility'];

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
      '<circle cx="24" cy="24" r="24" fill="#9aa6b2"/></svg>',
  );

export interface HeaderProps {
  author: LinkedInAuthor;
  visibility: LinkedInVisibility;
  /** Relative time label, e.g. "Now". */
  time?: string;
}

export function Header({ author, visibility, time = 'Now' }: HeaderProps) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
      <img
        src={author.avatar_url ?? PLACEHOLDER_AVATAR}
        alt=""
        width={48}
        height={48}
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }}
      />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: varRef(LI_VAR.text),
            lineHeight: 1.3,
          }}
        >
          {author.name}
          {author.verified ? (
            <LuBadgeCheck
              size={16}
              aria-label="Verified"
              role="img"
              style={{ color: varRef(LI_VAR.accent), marginLeft: 3, flex: '0 0 auto' }}
            />
          ) : null}
        </span>
        {author.headline ? (
          <span style={{ fontSize: 12, color: varRef(LI_VAR.muted), lineHeight: 1.3 }}>
            {author.headline}
          </span>
        ) : null}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: varRef(LI_VAR.muted),
            lineHeight: 1.3,
          }}
        >
          {time} •{' '}
          {visibility === 'PUBLIC' ? (
            <FiGlobe size={13} aria-label="Public" role="img" />
          ) : (
            <FiUsers size={13} aria-label="Connections" role="img" />
          )}
        </span>
      </div>
    </div>
  );
}

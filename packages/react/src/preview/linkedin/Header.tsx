import type { CSSProperties } from 'react';

import type { LinkedInPreviewAuthor } from '../types';
import { LI_VAR, varRef } from './theme';

/**
 * The LinkedIn post header: avatar, actor name (+ optional verified badge),
 * one-line headline, then a muted row with a relative time and the audience icon
 * (globe = public, people = connections-only).
 */

export type LinkedInVisibility = 'PUBLIC' | 'CONNECTIONS';

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
      '<circle cx="24" cy="24" r="24" fill="#9aa6b2"/></svg>',
  );

const ICON: CSSProperties = { width: 14, height: 14, fill: 'currentColor' };

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON} aria-label="Public" role="img">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM2.5 8a5.5 5.5 0 011-3.16c.12.92.5 1.65 1.06 1.94.5.26.62.5.62 1 0 .76.4 1.1 1 1.4.4.2.6.4.6.86 0 .7.3 1.1.9 1.46A5.5 5.5 0 012.5 8zm6.9 5.36c.06-.5.3-.7.7-1 .5-.36.9-.8.9-1.66 0-.7-.36-1.1-1-1.4-.4-.2-.5-.34-.5-.74 0-.5-.3-.8-.8-.8H6.3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1c.5 0 .9-.4.9-.9V5.7c0-.3.2-.5.5-.6.7-.2 1.2-.6 1.4-1.24A5.5 5.5 0 019.4 13.36z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON} aria-label="Connections" role="img">
      <path d="M5.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 13.5C1 11.6 3 10.5 5.5 10.5S10 11.6 10 13.5V14H1v-.5zm10.2-2.9c1.7.3 2.8 1.3 2.8 2.9V14h-3v-.5c0-1.16-.43-2.13-1.16-2.86.43-.03.88-.04 1.36-.04z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 16, height: 16, marginLeft: 3, flex: '0 0 auto' }}
      aria-label="Verified"
      role="img"
    >
      <path
        fill={varRef(LI_VAR.accent)}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
}

export interface HeaderProps {
  author: LinkedInPreviewAuthor;
  visibility: LinkedInVisibility;
  /** Relative time label, e.g. "Now". */
  time?: string;
}

export function Header({ author, visibility, time = 'Now' }: HeaderProps) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
      <img
        src={author.avatarUrl ?? PLACEHOLDER_AVATAR}
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
          {author.verified ? <VerifiedBadge /> : null}
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
          {visibility === 'PUBLIC' ? <GlobeIcon /> : <PeopleIcon />}
        </span>
      </div>
    </div>
  );
}

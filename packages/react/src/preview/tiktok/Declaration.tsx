'use client';

import {
  TIKTOK_BRANDED_CONTENT_POLICY_URL,
  TIKTOK_MUSIC_CONFIRMATION_URL,
} from '@postrun/js';
import type { CSSProperties, ReactNode } from 'react';

import { TOKENS } from './ui';

/**
 * The consent declaration — MUST #8. Rendered DIRECTLY above the Post button. The
 * wording switches on whether the post is disclosed as branded content (verbatim
 * TikTok copy):
 *   default → "By posting, you agree to TikTok's Music Usage Confirmation"
 *   branded → "By posting, you agree to TikTok's Branded Content Policy and
 *              Music Usage Confirmation."
 */
export function Declaration({ brandedContent }: { brandedContent: boolean }) {
  return (
    <p style={declarationStyle}>
      By posting, you agree to TikTok&apos;s{' '}
      {brandedContent ? (
        <>
          <DeclarationLink href={TIKTOK_BRANDED_CONTENT_POLICY_URL}>
            Branded Content Policy
          </DeclarationLink>{' '}
          and{' '}
        </>
      ) : null}
      <DeclarationLink href={TIKTOK_MUSIC_CONFIRMATION_URL}>
        Music Usage Confirmation
      </DeclarationLink>
      .
    </p>
  );
}

function DeclarationLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={linkStyle}>
      {children}
    </a>
  );
}

const declarationStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: TOKENS.MUTED,
  lineHeight: 1.45,
};

const linkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
};

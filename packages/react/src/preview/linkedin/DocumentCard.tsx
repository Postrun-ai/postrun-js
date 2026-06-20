import type { LinkedInPostVariant } from '@postrun/js';
import type { CSSProperties } from 'react';
import { FiFileText } from 'react-icons/fi';

import type { ResolvedMedia } from '../types';
import { LI_VAR, varRef } from './theme';

/**
 * A LinkedIn document post (`content_kind: 'document'`) — the PDF/slide unit
 * LinkedIn renders as a page preview with a dark caption bar (title + "Document").
 * The document asset rides on the variant `media[]`; if the host resolves a
 * first-page image it shows here, otherwise a clean document affordance. Title is
 * required by the contract, so it always renders. Driven by `settings.document`.
 */

/** The document settings shape — derived from the contract, never re-declared. */
type LinkedInDocument = NonNullable<
  NonNullable<LinkedInPostVariant['settings']>['document']
>;

export interface DocumentCardProps {
  document: LinkedInDocument;
  /** Resolved first-page pixels (from the document asset on media[]), if any. */
  cover?: ResolvedMedia;
}

export function DocumentCard({ document, cover }: DocumentCardProps) {
  return (
    <div style={cardStyle}>
      <div style={pageStyle}>
        {cover ? (
          <img src={cover.src} alt={cover.alt ?? ''} style={coverStyle} />
        ) : (
          <FiFileText size={56} aria-hidden style={{ opacity: 0.5 }} />
        )}
      </div>
      <div style={barStyle}>
        <div style={titleStyle}>{document.title}</div>
        <div style={kindStyle}>Document</div>
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: `1px solid ${varRef(LI_VAR.border)}`,
  borderRadius: 8,
  overflow: 'hidden',
};

const pageStyle: CSSProperties = {
  position: 'relative',
  aspectRatio: '4 / 3',
  background: 'rgba(127,127,127,0.12)',
  display: 'grid',
  placeItems: 'center',
  color: varRef(LI_VAR.muted),
};

const coverStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const barStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.85)',
  color: '#fff',
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const kindStyle: CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.7)',
};

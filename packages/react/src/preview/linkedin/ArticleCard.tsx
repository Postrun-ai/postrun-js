import type { LinkedInPostVariant } from '@postrun/js';
import type { CSSProperties } from 'react';

import type { ReadyMedia } from '../types';
import { LI_VAR, varRef } from './theme';

/**
 * A LinkedIn article share card (`content_kind: 'article'`) — the link unit
 * LinkedIn renders below the commentary: an optional thumbnail, then a panel with
 * the source domain (muted), the headline (bold), and the optional description.
 * Driven straight from `settings.article`; the thumbnail pixels (resolved from
 * `article.thumbnail_media_id`) are passed in by the host.
 */

/** The article settings shape — derived from the contract, never re-declared. */
type LinkedInArticle = NonNullable<
  NonNullable<LinkedInPostVariant['settings']>['article']
>;

/** The display domain for a source URL — protocol/`www.`/path stripped. Falls
 * back to the raw string if it isn't a parseable URL. */
export function domainOf(source: string): string {
  try {
    return new URL(source).hostname.replace(/^www\./, '');
  } catch {
    return source;
  }
}

export interface ArticleCardProps {
  article: LinkedInArticle;
  /** Resolved thumbnail pixels (from `article.thumbnail_media_id`), if any. */
  thumbnail?: ReadyMedia;
}

export function ArticleCard({ article, thumbnail }: ArticleCardProps) {
  return (
    <div style={cardStyle}>
      {thumbnail ? (
        <img src={thumbnail.src} alt={thumbnail.alt ?? ''} style={thumbStyle} />
      ) : null}
      <div style={metaStyle}>
        <div style={domainStyle}>{domainOf(article.source)}</div>
        {article.title ? <div style={titleStyle}>{article.title}</div> : null}
        {article.description ? (
          <div style={descStyle}>{article.description}</div>
        ) : null}
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: `1px solid ${varRef(LI_VAR.border)}`,
  borderRadius: 8,
  overflow: 'hidden',
};

const thumbStyle: CSSProperties = {
  width: '100%',
  display: 'block',
  aspectRatio: '1.91 / 1',
  objectFit: 'cover',
};

const metaStyle: CSSProperties = {
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const domainStyle: CSSProperties = {
  fontSize: 12,
  color: varRef(LI_VAR.muted),
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: varRef(LI_VAR.text),
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const descStyle: CSSProperties = {
  fontSize: 12,
  color: varRef(LI_VAR.muted),
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

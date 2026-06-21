'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

import type {
  LinkedInPreviewAuthor,
  LinkedInPreviewVariant,
  PreviewMedia,
  ResolvedMedia,
} from '../types';
import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { ArticleCard } from './ArticleCard';
import { DocumentCard } from './DocumentCard';
import { EngagementBar } from './EngagementBar';
import { Header } from './Header';
import type { LinkedInVisibility } from './Header';
import { Media } from './Media';
import { Poll } from './Poll';
import { PostBody } from './PostBody';
import {
  LI_VAR,
  type LinkedInTheme,
  colorSchemeFor,
  paletteVars,
  varRef,
} from './theme';

/**
 * A faithful, schema-driven preview of how a LinkedIn post will look in-feed,
 * rendered straight from a Postrun LinkedIn variant. Clean-room components (no
 * dependency to "buy" exists for LinkedIn), mirroring the real feed card: header
 * with headline + audience icon, an entity-highlighted body with the "…more"
 * fold, the 1/2/3/4/+N image mosaic (or a video), and a static action bar.
 *
 * Renders every `content_kind`: text, single/multi image, video, plus the rich
 * units — article share card, poll, and document — each driven from
 * `settings.{article,poll,document}` (see `renderContent`).
 *
 * Customize via `theme` (light/dark/auto), `className`/`style`, or by overriding
 * the `--pr-li-*` CSS variables the card reads.
 */
export interface LinkedInPostPreviewProps {
  /** The LinkedIn variant — either a compose-time write variant or a fetched read
   * variant (both carry the typed settings/body the card renders). */
  variant: LinkedInPreviewVariant;
  /** Author identity (LinkedIn stores no avatar/headline on our connection). */
  author: LinkedInPreviewAuthor;
  /** Resolved media pixels (URLs or compose-time File blobs). */
  media?: PreviewMedia[];
  /** Color scheme. `auto` (default) follows the OS preference. */
  theme?: LinkedInTheme;
  /** Relative time label shown in the header. Default "Now". */
  time?: string;
  /** Show the static action bar (Like/Comment/Repost/Send). Default true. */
  showActions?: boolean;
  /** Class applied to the card — your hook for sizing, shadows, etc. */
  className?: string;
  /** Inline styles on the card — including `--pr-li-*` variable overrides. */
  style?: CSSProperties;
}

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// The body entity colors are CSS `var()` refs — constant, so hoist out of render
// to keep a stable identity for the memoized PostBody.
const BODY_COLORS = {
  accent: varRef(LI_VAR.accent),
  muted: varRef(LI_VAR.muted),
};

function LinkedInPostPreviewImpl({
  variant,
  author,
  media,
  theme = 'auto',
  time,
  showActions = true,
  className,
  style,
}: LinkedInPostPreviewProps) {
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );

  const visibility: LinkedInVisibility =
    variant.settings?.visibility ?? 'PUBLIC';
  const mentionNames = useMemo(
    () => (variant.settings?.mentions ?? []).map((m) => m.name),
    [variant.settings?.mentions],
  );

  const cardStyle: CSSProperties = {
    ...paletteVars(),
    colorScheme: colorSchemeFor(theme),
    background: varRef(LI_VAR.bg),
    color: varRef(LI_VAR.text),
    border: `1px solid ${varRef(LI_VAR.border)}`,
    borderRadius: 10,
    // Pin the width (see InstagramPostPreview): without it the card shrinks to its
    // content, so an empty post collapses to a fraction of a populated card's width.
    width: '100%',
    maxWidth: 552,
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: FONT_STACK,
    ...style,
  };

  // A post with no commentary, media, or rich unit (article/poll/document) would
  // render as just a header + action bar — a hollow card. Show LinkedIn's own
  // "Start a post" prompt (muted) so the empty state reads as intentional.
  const hasContent =
    Boolean(variant.body) ||
    resolvedMedia.length > 0 ||
    Boolean(variant.settings?.content_kind && variant.settings.content_kind !== 'text');

  return (
    <div className={className} style={cardStyle}>
      <Header author={author} visibility={visibility} time={time} />
      {variant.body ? (
        <div style={{ padding: '8px 16px 0' }}>
          <PostBody
            text={variant.body}
            mentionNames={mentionNames}
            colors={BODY_COLORS}
          />
        </div>
      ) : null}
      {renderContent(variant, resolvedMedia)}
      {hasContent ? null : (
        <p style={{ ...emptyBodyStyle, color: BODY_COLORS.muted }}>
          What do you want to talk about?
        </p>
      )}
      {showActions ? <EngagementBar /> : null}
    </div>
  );
}

const emptyBodyStyle: CSSProperties = {
  margin: 0,
  padding: '8px 16px 4px',
  fontSize: 14,
  lineHeight: 1.4,
};

/**
 * The content unit below the commentary, by `content_kind`: an article share
 * card, a poll, or a document card — else the image mosaic / video. Article and
 * document thumbnails come from the first resolved media item (the host resolves
 * `article.thumbnail_media_id` / the document asset to pixels). The inset
 * cards (article/poll/document) sit in the text column; media is edge-to-edge.
 */
function renderContent(
  variant: LinkedInPreviewVariant,
  media: readonly ResolvedMedia[],
) {
  const settings = variant.settings;
  const kind = settings?.content_kind;
  const [firstMedia] = media;

  if (kind === 'article' && settings?.article) {
    return (
      <div style={INSET}>
        <ArticleCard article={settings.article} thumbnail={firstMedia} />
      </div>
    );
  }
  if (kind === 'poll' && settings?.poll) {
    return (
      <div style={INSET}>
        <Poll poll={settings.poll} />
      </div>
    );
  }
  if (kind === 'document' && settings?.document) {
    return (
      <div style={INSET}>
        <DocumentCard document={settings.document} cover={firstMedia} />
      </div>
    );
  }
  return media.length > 0 ? (
    <div style={{ marginTop: 12 }}>
      <Media media={media} />
    </div>
  ) : null;
}

const INSET: CSSProperties = { padding: '12px 16px 0' };

/** Memoized: re-renders only when its props change (the resolved-media hook
 * absorbs unstable media arrays). */
export const LinkedInPostPreview = memo(LinkedInPostPreviewImpl);

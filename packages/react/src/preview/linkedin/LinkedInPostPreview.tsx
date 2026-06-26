'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

import type { MediaResource } from '@postrun/js';

import { MediaPlaceholder } from '../MediaPlaceholder';
import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type LinkedInPreviewVariant,
  type PreviewConnection,
  type ReadyMedia,
} from '../types';
import { authorName } from '../author';
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
 * rendered straight from a Postrun LinkedIn variant + the posting `Connection`.
 * Clean-room components mirroring the real feed card: header with headline +
 * audience icon, an entity-highlighted body with the "…more" fold, the
 * 1/2/3/4/+N image mosaic (or a video), and a static action bar.
 *
 * Renders every `content_kind`: text, single/multi image, video, plus the rich
 * units — article share card, poll, and document — each driven from
 * `settings.{article,poll,document}`. Media pixels come from the resolved
 * per-platform renditions; a still-processing asset shows the shared
 * "Processing media…" tile.
 */
export interface LinkedInPostPreviewProps {
  /** The LinkedIn variant — compose-time write OR fetched read (carries assets
   * inline). */
  variant: LinkedInPreviewVariant;
  /** The posting account — the SDK `Connection`. Name/avatar derive from it. */
  connection: PreviewConnection;
  /** Uploaded assets to resolve a compose variant's media ids against (e.g.
   * `useMediaUpload().ready`); a read variant carries its own inline. */
  media?: readonly MediaResource[];
  /** One-line headline under the name — our API doesn't store it, so you supply
   * it. */
  headline?: string;
  /** Show the verified badge — our API doesn't store it, so you supply it. */
  verified?: boolean;
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

const BODY_COLORS = {
  accent: varRef(LI_VAR.accent),
  muted: varRef(LI_VAR.muted),
};

function LinkedInPostPreviewImpl({
  variant,
  connection,
  media,
  headline,
  verified,
  theme = 'auto',
  time,
  showActions = true,
  className,
  style,
}: LinkedInPostPreviewProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'linkedin', media),
    [variant.media, media],
  );
  const readyMedia = useMemo(() => resolved.filter(isReadyMedia), [resolved]);
  // Media referenced, but no pixels resolved yet → still processing.
  const mediaPending = resolved.length > 0 && readyMedia.length === 0;

  const author = useMemo(
    () => ({
      name: authorName(connection),
      avatar_url: connection.avatar_url,
      headline,
      verified,
    }),
    [connection, headline, verified],
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
    width: '100%',
    maxWidth: 552,
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: FONT_STACK,
    ...style,
  };

  // A post with no commentary, media, or rich unit would render as just a header
  // + action bar — a hollow card. Show LinkedIn's "Start a post" prompt instead.
  const hasContent =
    Boolean(variant.body) ||
    resolved.length > 0 ||
    Boolean(
      variant.settings?.article ||
        variant.settings?.poll ||
        variant.settings?.document,
    );

  return (
    <div className={className} style={cardStyle}>
      <Header
        author={author}
        visibility={visibility}
        time={time}
      />
      {variant.body ? (
        <div style={{ padding: '8px 16px 0' }}>
          <PostBody
            text={variant.body}
            mentionNames={mentionNames}
            colors={BODY_COLORS}
          />
        </div>
      ) : null}
      {renderContent(variant, readyMedia, mediaPending)}
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
 * The content unit below the commentary. The LinkedIn content shape is
 * server-derived (read-only); here we dispatch on the rich sub-object the
 * customer attached (article / poll / document — mutually exclusive with media in
 * the contract), else the media mosaic. Article and document thumbnails come from
 * the first ready media item. Rich cards sit in the text column; media is
 * edge-to-edge. When media is attached but not yet resolved, a processing tile
 * holds the slot.
 */
function renderContent(
  variant: LinkedInPreviewVariant,
  media: readonly ReadyMedia[],
  pending: boolean,
) {
  const settings = variant.settings;
  const [firstMedia] = media;

  if (settings?.article) {
    return (
      <div style={INSET}>
        <ArticleCard article={settings.article} thumbnail={firstMedia} />
      </div>
    );
  }
  if (settings?.poll) {
    return (
      <div style={INSET}>
        <Poll poll={settings.poll} />
      </div>
    );
  }
  if (settings?.document) {
    return (
      <div style={INSET}>
        <DocumentCard document={settings.document} cover={firstMedia} />
      </div>
    );
  }
  if (media.length > 0) {
    return (
      <div style={{ marginTop: 12 }}>
        <Media media={media} />
      </div>
    );
  }
  if (pending) {
    return (
      <div style={processingFrameStyle}>
        <MediaPlaceholder
          label="Processing media…"
          color={varRef(LI_VAR.muted)}
          background={varRef(LI_VAR.border)}
          shimmer
        />
      </div>
    );
  }
  return null;
}

const INSET: CSSProperties = { padding: '12px 16px 0' };

const processingFrameStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 272,
  marginTop: 12,
};

/** Memoized: re-renders only when its props change. */
export const LinkedInPostPreview = memo(LinkedInPostPreviewImpl);

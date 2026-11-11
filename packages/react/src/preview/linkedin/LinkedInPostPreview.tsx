'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { MediaResource } from '@postrun/js';

import { MediaPlaceholder } from '../MediaPlaceholder';
import { authorName } from '../author';
import { createPreviewContext } from '../context';
import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type LinkedInPreviewVariant,
  type PreviewConnection,
  type ReadyMedia,
} from '../types';
import { ArticleCard } from './ArticleCard';
import { DocumentCard } from './DocumentCard';
import { EngagementBar } from './EngagementBar';
import { Header, type LinkedInAuthor, type LinkedInVisibility } from './Header';
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
 * Composable: `<LinkedInPostPreview>` is `<LinkedInPreviewRoot>` wrapping the
 * Header, Body, Content, and Actions parts. Render the Root yourself to reorder,
 * drop, or replace any part; your own parts read the same data through
 * `useLinkedInPreview()`.
 */
export interface LinkedInPreviewRootProps {
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
  /** Class applied to the card — your hook for sizing, shadows, etc. */
  className?: string;
  /** Inline styles on the card — including `--pr-li-*` variable overrides. */
  style?: CSSProperties;
  /** The parts to render, in order: ours, yours, or a mix. */
  children: ReactNode;
}

export interface LinkedInPostPreviewProps
  extends Omit<LinkedInPreviewRootProps, 'children'> {
  /** Show the static action bar (Like/Comment/Repost/Send). Default true. */
  showActions?: boolean;
}

/** What every LinkedIn part renders from — read it in your own parts with
 * `useLinkedInPreview()`. */
export interface LinkedInPreviewData {
  variant: LinkedInPreviewVariant;
  author: LinkedInAuthor;
  visibility: LinkedInVisibility;
  time?: string;
  mentionNames: readonly string[];
  /** The attached media whose LinkedIn rendition is ready to show. */
  media: readonly ReadyMedia[];
  /** Media is attached, but none of it has a LinkedIn rendition yet. */
  mediaPending: boolean;
  /** The post has commentary, media, or a rich unit (article, poll, document). */
  hasContent: boolean;
}

const [LinkedInPreviewProvider, useLinkedInPreview] =
  createPreviewContext<LinkedInPreviewData>('LinkedInPreviewRoot');
export { useLinkedInPreview };

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const BODY_COLORS = {
  accent: varRef(LI_VAR.accent),
  muted: varRef(LI_VAR.muted),
};

/** The card frame (theme + palette) and the data every part reads. */
export function LinkedInPreviewRoot({
  variant,
  connection,
  media,
  headline,
  verified,
  theme = 'auto',
  time,
  className,
  style,
  children,
}: LinkedInPreviewRootProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'linkedin', media),
    [variant.media, media],
  );

  const data = useMemo<LinkedInPreviewData>(() => {
    const settings = variant.settings;
    const ready = resolved.filter(isReadyMedia);
    return {
      variant,
      author: {
        name: authorName(connection),
        avatar_url: connection.avatar_url,
        headline,
        verified,
      },
      visibility: settings?.visibility ?? 'PUBLIC',
      time,
      mentionNames: (settings?.mentions ?? []).map((m) => m.name),
      media: ready,
      mediaPending: resolved.length > 0 && ready.length === 0,
      hasContent:
        Boolean(variant.body) ||
        resolved.length > 0 ||
        Boolean(settings?.article || settings?.poll || settings?.document),
    };
  }, [variant, resolved, connection, headline, verified, time]);

  return (
    <LinkedInPreviewProvider value={data}>
      <div className={className} style={{ ...cardStyle(theme), ...style }}>
        {children}
      </div>
    </LinkedInPreviewProvider>
  );
}

function cardStyle(theme: LinkedInTheme): CSSProperties {
  return {
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
  };
}

/** Avatar, name, headline, time, and the audience icon. */
export function LinkedInPreviewHeader() {
  const { author, visibility, time } = useLinkedInPreview();
  return <Header author={author} visibility={visibility} time={time} />;
}

/** The commentary, or LinkedIn's "What do you want to talk about?" prompt when
 * the post is empty (a header + action bar alone reads as a broken card). */
export function LinkedInPreviewBody() {
  const { variant, mentionNames, hasContent } = useLinkedInPreview();
  if (variant.body) {
    return (
      <div style={{ padding: '8px 16px 0' }}>
        <PostBody
          text={variant.body}
          mentionNames={mentionNames}
          colors={BODY_COLORS}
        />
      </div>
    );
  }
  return hasContent ? null : (
    <p style={emptyBodyStyle}>What do you want to talk about?</p>
  );
}

const emptyBodyStyle: CSSProperties = {
  margin: 0,
  padding: '8px 16px 4px',
  fontSize: 14,
  lineHeight: 1.4,
  color: BODY_COLORS.muted,
};

/**
 * The unit below the commentary: the article, poll, or document the customer
 * attached (mutually exclusive with media in the contract), else the media
 * mosaic. Article and document thumbnails come from the first ready media item.
 * Rich cards sit in the text column; media is edge-to-edge. Media that is
 * attached but not yet resolved holds the slot with a processing tile.
 */
export function LinkedInPreviewContent() {
  const { variant, media, mediaPending } = useLinkedInPreview();
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
  if (mediaPending) {
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

/** The static Like / Comment / Repost / Send bar. */
export const LinkedInPreviewActions = EngagementBar;

function LinkedInPostPreviewImpl({
  showActions = true,
  ...rootProps
}: LinkedInPostPreviewProps) {
  return (
    <LinkedInPreviewRoot {...rootProps}>
      <LinkedInPreviewHeader />
      <LinkedInPreviewBody />
      <LinkedInPreviewContent />
      {showActions ? <LinkedInPreviewActions /> : null}
    </LinkedInPreviewRoot>
  );
}

/** Memoized: re-renders only when its props change. */
export const LinkedInPostPreview = memo(LinkedInPostPreviewImpl);

'use client';

import type { LinkedInPostVariant } from '@postrun/js';
import { memo } from 'react';
import type { CSSProperties } from 'react';

import type { LinkedInPreviewAuthor, PreviewMedia } from '../types';
import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { EngagementBar } from './EngagementBar';
import { Header } from './Header';
import type { LinkedInVisibility } from './Header';
import { Media } from './Media';
import { PostBody } from './PostBody';
import {
  LI_VAR,
  type LinkedInTheme,
  paletteVars,
  useIsDark,
  varRef,
} from './theme';

/**
 * A faithful, schema-driven preview of how a LinkedIn post will look in-feed,
 * rendered straight from a Postrun LinkedIn variant. Clean-room components (no
 * dependency to "buy" exists for LinkedIn), mirroring the real feed card: header
 * with headline + audience icon, an entity-highlighted body with the "…more"
 * fold, the 1/2/3/4/+N image mosaic (or a video), and a static action bar.
 *
 * v1 renders text + images + video. The richer `content_kind`s (article, poll,
 * document) degrade gracefully to the text/media card and arrive next.
 *
 * Customize via `theme` (light/dark/auto), `className`/`style`, or by overriding
 * the `--pr-li-*` CSS variables the card reads.
 */
export interface LinkedInPostPreviewProps {
  /** The LinkedIn variant from our schema — the content source, untouched. */
  variant: LinkedInPostVariant;
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
  const dark = useIsDark(theme);
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );

  const visibility: LinkedInVisibility =
    variant.settings?.visibility ?? 'PUBLIC';
  const mentionNames = (variant.settings?.mentions ?? []).map((m) => m.name);
  const bodyColors = {
    accent: varRef(LI_VAR.accent),
    muted: varRef(LI_VAR.muted),
  };

  const cardStyle: CSSProperties = {
    ...paletteVars(dark),
    background: varRef(LI_VAR.bg),
    color: varRef(LI_VAR.text),
    border: `1px solid ${varRef(LI_VAR.border)}`,
    borderRadius: 10,
    maxWidth: 552,
    overflow: 'hidden',
    fontFamily: FONT_STACK,
    ...style,
  };

  return (
    <div className={className} style={cardStyle}>
      <Header author={author} visibility={visibility} time={time} />
      {variant.body ? (
        <div style={{ padding: '8px 16px 0' }}>
          <PostBody
            text={variant.body}
            mentionNames={mentionNames}
            colors={bodyColors}
          />
        </div>
      ) : null}
      {resolvedMedia.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <Media media={resolvedMedia} />
        </div>
      ) : null}
      {showActions ? <EngagementBar /> : null}
    </div>
  );
}

/** Memoized: re-renders only when its props change (the resolved-media hook
 * absorbs unstable media arrays). */
export const LinkedInPostPreview = memo(LinkedInPostPreviewImpl);

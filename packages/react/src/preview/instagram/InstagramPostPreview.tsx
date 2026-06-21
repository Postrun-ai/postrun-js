'use client';

import type { InstagramPostVariant } from '@postrun/js';
import { memo } from 'react';
import type { CSSProperties } from 'react';

import type { InstagramPreviewAuthor, PreviewMedia } from '../types';
import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { Actions } from './Actions';
import { Caption } from './Caption';
import { FeedMedia } from './FeedMedia';
import { Header } from './Header';
import { ReelPreview } from './ReelPreview';
import {
  type InstagramTheme,
  IG_VAR,
  colorSchemeFor,
  paletteVars,
  varRef,
} from './theme';

/**
 * A faithful, schema-driven preview of how an Instagram post will look, rendered
 * straight from a Postrun Instagram variant. Covers everything the API supports:
 * a **feed** post (single image / carousel) and a **reel** (9:16 video). Identity
 * is SDK-driven (`author` derives from `Connection`); creator details (username,
 * avatar, verified, collaborators) and the audio label come from the variant +
 * author. Feed themes light/dark/`auto`; the reel is always dark.
 *
 * Clean-room (there's no package to "buy" — Instagram's embed only renders
 * already-published posts), referencing the real IG feed + Postiz.
 */
export interface InstagramPostPreviewProps {
  /** The Instagram variant from our schema — the content source, untouched. */
  variant: InstagramPostVariant;
  /** Author identity (SDK-driven; `verified` is a presentation extra). */
  author: InstagramPreviewAuthor;
  /** Resolved media pixels (processed URLs or compose-time File blobs). */
  media?: PreviewMedia[];
  /** Color scheme for the feed card. `auto` (default) follows the OS. */
  theme?: InstagramTheme;
  className?: string;
  style?: CSSProperties;
}

function InstagramPostPreviewImpl({
  variant,
  author,
  media,
  theme = 'auto',
  className,
  style,
}: InstagramPostPreviewProps) {
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );

  const settings = variant.settings;
  // `post_type` is the authoritative discriminator (the contract). `media_type`
  // is an optional hint, so we never let it override post_type.
  const isReel = variant.post_type === 'reel';

  if (isReel) {
    return (
      <ReelPreview
        author={author}
        body={variant.body ?? ''}
        media={resolvedMedia}
        audioName={settings?.audio_name}
        className={className}
        style={style}
      />
    );
  }

  const collaborators = settings?.collaborators ?? [];

  const cardStyle: CSSProperties = {
    ...paletteVars(),
    colorScheme: colorSchemeFor(theme),
    background: varRef(IG_VAR.bg),
    color: varRef(IG_VAR.text),
    border: `1px solid ${varRef(IG_VAR.border)}`,
    borderRadius: 8,
    maxWidth: 470,
    overflow: 'hidden',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ...style,
  };

  return (
    <div className={className} style={cardStyle}>
      <Header author={author} collaborators={collaborators} />
      <FeedMedia media={resolvedMedia} />
      <Actions />
      {variant.body ? (
        <div style={{ paddingBottom: 12 }}>
          <Caption username={author.username} body={variant.body} />
        </div>
      ) : null}
    </div>
  );
}

/** Memoized: the resolved-media hook absorbs unstable media arrays. */
export const InstagramPostPreview = memo(InstagramPostPreviewImpl);

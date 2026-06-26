'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

import type { MediaResource } from '@postrun/js';

import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type InstagramPreviewVariant,
  type PreviewConnection,
} from '../types';
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
 * straight from a Postrun Instagram variant + the posting `Connection`. Covers a
 * **feed** post (single image / carousel) and a **reel** (9:16 video). Identity
 * (`username`/`avatar_url`) derives from the connection; `verified` is a caller
 * extra. Media pixels come from the resolved per-platform renditions; a
 * still-processing asset shows the shared "Processing media…" tile. Feed themes
 * light/dark/`auto`; the reel is always dark.
 */
export interface InstagramPostPreviewProps {
  /** The Instagram variant — compose-time write OR fetched read (carries assets
   * inline). */
  variant: InstagramPreviewVariant;
  /** The posting account — the SDK `Connection`. Username/avatar derive from it. */
  connection: PreviewConnection;
  /** Uploaded assets to resolve a compose variant's media ids against (e.g.
   * `useMediaUpload().ready`); a read variant carries its own inline. */
  media?: readonly MediaResource[];
  /** Show the verified seal — our API doesn't store it, so you supply it. */
  verified?: boolean;
  /** Color scheme for the feed card. `auto` (default) follows the OS. */
  theme?: InstagramTheme;
  className?: string;
  style?: CSSProperties;
}

function InstagramPostPreviewImpl({
  variant,
  connection,
  media,
  verified,
  theme = 'auto',
  className,
  style,
}: InstagramPostPreviewProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'instagram', media),
    [variant.media, media],
  );
  const readyMedia = useMemo(() => resolved.filter(isReadyMedia), [resolved]);
  // Media referenced but no pixels resolved yet → still processing.
  const pending = resolved.length > 0 && readyMedia.length === 0;

  const author = useMemo(
    () => ({ username: connection.username, avatar_url: connection.avatar_url, verified }),
    [connection, verified],
  );

  const settings = variant.settings;
  // The post shape is server-derived (read-only). For the preview we read it
  // straight off the media we resolved: an Instagram reel is a single video;
  // anything else (one image, or a multi-item carousel) is a feed card.
  const isReel = resolved.length === 1 && resolved[0]?.kind === 'video';

  if (isReel) {
    return (
      <ReelPreview
        author={author}
        body={variant.body ?? ''}
        media={readyMedia}
        pending={pending}
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
    width: '100%',
    maxWidth: 470,
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ...style,
  };

  return (
    <div className={className} style={cardStyle}>
      <Header author={author} collaborators={collaborators} />
      <FeedMedia media={readyMedia} pending={pending} />
      <Actions />
      {variant.body ? (
        <div style={{ paddingBottom: 12 }}>
          <Caption username={author.username} body={variant.body} />
        </div>
      ) : null}
    </div>
  );
}

/** Memoized. */
export const InstagramPostPreview = memo(InstagramPostPreviewImpl);

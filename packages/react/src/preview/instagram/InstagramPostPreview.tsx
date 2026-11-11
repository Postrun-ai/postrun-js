'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { MediaResource } from '@postrun/js';

import { createPreviewContext } from '../context';
import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type InstagramPreviewVariant,
  type PreviewConnection,
  type ReadyMedia,
} from '../types';
import { Actions } from './Actions';
import { Caption } from './Caption';
import { FeedMedia } from './FeedMedia';
import { Header, type InstagramAuthor } from './Header';
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
 *
 * Composable: for a feed post, `<InstagramPostPreview>` is
 * `<InstagramPreviewRoot>` wrapping the Header, Content, Actions, and Body parts.
 * Render the Root yourself to reorder, drop, or replace any part; your own parts
 * read the same data through `useInstagramPreview()`. A single video renders as
 * `<ReelPreview>` instead.
 */
export interface InstagramPreviewRootProps {
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
  /** The parts to render, in order: ours, yours, or a mix. */
  children: ReactNode;
}

export type InstagramPostPreviewProps = Omit<InstagramPreviewRootProps, 'children'>;

/** What every Instagram part renders from — read it in your own parts with
 * `useInstagramPreview()`. */
export interface InstagramPreviewData {
  variant: InstagramPreviewVariant;
  author: InstagramAuthor;
  collaborators: readonly string[];
  /** The attached media whose Instagram rendition is ready to show. */
  media: readonly ReadyMedia[];
  /** Media is attached, but none of it has an Instagram rendition yet. */
  mediaPending: boolean;
  /** A single video: Instagram shows it as a reel (`<ReelPreview>`), not a feed
   * card. */
  isReel: boolean;
}

const [InstagramPreviewProvider, useInstagramPreview] =
  createPreviewContext<InstagramPreviewData>('InstagramPreviewRoot');
export { useInstagramPreview };

type PreviewInput = Pick<
  InstagramPreviewRootProps,
  'variant' | 'connection' | 'media' | 'verified'
>;

function usePreviewData({
  variant,
  connection,
  media,
  verified,
}: PreviewInput): InstagramPreviewData {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'instagram', media),
    [variant.media, media],
  );
  return useMemo(() => {
    const ready = resolved.filter(isReadyMedia);
    return {
      variant,
      author: {
        username: connection.username,
        avatar_url: connection.avatar_url,
        verified,
      },
      collaborators: variant.settings?.collaborators ?? [],
      media: ready,
      mediaPending: resolved.length > 0 && ready.length === 0,
      isReel: resolved.length === 1 && resolved[0]?.kind === 'video',
    };
  }, [variant, resolved, connection, verified]);
}

interface FeedFrameProps
  extends Pick<InstagramPreviewRootProps, 'theme' | 'className' | 'style' | 'children'> {
  data: InstagramPreviewData;
}

function FeedFrame({ data, theme = 'auto', className, style, children }: FeedFrameProps) {
  return (
    <InstagramPreviewProvider value={data}>
      <div className={className} style={{ ...cardStyle(theme), ...style }}>
        {children}
      </div>
    </InstagramPreviewProvider>
  );
}

function cardStyle(theme: InstagramTheme): CSSProperties {
  return {
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
  };
}

/** The feed card frame (theme + palette) and the data every part reads. */
export function InstagramPreviewRoot({
  variant,
  connection,
  media,
  verified,
  ...frame
}: InstagramPreviewRootProps) {
  const data = usePreviewData({ variant, connection, media, verified });
  return <FeedFrame data={data} {...frame} />;
}

/** Avatar, username (+ collaborators), and the verified seal. */
export function InstagramPreviewHeader() {
  const { author, collaborators } = useInstagramPreview();
  return <Header author={author} collaborators={collaborators} />;
}

/** The 1:1 image, video, or swipeable carousel (or its processing tile). */
export function InstagramPreviewContent() {
  const { media, mediaPending } = useInstagramPreview();
  return <FeedMedia media={media} pending={mediaPending} />;
}

/** The static like / comment / share / save row. */
export const InstagramPreviewActions = Actions;

/** The caption, prefixed with the username. */
export function InstagramPreviewBody() {
  const { variant, author } = useInstagramPreview();
  if (!variant.body) {
    return null;
  }
  return (
    <div style={{ paddingBottom: 12 }}>
      <Caption username={author.username ?? null} body={variant.body} />
    </div>
  );
}

function InstagramPostPreviewImpl({
  variant,
  connection,
  media,
  verified,
  ...frame
}: InstagramPostPreviewProps) {
  const data = usePreviewData({ variant, connection, media, verified });

  if (data.isReel) {
    return (
      <ReelPreview
        author={data.author}
        body={variant.body ?? ''}
        media={data.media}
        pending={data.mediaPending}
        audioName={variant.settings?.audio_name}
        className={frame.className}
        style={frame.style}
      />
    );
  }

  return (
    <FeedFrame data={data} {...frame}>
      <InstagramPreviewHeader />
      <InstagramPreviewContent />
      <InstagramPreviewActions />
      <InstagramPreviewBody />
    </FeedFrame>
  );
}

/** Memoized. */
export const InstagramPostPreview = memo(InstagramPostPreviewImpl);

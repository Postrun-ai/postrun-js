'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  type EnrichedTweet,
  QuotedTweet,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetMedia,
  type TwitterComponents,
  enrichTweet,
} from 'react-tweet';

import type { MediaResource } from '@postrun/js';

import { MediaPlaceholder } from '../MediaPlaceholder';
import { authorName } from '../author';
import { createPreviewContext } from '../context';
import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type PreviewConnection,
  type ReadyMedia,
  type XPreviewQuotedTweet,
  type XPreviewVariant,
} from '../types';
import { XPoll } from './XPoll';
import { XPreviewActions } from './XPreviewActions';
import { makeRawMediaImg, rawSrcLookup } from './raw-media';
import { toTweet } from './to-tweet';

/**
 * A faithful, pixel-accurate preview of how an X post will look once published,
 * rendered straight from a Postrun X variant + the posting `Connection`. Built on
 * `react-tweet` (the same card X ships): pass the schema, render the preview.
 * Media pixels come from the resolved per-platform renditions — a still-processing
 * asset shows the shared "Processing media…" tile instead of a fake image.
 *
 * Composable: `<XPostPreview>` is `<XPreviewRoot>` wrapping the Header, Body,
 * Content, and Actions parts. Render the Root yourself to reorder, drop, or
 * replace any part; your own parts read the same data through `useXPreview()`.
 */
export interface XPreviewRootProps {
  /** The X variant — either a compose-time write variant or a fetched read
   * variant. A read variant carries its media assets inline; for a compose
   * variant, pass the uploaded assets via `media`. */
  variant: XPreviewVariant;
  /** The posting account — the SDK `Connection`. The header derives the name,
   * @handle, and avatar from it. */
  connection: PreviewConnection;
  /** Uploaded assets to resolve a compose variant's media ids against (e.g.
   * `useMediaUpload().ready`). A read variant carries its own assets inline, so
   * this is only needed for a compose-time draft. */
  media?: readonly MediaResource[];
  /** Show the X verified badge — our API doesn't store it, so you supply it. */
  verified?: boolean;
  /** Content for the quoted card when `settings.quote_tweet_id` is set. */
  quotedTweet?: XPreviewQuotedTweet;
  /** The replied-to account's handle (our schema only stores the parent id). */
  replyToHandle?: string;
  /** Color scheme. `auto` (default) follows the OS color scheme. */
  theme?: 'light' | 'dark' | 'auto';
  /** Class applied to the wrapper — your hook for sizing, shadows, etc. */
  className?: string;
  /** Inline styles on the wrapper — e.g. react-tweet CSS variables. */
  style?: CSSProperties;
  /** Override react-tweet's internal pieces (e.g. `next/image` avatars). */
  components?: TwitterComponents;
  /** The parts to render, in order: ours, yours, or a mix. */
  children: ReactNode;
}

export interface XPostPreviewProps extends Omit<XPreviewRootProps, 'children'> {
  /** Show the static action row (icons, no counts). Default true. */
  showActions?: boolean;
}

/** What every X part renders from — read it in your own parts with
 * `useXPreview()`. */
export interface XPreviewData {
  variant: XPreviewVariant;
  /** The react-tweet model of this post, so your parts can render react-tweet's
   * own components (`TweetHeader`, `TweetBody`, …) from it. */
  tweet: EnrichedTweet;
  /** react-tweet component overrides, including the one that keeps our raw
   * media URLs. Pass them to any react-tweet component you render. */
  components: TwitterComponents;
  /** The attached media whose X rendition is ready to show. */
  media: readonly ReadyMedia[];
  /** Media is attached, but none of it has an X rendition yet. */
  mediaPending: boolean;
  /** No body, media, poll, or quote: the body shows X's composer prompt. */
  isEmpty: boolean;
}

const [XPreviewProvider, useXPreview] =
  createPreviewContext<XPreviewData>('XPreviewRoot');
export { useXPreview };

/** The react-tweet frame (theme) and the data every part reads. */
export function XPreviewRoot({
  variant,
  connection,
  media,
  verified,
  quotedTweet,
  replyToHandle,
  theme = 'auto',
  className,
  style,
  components: componentsProp,
  children,
}: XPreviewRootProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'x', media),
    [variant.media, media],
  );

  const data = useMemo<XPreviewData>(() => {
    const ready = resolved.filter(isReadyMedia);
    const readyQuoted = (quotedTweet?.media ?? []).filter(isReadyMedia);

    // react-tweet transforms media src for Twitter's CDN; map that transform back
    // to our raw url so customer/compose-time media renders.
    const components: TwitterComponents = {
      MediaImg: makeRawMediaImg(rawSrcLookup(ready, readyQuoted)),
      ...componentsProp,
    };

    const tweet = enrichTweet(
      toTweet({
        variant,
        author: {
          name: authorName(connection),
          username: connection.username,
          avatar_url: connection.avatar_url,
          verified,
        },
        media: ready,
        quotedTweet: quotedTweet
          ? {
              author: {
                name: quotedTweet.name,
                username: quotedTweet.username,
                avatar_url: quotedTweet.avatar_url,
              },
              body: quotedTweet.body,
              media: readyQuoted,
            }
          : undefined,
        replyToHandle,
      }),
    );

    return {
      variant,
      tweet,
      components,
      media: ready,
      mediaPending: resolved.length > 0 && ready.length === 0,
      isEmpty:
        !variant.body &&
        resolved.length === 0 &&
        !variant.settings?.poll &&
        !tweet.quoted_tweet,
    };
  }, [variant, resolved, connection, verified, quotedTweet, replyToHandle, componentsProp]);

  return (
    <XPreviewProvider value={data}>
      <div
        data-theme={theme === 'auto' ? undefined : theme}
        className={className}
        style={style}
      >
        <TweetContainer>{children}</TweetContainer>
      </div>
    </XPreviewProvider>
  );
}

/** Avatar, name, @handle, and the "Replying to" line on a reply. */
export function XPreviewHeader() {
  const { tweet, components } = useXPreview();
  return (
    <>
      <TweetHeader tweet={tweet} components={components} />
      {tweet.in_reply_to_screen_name ? <TweetInReplyTo tweet={tweet} /> : null}
    </>
  );
}

/** The post text, or X's muted "What's happening?" prompt when the post is
 * empty (react-tweet would otherwise render a hollow card). */
export function XPreviewBody() {
  const { tweet, isEmpty } = useXPreview();
  return isEmpty ? (
    <p style={emptyBodyStyle}>What&apos;s happening?</p>
  ) : (
    <TweetBody tweet={tweet} />
  );
}

const emptyBodyStyle: CSSProperties = {
  margin: 'var(--tweet-body-margin)',
  fontSize: 'var(--tweet-body-font-size)',
  fontWeight: 'var(--tweet-body-font-weight)',
  lineHeight: 'var(--tweet-body-line-height)',
  color: 'var(--tweet-font-color-secondary)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
};

/** Media (or its processing tile), the poll, and the quoted post. */
export function XPreviewContent() {
  const { variant, tweet, components, mediaPending } = useXPreview();
  return (
    <>
      {tweet.mediaDetails?.length ? (
        <TweetMedia tweet={tweet} components={components} />
      ) : null}
      {mediaPending ? <ProcessingTile /> : null}
      {/* Poll is mutually exclusive with media/quote/card (enforced by the
          contract), so it renders in their place. */}
      {variant.settings?.poll ? <XPoll poll={variant.settings.poll} /> : null}
      {tweet.quoted_tweet ? <QuotedTweet tweet={tweet.quoted_tweet} /> : null}
    </>
  );
}

/** Shown while attached media has no X rendition yet. A 16:9 frame (X's common
 * media aspect) reserves the space so the card doesn't jump when the pixels
 * land. The fill is a quiet theme-aware grey (NOT X's brand blue) so the
 * "Processing media…" line reads clearly. */
function ProcessingTile() {
  return (
    <div style={processingFrameStyle}>
      <MediaPlaceholder
        label="Processing media…"
        color="var(--tweet-font-color-secondary, #536471)"
        background="color-mix(in srgb, currentColor 6%, transparent)"
        shimmer
      />
    </div>
  );
}

const processingFrameStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  marginTop: 'var(--tweet-body-margin, 12px)',
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid var(--tweet-color-gray-secondary, rgba(15,20,25,0.1))',
};

export { XPreviewActions };

function XPostPreviewImpl({ showActions = true, ...rootProps }: XPostPreviewProps) {
  return (
    <XPreviewRoot {...rootProps}>
      <XPreviewHeader />
      <XPreviewBody />
      <XPreviewContent />
      {showActions ? <XPreviewActions /> : null}
    </XPreviewRoot>
  );
}

/** Memoized: re-renders only when its props change. */
export const XPostPreview = memo(XPostPreviewImpl);

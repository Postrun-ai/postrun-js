'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
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
import { resolveVariantMedia } from '../media-resolver';
import {
  isReadyMedia,
  type PreviewConnection,
  type XPreviewQuotedTweet,
  type XPreviewVariant,
} from '../types';
import { authorName } from '../author';
import { XPoll } from './XPoll';
import { XPreviewActions } from './XPreviewActions';
import { makeRawMediaImg, rawSrcLookup } from './raw-media';
import { toTweet } from './to-tweet';
import type { XAuthor } from './to-tweet';

export interface XPostPreviewProps {
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
  /** Show the static action row (icons, no counts). Default true. */
  showActions?: boolean;
  /** Class applied to the wrapper — your hook for sizing, shadows, etc. */
  className?: string;
  /** Inline styles on the wrapper — e.g. react-tweet CSS variables. */
  style?: CSSProperties;
  /** Override react-tweet's internal pieces (e.g. `next/image` avatars). */
  components?: TwitterComponents;
}

/**
 * A faithful, pixel-accurate preview of how an X post will look once published,
 * rendered straight from a Postrun X variant + the posting `Connection`. Built on
 * `react-tweet` (the same card X ships): pass the schema, render the preview.
 * Media pixels come from the resolved per-platform renditions — a still-processing
 * asset shows the shared "Processing media…" tile instead of a fake image.
 */
function XPostPreviewImpl({
  variant,
  connection,
  media,
  verified,
  quotedTweet,
  replyToHandle,
  theme = 'auto',
  showActions = true,
  className,
  style,
  components: componentsProp,
}: XPostPreviewProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'x', media),
    [variant.media, media],
  );
  const readyMedia = useMemo(() => resolved.filter(isReadyMedia), [resolved]);
  const readyQuotedMedia = useMemo(
    () => (quotedTweet?.media ?? []).filter(isReadyMedia),
    [quotedTweet?.media],
  );

  // Media is referenced but nothing has resolved to pixels yet → still
  // processing (show the placeholder instead of an empty/partial card).
  const mediaPending = resolved.length > 0 && readyMedia.length === 0;

  const author = useMemo<XAuthor>(
    () => ({
      name: authorName(connection),
      username: connection.username,
      avatar_url: connection.avatar_url,
      verified,
    }),
    [connection, verified],
  );

  // react-tweet transforms media src for Twitter's CDN; map that transform back
  // to our raw url so customer/compose-time media renders.
  const components = useMemo<TwitterComponents>(
    () => ({
      MediaImg: makeRawMediaImg(rawSrcLookup(readyMedia, readyQuotedMedia)),
      ...componentsProp,
    }),
    [readyMedia, readyQuotedMedia, componentsProp],
  );

  const tweet = useMemo(() => {
    const resolvedQuoted = quotedTweet
      ? {
          author: {
            name: quotedTweet.name,
            username: quotedTweet.username,
            avatar_url: quotedTweet.avatar_url,
          },
          body: quotedTweet.body,
          media: readyQuotedMedia,
        }
      : undefined;

    return enrichTweet(
      toTweet({
        variant,
        author,
        media: readyMedia,
        quotedTweet: resolvedQuoted,
        replyToHandle,
      }),
    );
  }, [variant, author, readyMedia, quotedTweet, readyQuotedMedia, replyToHandle]);

  // With nothing typed and no media/poll/quote, react-tweet would render an empty
  // body — a hollow card. Show X's own composer prompt (muted) instead.
  const isEmpty =
    !variant.body &&
    resolved.length === 0 &&
    !variant.settings?.poll &&
    !tweet.quoted_tweet;

  return (
    <div
      data-theme={theme === 'auto' ? undefined : theme}
      className={className}
      style={style}
    >
      <TweetContainer>
        <TweetHeader tweet={tweet} components={components} />
        {tweet.in_reply_to_screen_name ? <TweetInReplyTo tweet={tweet} /> : null}
        {isEmpty ? <EmptyBody /> : <TweetBody tweet={tweet} />}
        {tweet.mediaDetails?.length ? (
          <TweetMedia tweet={tweet} components={components} />
        ) : null}
        {mediaPending ? <ProcessingTile /> : null}
        {/* Poll is mutually exclusive with media/quote/card (enforced by the
            contract), so it renders in their place. */}
        {variant.settings?.poll ? <XPoll poll={variant.settings.poll} /> : null}
        {tweet.quoted_tweet ? <QuotedTweet tweet={tweet.quoted_tweet} /> : null}
        {showActions ? <XPreviewActions /> : null}
      </TweetContainer>
    </div>
  );
}

/** The processing-media tile, shown when media is attached but its X rendition
 * isn't ready. A 16:9 frame (X's common media aspect) reserves the space so the
 * card doesn't jump when the pixels land. The fill is a quiet theme-aware grey
 * (NOT X's brand blue) so the "Processing media…" line reads clearly. */
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

/**
 * X's composer prompt, shown in the body slot when the post is empty.
 */
function EmptyBody() {
  return <p style={emptyBodyStyle}>What&apos;s happening?</p>;
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

/** Memoized: re-renders only when its props change. */
export const XPostPreview = memo(XPostPreviewImpl);

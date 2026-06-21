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

import type {
  PreviewMedia,
  XPreviewAuthor,
  XPreviewQuotedTweet,
  XPreviewVariant,
} from '../types';
import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { XPoll } from './XPoll';
import { XPreviewActions } from './XPreviewActions';
import { makeRawMediaImg, rawSrcLookup } from './raw-media';
import { toTweet } from './to-tweet';

export interface XPostPreviewProps {
  /** The X variant — either a compose-time write variant or a fetched read
   * variant (both carry the typed settings/body the card renders). */
  variant: XPreviewVariant;
  /** Author identity (not stored on our connection — supplied by you). */
  author: XPreviewAuthor;
  /** Resolved media pixels (URLs or compose-time File blobs). */
  media?: PreviewMedia[];
  /** Content for the quoted card when `settings.quote_tweet_id` is set. */
  quotedTweet?: XPreviewQuotedTweet;
  /** The replied-to account's handle (our schema only stores the parent id). */
  replyToHandle?: string;
  /** Color scheme. `auto` (default) follows the OS color scheme (light/dark) —
   * the same resolution every Postrun preview card uses. */
  theme?: 'light' | 'dark' | 'auto';
  /** Show the static action row (icons, no counts). Default true. */
  showActions?: boolean;
  /** Class applied to the wrapper — your hook for sizing, shadows, etc. */
  className?: string;
  /** Inline styles on the wrapper — e.g. react-tweet CSS variables
   * (`{ ['--tweet-container-margin']: '0' }`). */
  style?: CSSProperties;
  /** Override react-tweet's internal pieces (e.g. `next/image` avatars). */
  components?: TwitterComponents;
}

/**
 * A faithful, pixel-accurate preview of how an X post will look once published,
 * rendered straight from a Postrun X variant. Built on `react-tweet` (the same
 * card X itself ships), so you write zero card UI — pass the schema, render the
 * preview. Fully customizable: restyle via `className`/`style` (CSS variables)
 * or swap internals via `components`; theme light/dark/auto.
 */
function XPostPreviewImpl({
  variant,
  author,
  media,
  quotedTweet,
  replyToHandle,
  theme = 'auto',
  showActions = true,
  className,
  style,
  components: componentsProp,
}: XPostPreviewProps) {
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );
  const resolvedQuotedMedia = useResolvedMedia(quotedTweet?.media, undefined, '');

  // react-tweet transforms media src for Twitter's CDN; map that transform back
  // to our raw url so customer/compose-time media renders. Customer `components`
  // override still wins (spread last).
  const components = useMemo<TwitterComponents>(
    () => ({
      MediaImg: makeRawMediaImg(
        rawSrcLookup(resolvedMedia, resolvedQuotedMedia),
      ),
      ...componentsProp,
    }),
    [resolvedMedia, resolvedQuotedMedia, componentsProp],
  );

  const tweet = useMemo(() => {
    const resolvedQuoted = quotedTweet
      ? {
          author: quotedTweet.author,
          body: quotedTweet.body,
          media: resolvedQuotedMedia,
        }
      : undefined;

    return enrichTweet(
      toTweet({
        variant,
        author,
        media: resolvedMedia,
        quotedTweet: resolvedQuoted,
        replyToHandle,
      }),
    );
  }, [
    variant,
    author,
    resolvedMedia,
    quotedTweet,
    resolvedQuotedMedia,
    replyToHandle,
  ]);

  // With nothing typed and no media/poll/quote, react-tweet would render an empty
  // body — a hollow card. Show X's own composer prompt (muted) instead, so the
  // empty state reads as intentional. Media/poll/quote each fill the card on their
  // own, so the prompt only appears when the post is truly empty.
  const isEmpty =
    !variant.body &&
    resolvedMedia.length === 0 &&
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
        {/* Poll is mutually exclusive with media/quote/card (enforced by the
            contract), so it renders in their place. */}
        {variant.settings?.poll ? <XPoll poll={variant.settings.poll} /> : null}
        {tweet.quoted_tweet ? <QuotedTweet tweet={tweet.quoted_tweet} /> : null}
        {showActions ? <XPreviewActions /> : null}
      </TweetContainer>
    </div>
  );
}

/**
 * X's composer prompt, shown in the body slot when the post is empty. It reuses
 * react-tweet's own body CSS variables (`--tweet-body-*`) so it sits at the exact
 * size/position the real body would, and its `--tweet-font-color-secondary` color
 * tracks the card's light/dark/auto theme — no layout shift when the user types.
 */
function EmptyBody() {
  return (
    <p style={emptyBodyStyle}>What&apos;s happening?</p>
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

/** Memoized: re-renders only when its props change (the resolved-media hook
 * already absorbs unstable media arrays). */
export const XPostPreview = memo(XPostPreviewImpl);

'use client';

import type { XPostVariant } from '@postrun/js';
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
} from '../types';
import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { XPoll } from './XPoll';
import { XPreviewActions } from './XPreviewActions';
import { toTweet } from './to-tweet';

export interface XPostPreviewProps {
  /** The X variant from our schema — the content source, untouched. */
  variant: XPostVariant;
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
  components,
}: XPostPreviewProps) {
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );
  const resolvedQuotedMedia = useResolvedMedia(quotedTweet?.media, undefined, '');

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

  return (
    <div
      data-theme={theme === 'auto' ? undefined : theme}
      className={className}
      style={style}
    >
      <TweetContainer>
        <TweetHeader tweet={tweet} components={components} />
        {tweet.in_reply_to_screen_name ? <TweetInReplyTo tweet={tweet} /> : null}
        <TweetBody tweet={tweet} />
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

/** Memoized: re-renders only when its props change (the resolved-media hook
 * already absorbs unstable media arrays). */
export const XPostPreview = memo(XPostPreviewImpl);

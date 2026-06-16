'use client';

import type { XPostVariant } from '@postrun/js';
import { memo, useEffect, useMemo, useState } from 'react';
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
  XPreviewAuthor,
  XPreviewMedia,
  XPreviewQuotedTweet,
} from '../types';
import { XPreviewActions } from './XPreviewActions';
import { type ResolvedMedia, toTweet } from './to-tweet';

export interface XPostPreviewProps {
  /** The X variant from our schema — the content source, untouched. */
  variant: XPostVariant;
  /** Author identity (not stored on our connection — supplied by you). */
  author: XPreviewAuthor;
  /** Resolved media pixels (URLs or compose-time File blobs). */
  media?: XPreviewMedia[];
  /** Content for the quoted card when `settings.quote_tweet_id` is set. */
  quotedTweet?: XPreviewQuotedTweet;
  /** The replied-to account's handle (our schema only stores the parent id). */
  replyToHandle?: string;
  /** Color scheme. `auto` (default) inherits the host's theme. */
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

/** Build a content signature so object-URL work only re-runs when the media
 * actually changes — not on every parent re-render that passes a new array. */
function mediaSignature(media: readonly XPreviewMedia[] | undefined): string {
  return (media ?? [])
    .map((item) => {
      const source = item.url ?? fileKey(item.file);
      const size = `${item.width ?? ''}x${item.height ?? ''}`;
      return `${item.kind}|${source}|${item.posterUrl ?? ''}|${size}|${item.alt ?? ''}`;
    })
    .join('§');
}

function fileKey(file: File | undefined): string {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
}

/**
 * Resolve each media item to a concrete `src`, minting an object URL for any
 * compose-time `File` and revoking it on change/unmount. Keyed on the content
 * signature, so a parent re-render with the same media neither re-creates URLs
 * nor re-renders the card.
 */
function useResolvedMedia(
  media: readonly XPreviewMedia[] | undefined,
): ResolvedMedia[] {
  const signature = mediaSignature(media);
  const [resolved, setResolved] = useState<ResolvedMedia[]>([]);

  useEffect(() => {
    const created: string[] = [];
    const items = (media ?? []).flatMap((item): ResolvedMedia[] => {
      let src = item.url;
      if (!src && item.file) {
        src = URL.createObjectURL(item.file);
        created.push(src);
      }
      if (!src) {
        return [];
      }
      return [
        {
          kind: item.kind,
          src,
          width: item.width,
          height: item.height,
          alt: item.alt,
          posterSrc: item.posterUrl,
        },
      ];
    });

    setResolved(items);
    return () => {
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
    // `signature` captures every field that affects the resolved output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return resolved;
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
  const resolvedMedia = useResolvedMedia(media);
  const resolvedQuotedMedia = useResolvedMedia(quotedTweet?.media);

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
        {tweet.quoted_tweet ? <QuotedTweet tweet={tweet.quoted_tweet} /> : null}
        {showActions ? <XPreviewActions /> : null}
      </TweetContainer>
    </div>
  );
}

/** Memoized: re-renders only when its props change (the resolved-media hook
 * already absorbs unstable media arrays). */
export const XPostPreview = memo(XPostPreviewImpl);

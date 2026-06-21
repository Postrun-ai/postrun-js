import type { TwitterComponents } from 'react-tweet';

import type { ResolvedMedia } from '../types';

/**
 * react-tweet renders media `src` through its `getMediaUrl`, which rewrites the
 * path and appends `?format=&name=` — correct ONLY for `pbs.twimg.com` (Twitter's
 * resize CDN). For our synthesized tweets the media is a customer CDN url or a
 * compose-time `blob:` object URL, and that transform 404s the image (the file
 * extension is stripped from the path) or invalidates the blob.
 *
 * react-tweet doesn't let us bypass `getMediaUrl`, and the `MediaImg` override
 * only receives the already-transformed `src`. So we map react-tweet's transform
 * OUTPUT back to our raw url: `twitterMediaUrl(raw)` reproduces exactly what
 * react-tweet will pass to `MediaImg`, and `makeRawMediaImg` looks the raw url
 * back up. Exact for signed URLs, blobs, and any extension; falls back to the
 * given src on a miss (never crashes).
 */

/** A copy of react-tweet@3.3.1's `getMediaUrl(media, 'small')` so the lookup keys
 * match byte-for-byte what react-tweet produces. Pure; never throws. */
export function twitterMediaUrl(src: string): string {
  try {
    const url = new URL(src);
    const extension = url.pathname.split('.').pop();
    if (!extension) {
      return src;
    }
    url.pathname = url.pathname.replace(`.${extension}`, '');
    url.searchParams.set('format', extension);
    url.searchParams.set('name', 'small');
    return url.toString();
  } catch {
    return src;
  }
}

/** Build the transformed-src → raw-src lookup for a set of resolved media (image
 * src and any video poster). */
export function rawSrcLookup(
  ...lists: readonly (readonly ResolvedMedia[])[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const list of lists) {
    for (const item of list) {
      const poster = item.posterSrc ?? item.src;
      map.set(twitterMediaUrl(item.src), item.src);
      map.set(twitterMediaUrl(poster), poster);
    }
  }
  return map;
}

/** A `MediaImg` that renders our raw url instead of react-tweet's CDN-transformed
 * one (looked up from `rawBySrc`), so customer/compose-time media loads. */
export function makeRawMediaImg(
  rawBySrc: Map<string, string>,
): NonNullable<TwitterComponents['MediaImg']> {
  return function RawMediaImg(props) {
    const raw =
      typeof props.src === 'string'
        ? (rawBySrc.get(props.src) ?? props.src)
        : props.src;
    return <img {...props} src={raw} />;
  };
}

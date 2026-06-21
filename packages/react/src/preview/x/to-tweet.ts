import type { XPostVariant } from '@postrun/js';
import type {
  MediaAnimatedGif,
  MediaDetails,
  MediaPhoto,
  MediaVideo,
  QuotedTweet,
  Tweet,
  TweetUser,
  VideoInfo,
} from 'react-tweet/api';

import type { ResolvedMedia, XPreviewAuthor } from '../types';
import { extractEntities } from './entities';

/**
 * Maps a Postrun X variant (+ the customer-supplied author/media) into the
 * `Tweet` object `react-tweet` renders. This is the whole "schema → exact X
 * preview" brain: a PURE function, no DOM, no network, no `File` handling (the
 * component resolves pixels to URLs before calling this). Every field
 * `react-tweet` reads is filled with a real value — no casts — and engagement
 * metrics are honest zeros (a draft has no likes).
 */

/** Quoted-card content with media already resolved. */
export interface ResolvedQuotedTweet {
  author: XPreviewAuthor;
  body?: string;
  media?: ResolvedMedia[];
}

export interface ToTweetInput {
  variant: XPostVariant;
  author: XPreviewAuthor;
  media?: ResolvedMedia[];
  quotedTweet?: ResolvedQuotedTweet;
  /** The replied-to account's handle (our schema only stores the parent id). */
  replyToHandle?: string;
}

/** Neutral placeholder avatar (a grey circle) for when no avatar is supplied —
 * keeps the header from showing a broken image. */
const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
      '<circle cx="24" cy="24" r="24" fill="#cfd9de"/></svg>',
  );

/** Fallback pixel dimensions when the customer doesn't know the asset's size —
 * a 3:2 frame keeps react-tweet's aspect-ratio math from dividing by zero. */
const FALLBACK_WIDTH = 1200;
const FALLBACK_HEIGHT = 800;

/** Length in Unicode codepoints (astral-aware), matching how react-tweet slices
 * the body via `Array.from(text)`. */
function codepointLength(text: string): number {
  return Array.from(text).length;
}

function buildUser(author: XPreviewAuthor): TweetUser {
  const verified = author.verified ?? false;
  return {
    id_str: '',
    name: author.name,
    profile_image_url_https: author.avatar_url ?? PLACEHOLDER_AVATAR,
    profile_image_shape: 'Circle',
    // `username`/`avatar_url` derive from the SDK Connection and are nullable.
    screen_name: author.username ?? '',
    // Legacy (pre-X-era) verification flag — always false for organic posts; the
    // X Blue checkmark rides on `is_blue_verified`.
    verified: false,
    is_blue_verified: verified,
  };
}

/** The fields shared by every media kind, contextually typed (derived from
 * `MediaPhoto`) so tuple/literal fields infer correctly without a cast. */
function mediaBase(
  src: string,
  width?: number,
  height?: number,
): Omit<MediaPhoto, 'type' | 'ext_alt_text'> {
  const w = width ?? FALLBACK_WIDTH;
  const h = height ?? FALLBACK_HEIGHT;
  const size = { h, w, resize: 'fit' };
  return {
    display_url: '',
    expanded_url: '',
    ext_media_availability: { status: 'available' },
    ext_media_color: { palette: [] },
    indices: [0, 0],
    media_url_https: src,
    original_info: { height: h, width: w, focus_rects: [] },
    sizes: { large: size, medium: size, small: size, thumb: size },
    url: src,
  };
}

function buildPhoto(media: ResolvedMedia): MediaPhoto {
  return {
    ...mediaBase(media.src, media.width, media.height),
    type: 'photo',
    ext_alt_text: media.alt,
  };
}

function buildVideo(media: ResolvedMedia): MediaVideo | MediaAnimatedGif {
  const poster = media.posterSrc ?? media.src;
  const videoInfo: VideoInfo = {
    aspect_ratio: [media.width ?? 16, media.height ?? 9],
    variants: [{ content_type: 'video/mp4', url: media.src }],
  };
  const base = mediaBase(poster, media.width, media.height);
  return media.kind === 'gif'
    ? { ...base, type: 'animated_gif', video_info: videoInfo }
    : { ...base, type: 'video', video_info: videoInfo };
}

function buildMediaDetails(media: readonly ResolvedMedia[]): MediaDetails[] {
  return media.map((item) =>
    item.kind === 'image' ? buildPhoto(item) : buildVideo(item),
  );
}

/** The static, draft-honest scaffolding every synthesized tweet shares. */
function tweetScaffold(): Pick<
  Tweet,
  | 'lang'
  | 'created_at'
  | 'edit_control'
  | 'isEdited'
  | 'isStaleEdit'
  | 'favorite_count'
  | 'conversation_count'
  | 'news_action_type'
> {
  return {
    lang: 'en',
    created_at: '',
    edit_control: {
      edit_tweet_ids: [],
      editable_until_msecs: '0',
      is_edit_eligible: false,
      edits_remaining: '0',
    },
    isEdited: false,
    isStaleEdit: false,
    favorite_count: 0,
    conversation_count: 0,
    news_action_type: 'conversation',
  };
}

function buildQuoted(
  quote: ResolvedQuotedTweet | undefined,
  hasQuoteId: boolean,
): QuotedTweet | undefined {
  if (!quote && !hasQuoteId) {
    return undefined;
  }

  const author = quote?.author ?? {
    name: 'Quoted post',
    username: '',
    avatar_url: null,
  };
  const body = quote?.body ?? '';
  const media = quote?.media ?? [];

  return {
    lang: 'en',
    created_at: '',
    display_text_range: [0, codepointLength(body)],
    entities: extractEntities(body),
    id_str: '',
    text: body,
    user: buildUser(author),
    edit_control: {
      edit_tweet_ids: [],
      editable_until_msecs: '0',
      is_edit_eligible: false,
      edits_remaining: '0',
    },
    isEdited: false,
    isStaleEdit: false,
    reply_count: 0,
    retweet_count: 0,
    favorite_count: 0,
    self_thread: { id_str: '' },
    ...(media.length > 0 ? { mediaDetails: buildMediaDetails(media) } : {}),
  };
}

export function toTweet(input: ToTweetInput): Tweet {
  const { variant, author, media = [], quotedTweet, replyToHandle } = input;
  const text = variant.body ?? '';
  const mediaDetails = buildMediaDetails(media);
  const quoted = buildQuoted(
    quotedTweet,
    variant.settings?.quote_tweet_id !== undefined,
  );
  const reply = variant.settings?.reply;

  return {
    __typename: 'Tweet',
    ...tweetScaffold(),
    // Codepoint length, not `text.length` (UTF-16) — react-tweet renders the
    // body off `Array.from(text)`, so emoji must not shift the range.
    display_text_range: [0, codepointLength(text)],
    entities: extractEntities(text),
    id_str: '',
    text,
    user: buildUser(author),
    ...(mediaDetails.length > 0 ? { mediaDetails } : {}),
    ...(quoted ? { quoted_tweet: quoted } : {}),
    // Both the handle AND the parent id are needed: enrichTweet builds the
    // reply link as `…/${screen_name}/status/${status_id_str}`, so omitting the
    // id yields a `/status/undefined` href.
    ...(reply && replyToHandle
      ? {
          in_reply_to_screen_name: replyToHandle,
          in_reply_to_status_id_str: reply.in_reply_to_tweet_id,
        }
      : {}),
  };
}

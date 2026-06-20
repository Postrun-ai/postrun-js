'use client';

import { memo } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { altSignatureOf, useResolvedMedia } from '../use-resolved-media';
import { Caption } from './Caption';
import { Media } from './Media';
import {
  BookmarkIcon,
  CommentIcon,
  HeartIcon,
  MusicNoteIcon,
  PlusIcon,
  ShareIcon,
} from './icons';
import type { TikTokPostPreviewProps } from './types';

/**
 * A faithful preview of how a TikTok post will look, rendered straight from our
 * Post object + the live creator info. Mirrors TikTok's MOBILE layout: a 9:16
 * media card (unmodified video or photo carousel) with the action rail overlaid
 * on the right (over the video, so the white glyphs always have dark pixels
 * behind them) and the username / caption / labels / music row bottom-left.
 *
 * The commercial label ("Paid partnership" / "Promotional content") and the AIGC
 * label ("Creator labeled as AI-generated") are derived from the post's
 * `settings`; counts read `‑‑‑` (the post isn't live — never fabricated numbers).
 */

/** TikTok shows dashes for engagement counts in its pre-post preview. */
const DASH = '‑‑‑';

/** The commercial-content label TikTok stamps on a disclosed post, derived from
 * the disclosure toggles in our Post object. Paid partnership wins over own-brand. */
function commercialLabel(
  settings: TikTokPostPreviewProps['variant']['settings'],
): string | null {
  if (settings?.brand_content_toggle) {
    return 'Paid partnership';
  }
  if (settings?.brand_organic_toggle) {
    return 'Promotional content';
  }
  return null;
}

function TikTokPostPreviewImpl({
  variant,
  creatorInfo,
  media,
  className,
  style,
}: TikTokPostPreviewProps) {
  const resolvedMedia = useResolvedMedia(
    media,
    variant.media,
    altSignatureOf(variant.media),
  );

  const { creator } = creatorInfo;
  const handle = creator.username || creator.nickname;
  const label = commercialLabel(variant.settings);
  const isAigc = Boolean(variant.settings?.is_aigc);
  // Media referenced but not yet resolved to pixels → still processing.
  const pending = (media?.length ?? 0) > 0 && resolvedMedia.length === 0;

  return (
    <div className={className} style={{ ...cardStyle, ...style }}>
      <style>{KEYFRAMES}</style>
      <Media media={resolvedMedia} pending={pending} />
      <div style={scrimStyle} />

      {/* bottom-left: username, caption, labels, music row */}
      <div style={infoStyle}>
        <div style={usernameStyle}>{handle}</div>
        {variant.body ? <Caption body={variant.body} /> : null}
        {label || isAigc ? (
          <div style={labelsStyle}>
            {label ? <span style={pillStyle}>{label}</span> : null}
            {isAigc ? (
              <span style={pillStyle}>Creator labeled as AI-generated</span>
            ) : null}
          </div>
        ) : null}
        <div style={musicRowStyle}>
          <MusicNoteIcon size={13} />
          <span>Original sound - {creator.nickname}</span>
        </div>
      </div>

      {/* action rail — overlaid on the right of the video (mobile) */}
      <div style={railStyle}>
        <div style={avatarWrapStyle}>
          <Avatar url={creator.avatar_url} name={creator.nickname} />
          <span style={followBadgeStyle}>
            <PlusIcon size={14} />
          </span>
        </div>
        <RailAction icon={<HeartIcon size={30} />} count={DASH} />
        <RailAction icon={<CommentIcon size={30} />} count={DASH} />
        <RailAction icon={<BookmarkIcon size={28} />} count={DASH} />
        <RailAction icon={<ShareIcon size={28} />} count={DASH} />
        <Disc url={creator.avatar_url} />
      </div>
    </div>
  );
}

function RailAction({ icon, count }: { icon: ReactNode; count: string }) {
  return (
    <div style={railActionStyle}>
      <span style={railIconStyle}>{icon}</span>
      <span style={railCountStyle}>{count}</span>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} style={avatarStyle} />;
  }
  return (
    <div style={{ ...avatarStyle, ...avatarFallbackStyle }}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** The spinning music disc at the bottom of the rail (avatar inside a vinyl). */
function Disc({ url }: { url: string | null }) {
  return (
    <div style={discStyle}>
      {url ? <img src={url} alt="" style={discImgStyle} /> : null}
    </div>
  );
}

const cardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 320,
  aspectRatio: '9 / 16',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#000',
  color: '#fff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const scrimStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
  pointerEvents: 'none',
};

const infoStyle: CSSProperties = {
  position: 'absolute',
  left: 14,
  right: 70,
  bottom: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
};

const usernameStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 16,
};

const labelsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  marginTop: 2,
};

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.18)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 500,
  padding: '2px 7px',
  borderRadius: 4,
};

const musicRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  marginTop: 4,
};

const railStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  bottom: 14,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  color: '#fff',
};

const avatarWrapStyle: CSSProperties = {
  position: 'relative',
  marginBottom: 8,
};

const avatarStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid rgba(255,255,255,0.2)',
};

const avatarFallbackStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  background: '#3a3a40',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
};

const followBadgeStyle: CSSProperties = {
  position: 'absolute',
  bottom: -9,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 19,
  height: 19,
  borderRadius: '50%',
  background: '#fe2c55',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
};

const railActionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
};

const railIconStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
};

const railCountStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
};

const discStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #555 0 36%, #111 37% 100%)',
  display: 'grid',
  placeItems: 'center',
  marginTop: 2,
  animation: 'pr-tt-spin 4s linear infinite',
};

const discImgStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  objectFit: 'cover',
};

const KEYFRAMES = `@keyframes pr-tt-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes pr-tt-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`;

/** Memoized: the resolved-media hook absorbs unstable media arrays. */
export const TikTokPostPreview = memo(TikTokPostPreviewImpl);

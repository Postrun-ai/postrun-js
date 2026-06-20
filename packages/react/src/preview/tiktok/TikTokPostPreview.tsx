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
  PlusIcon,
  ShareIcon,
} from './icons';
import type { TikTokPostPreviewProps } from './types';

/**
 * A faithful preview of how a TikTok post will look, rendered straight from our
 * Post object + the live creator info. The layout mirrors TikTok's real web UI:
 * a rounded 9:16 media card (unmodified video or photo carousel) with the
 * username + description overlaid bottom-left, and the action rail as a separate
 * column to the RIGHT of the card (avatar + follow, like/comment/favorite/share
 * with counts, music disc). Counts read 0 — the honest state of an unpublished
 * post (no fabricated vanity metrics).
 *
 * Editable caption, audience/interaction read-outs, the commercial label, the
 * consent declaration, and the consent-gated Post button arrive in later chunks.
 */
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

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <style>{KEYFRAMES}</style>

      {/* video / photo card */}
      <div style={cardStyle}>
        <Media media={resolvedMedia} />
        <div style={scrimStyle} />
        <div style={infoStyle}>
          <div style={usernameStyle}>{handle}</div>
          {variant.body ? <Caption body={variant.body} /> : null}
        </div>
      </div>

      {/* action rail — a column to the RIGHT of the card */}
      <div style={railStyle}>
        <div style={avatarWrapStyle}>
          <Avatar url={creator.avatar_url} name={creator.nickname} />
          <span style={followBadgeStyle}>
            <PlusIcon size={14} />
          </span>
        </div>
        <RailAction icon={<HeartIcon size={32} />} count="0" />
        <RailAction icon={<CommentIcon size={32} />} count="0" />
        <RailAction icon={<BookmarkIcon size={30} />} count="0" />
        <RailAction icon={<ShareIcon size={30} />} count="0" />
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

const CARD_W = 320;

const containerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'flex-end',
  gap: 8,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const cardStyle: CSSProperties = {
  position: 'relative',
  width: CARD_W,
  aspectRatio: '9 / 16',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#000',
  color: '#fff',
  flex: '0 0 auto',
};

const scrimStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)',
  pointerEvents: 'none',
};

const infoStyle: CSSProperties = {
  position: 'absolute',
  left: 14,
  right: 14,
  bottom: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
};

const usernameStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 16,
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
  paddingBottom: 6,
  color: 'rgba(255,255,255,0.92)',
};

const avatarWrapStyle: CSSProperties = {
  position: 'relative',
  marginBottom: 10,
};

const avatarStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  objectFit: 'cover',
  display: 'block',
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
  bottom: -10,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 20,
  height: 20,
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
  gap: 4,
};

const railIconStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
};

const railCountStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
};

const discStyle: CSSProperties = {
  width: 46,
  height: 46,
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

const KEYFRAMES = `@keyframes pr-tt-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;

/** Memoized: the resolved-media hook absorbs unstable media arrays. */
export const TikTokPostPreview = memo(TikTokPostPreviewImpl);

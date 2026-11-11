'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { TikTokCreatorInfo } from '@postrun/js';

import { createPreviewContext } from '../context';
import { resolveVariantMedia } from '../media-resolver';
import { isReadyMedia, type ReadyMedia, type TikTokPreviewVariant } from '../types';
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
import type { TikTokPostPreviewProps, TikTokPreviewRootProps } from './types';

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
 *
 * Composable: `<TikTokPostPreview>` is `<TikTokPreviewRoot>` wrapping the
 * Content, Body, and Actions parts. Render the Root yourself to reorder, drop, or
 * replace any part; your own parts read the same data through
 * `useTikTokPreview()`. Body and Actions are positioned over the media, so a
 * replacement positions itself.
 */
/** TikTok shows dashes for engagement counts in its pre-post preview. */
const DASH = '‑‑‑';

/** What every TikTok part renders from — read it in your own parts with
 * `useTikTokPreview()`. */
export interface TikTokPreviewData {
  variant: TikTokPreviewVariant;
  creator: TikTokCreatorInfo['creator'];
  /** The @handle shown on the post (username, else nickname). */
  handle: string;
  /** "Paid partnership" / "Promotional content", from the disclosure settings. */
  commercialLabel: string | null;
  /** The creator labeled the post as AI-generated. */
  isAigc: boolean;
  /** The attached media whose TikTok rendition is ready to show. */
  media: readonly ReadyMedia[];
  /** Media is attached, but none of it has a TikTok rendition yet. */
  mediaPending: boolean;
}

const [TikTokPreviewProvider, useTikTokPreview] =
  createPreviewContext<TikTokPreviewData>('TikTokPreviewRoot');
export { useTikTokPreview };

/** The commercial-content label TikTok stamps on a disclosed post, derived from
 * the disclosure toggles in our Post object. Paid partnership wins over own-brand. */
function commercialLabel(
  settings: TikTokPreviewVariant['settings'],
): string | null {
  if (settings?.is_branded_content) {
    return 'Paid partnership';
  }
  if (settings?.is_brand_organic) {
    return 'Promotional content';
  }
  return null;
}

/** The 9:16 phone frame and the data every part reads. */
export function TikTokPreviewRoot({
  variant,
  creatorInfo,
  media,
  className,
  style,
  children,
}: TikTokPreviewRootProps) {
  const resolved = useMemo(
    () => resolveVariantMedia(variant.media, 'tiktok', media),
    [variant.media, media],
  );

  const data = useMemo<TikTokPreviewData>(() => {
    const { creator } = creatorInfo;
    const ready = resolved.filter(isReadyMedia);
    return {
      variant,
      creator,
      handle: creator.username || creator.nickname,
      commercialLabel: commercialLabel(variant.settings),
      isAigc: Boolean(variant.settings?.is_ai_generated),
      media: ready,
      mediaPending: resolved.length > 0 && ready.length === 0,
    };
  }, [variant, resolved, creatorInfo]);

  return (
    <TikTokPreviewProvider value={data}>
      <div className={className} style={{ ...cardStyle, ...style }}>
        <style>{KEYFRAMES}</style>
        {children}
      </div>
    </TikTokPreviewProvider>
  );
}

/** The full-bleed video or photo carousel (or its processing tile), with the
 * bottom scrim that keeps the overlaid text readable. */
export function TikTokPreviewContent() {
  const { media, mediaPending } = useTikTokPreview();
  return (
    <>
      <Media media={media} pending={mediaPending} />
      <div style={scrimStyle} />
    </>
  );
}

/** Bottom-left overlay: handle, caption, disclosure labels, and the sound row. */
export function TikTokPreviewBody() {
  const { variant, creator, handle, commercialLabel: label, isAigc } =
    useTikTokPreview();
  return (
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
  );
}

/** The right-hand rail: avatar + follow badge, the count-less actions, and the
 * spinning sound disc. Overlaid on the media, as on mobile. */
export function TikTokPreviewActions() {
  const { creator } = useTikTokPreview();
  return (
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
  );
}

function TikTokPostPreviewImpl(props: TikTokPostPreviewProps) {
  return (
    <TikTokPreviewRoot {...props}>
      <TikTokPreviewContent />
      <TikTokPreviewBody />
      <TikTokPreviewActions />
    </TikTokPreviewRoot>
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

const KEYFRAMES = `@keyframes pr-tt-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;

/** Memoized: re-renders only when its props change. */
export const TikTokPostPreview = memo(TikTokPostPreviewImpl);

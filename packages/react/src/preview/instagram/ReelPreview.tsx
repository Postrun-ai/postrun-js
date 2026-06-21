import type { CSSProperties } from 'react';
import {
  FiBookmark,
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiSend,
} from 'react-icons/fi';
import { MdMusicNote, MdVerified } from 'react-icons/md';

import type { InstagramPreviewAuthor, ResolvedMedia } from '../types';

/**
 * An Instagram Reel preview — the 9:16 vertical card: full-bleed video, the
 * username/verified + caption overlaid bottom-left, an audio row ("♪ <audio>"),
 * and the right action rail (like/comment/share/save/more — no fabricated
 * counts). Always dark, like the real Reels surface.
 */
export function ReelPreview({
  author,
  body,
  media,
  audioName,
  className,
  style,
}: {
  author: InstagramPreviewAuthor;
  body: string;
  media: readonly ResolvedMedia[];
  audioName?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const first = media[0];
  const username = author.username ?? '';

  return (
    <div className={className} style={{ ...cardStyle, ...style }}>
      {first ? (
        first.kind === 'video' ? (
          <video
            src={first.src}
            poster={first.posterSrc}
            autoPlay
            muted
            loop
            playsInline
            style={coverStyle}
          />
        ) : (
          <img src={first.src} alt={first.alt ?? ''} style={coverStyle} />
        )
      ) : null}
      <div style={scrimStyle} />

      <div style={infoStyle}>
        <div style={authorRowStyle}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{username}</span>
          {author.verified ? (
            <MdVerified size={13} aria-label="Verified" role="img" style={{ color: '#fff' }} />
          ) : null}
        </div>
        {body ? <div style={captionStyle}>{body}</div> : null}
        <div style={audioStyle}>
          <MdMusicNote size={14} aria-hidden />
          <span>{audioName ?? 'Original audio'}</span>
        </div>
      </div>

      <div style={railStyle}>
        <FiHeart size={26} aria-label="Like" role="img" />
        <FiMessageCircle size={26} aria-label="Comment" role="img" />
        <FiSend size={26} aria-label="Share" role="img" />
        <FiBookmark size={26} aria-label="Save" role="img" />
        <FiMoreHorizontal size={22} aria-hidden />
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 320,
  aspectRatio: '9 / 16',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#000',
  color: '#fff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const coverStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const scrimStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)',
  pointerEvents: 'none',
};

const infoStyle: CSSProperties = {
  position: 'absolute',
  left: 12,
  right: 60,
  bottom: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
};

const authorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const captionStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const audioStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
};

const railStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  bottom: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
  color: '#fff',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
};

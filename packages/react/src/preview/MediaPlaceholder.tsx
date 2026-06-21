'use client';

import type { CSSProperties } from 'react';

/**
 * The shared empty / processing media tile every preview card shows when a post
 * has no resolved pixels yet. It fills its parent's ALREADY aspect-ratio-reserved
 * frame (`position: absolute; inset: 0`), so the card is the SAME size whether the
 * media is missing, still processing, or loaded — i.e. zero layout shift.
 *
 * Tone is caller-supplied (`color`/`background`) so it adapts to each surface:
 * a theme-aware feed panel (Instagram), or a dark overlay (TikTok / Reels). It is
 * deliberately ICON-FREE — a stock placeholder glyph is the #1 vibe-coded tell, so
 * the state is a single quiet line of text (matching the Reel/TikTok treatment).
 * `shimmer` animates the processing state.
 */
export function MediaPlaceholder({
  label,
  color,
  background,
  shimmer = false,
}: {
  /** The centered line, e.g. "No media yet" / "Processing media…". */
  label: string;
  /** Text color (a CSS var or literal). */
  color: string;
  /** Panel fill behind the content — a solid/gradient card, or `transparent`. */
  background: string;
  /** Animate the processing shimmer sweep. */
  shimmer?: boolean;
}) {
  return (
    <div style={{ ...fillStyle, background, color }}>
      {shimmer ? (
        <>
          <style>{SHIMMER_KEYFRAME}</style>
          <div style={shimmerStyle} />
        </>
      ) : null}
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

const SHIMMER_KEYFRAME =
  '@keyframes pr-media-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';

const fillStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const labelStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  fontSize: 13,
  letterSpacing: 0.1,
};

/** Theme-neutral sweep: `currentColor` at low alpha reads on light AND dark. */
const shimmerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(90deg, transparent 0%, color-mix(in srgb, currentColor 12%, transparent) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
  animation: 'pr-media-shimmer 1.4s ease-in-out infinite',
};

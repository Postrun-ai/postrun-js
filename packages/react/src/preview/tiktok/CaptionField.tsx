'use client';

import type { TikTokPostVariant } from '@postrun/js';
import { useId } from 'react';
import type { CSSProperties } from 'react';

/**
 * The editable TikTok caption — MUST #2: the caption stays editable up to the
 * moment of posting, and it two-way binds to the live preview (type → the card
 * overlay updates). Controlled: the host owns the value and passes the
 * `post_type` so the cap is correct (video title ≤ 2200, photo description ≤
 * 4000 — TikTok's two documented caps, mirrored from our publish contract).
 *
 * The count is UTF-16 code units (`value.length`), which is exactly what the API
 * gate measures, so the editor never disagrees with the server.
 */

/** Caption caps, mirrored from the publish contract (`BODY_MAX.tiktok_*`). The
 * server enforces these; the field surfaces them so the user never round-trips. */
export const TIKTOK_CAPTION_MAX = { video: 2200, photo: 4000 } as const;

/** The cap for a given post_type — video posts cap the title, photo posts the
 * (longer) description. */
export function captionMaxFor(postType: TikTokPostVariant['post_type']): number {
  return postType === 'video'
    ? TIKTOK_CAPTION_MAX.video
    : TIKTOK_CAPTION_MAX.photo;
}

export interface TikTokCaptionFieldProps {
  /** The caption text (controlled). */
  value: string;
  /** Fired on every edit — keep your variant `body` in sync with this. */
  onChange: (value: string) => void;
  /** Drives the cap (video → 2200, photo → 4000). */
  postType: TikTokPostVariant['post_type'];
  /** Placeholder shown when empty. */
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

export function TikTokCaptionField({
  value,
  onChange,
  postType,
  placeholder = 'Describe your post…',
  className,
  style,
}: TikTokCaptionFieldProps) {
  const id = useId();
  const max = captionMaxFor(postType);
  const count = value.length;
  const over = count > max;

  return (
    <div className={className} style={{ ...wrapStyle, ...style }}>
      <div style={labelRowStyle}>
        <label htmlFor={id} style={labelStyle}>
          Caption
        </label>
        <span style={{ ...countStyle, color: over ? '#fe2c55' : '#8a8a92' }}>
          {count.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          ...textareaStyle,
          borderColor: over ? '#fe2c55' : 'rgba(255,255,255,0.14)',
        }}
      />
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'inherit',
};

const countStyle: CSSProperties = {
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  resize: 'vertical',
  background: 'transparent',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  lineHeight: 1.4,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

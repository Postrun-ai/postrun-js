'use client';

import type {
  TikTokCreatorInfo,
  TikTokOptionsValue,
  TikTokPostVariant,
} from '@postrun/js';
import { brandedContentDeclared, tiktokOptionsReady, TIKTOK_PROCESSING_NOTICE } from '@postrun/js';
import type { CSSProperties } from 'react';

import { AudienceSelect } from './AudienceSelect';
import { captionMaxFor, TikTokCaptionField } from './CaptionField';
import { CommercialDisclosure } from './CommercialDisclosure';
import { Declaration } from './Declaration';
import { InteractionToggles } from './InteractionToggles';
import { type TikTokTheme, TT_VAR, paletteVars, useIsDark, varRef } from './theme';
import { Notice, Row, Switch, TOKENS } from './ui';

/**
 * The TikTok publish/confirmation panel — the Required-UX surface that turns a
 * preview into a compliant publish flow. It composes the editable caption (#2),
 * audience (#5), interaction (#6), commercial disclosure (#7), the video-only
 * AIGC toggle (SHOULD), the processing notice (#10), the consent declaration
 * directly above the button (#8), and the consent-gated Post button (#9) — which
 * fires `onPost` ONLY on an explicit click and is disabled until the post is
 * valid.
 *
 * All logic comes from `@postrun/js` (the single source); this is the render.
 */
export interface TikTokPublishPanelProps {
  /** The variant — drives post_type (caps, interaction set) + media count. */
  variant: TikTokPostVariant;
  /** Live creator info (audience options, interaction gates). */
  creatorInfo: TikTokCreatorInfo;
  /** Editable caption (controlled) + its setter. */
  caption: string;
  onCaptionChange: (value: string) => void;
  /** The TikTok options value (controlled) + its setter. */
  options: TikTokOptionsValue;
  onOptionsChange: (value: TikTokOptionsValue) => void;
  /** Fired ONLY on an explicit Post click — the affirmative-consent gate (#9). */
  onPost: () => void;
  /** Disable the button + show a busy label while a publish is in flight. */
  posting?: boolean;
  /** Colour scheme. `auto` (default) follows the OS preference. */
  theme?: TikTokTheme;
  className?: string;
  style?: CSSProperties;
}

/** Media-count validity per post_type (mirrors the publish contract). */
function mediaCountValid(
  postType: TikTokPostVariant['post_type'],
  count: number,
): boolean {
  if (postType === 'carousel') {
    return count >= 2 && count <= 35;
  }
  return count === 1; // video | single_image
}

export function TikTokPublishPanel({
  variant,
  creatorInfo,
  caption,
  onCaptionChange,
  options,
  onOptionsChange,
  onPost,
  posting = false,
  theme = 'auto',
  className,
  style,
}: TikTokPublishPanelProps) {
  const dark = useIsDark(theme);
  const isVideo = variant.post_type === 'video';

  const captionOver = caption.length > captionMaxFor(variant.post_type);
  const mediaOk = mediaCountValid(variant.post_type, variant.media?.length ?? 0);
  const ready = !captionOver && mediaOk && tiktokOptionsReady(options);

  return (
    <div
      className={className}
      style={{
        ...paletteVars(dark),
        ...panelStyle,
        color: varRef(TT_VAR.text),
        ...style,
      }}
    >
      <TikTokCaptionField
        value={caption}
        onChange={onCaptionChange}
        postType={variant.post_type}
      />

      <Divider />
      <AudienceSelect creatorInfo={creatorInfo} value={options} onChange={onOptionsChange} />

      <Divider />
      <InteractionToggles
        creatorInfo={creatorInfo}
        value={options}
        onChange={onOptionsChange}
        isVideo={isVideo}
      />

      <Divider />
      <CommercialDisclosure value={options} onChange={onOptionsChange} />

      {isVideo ? (
        <>
          <Divider />
          <Row
            label="AI-generated content"
            sublabel="Disclose if this video was created or substantially edited with AI."
            control={
              <Switch
                checked={options.aigc}
                ariaLabel="AI-generated content"
                onChange={(next) => onOptionsChange({ ...options, aigc: next })}
              />
            }
          />
        </>
      ) : null}

      <Divider />
      <Notice>{TIKTOK_PROCESSING_NOTICE}</Notice>

      {/* declaration sits DIRECTLY above the Post button (#8) */}
      <Declaration brandedContent={brandedContentDeclared(options)} />

      <button
        type="button"
        disabled={!ready || posting}
        onClick={onPost}
        style={{
          ...postButtonStyle,
          opacity: !ready || posting ? 0.5 : 1,
          cursor: !ready || posting ? 'not-allowed' : 'pointer',
        }}
      >
        {posting ? 'Posting…' : 'Post'}
      </button>
    </div>
  );
}

function Divider() {
  return <div style={dividerStyle} />;
}

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: '100%',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: TOKENS.BORDER,
};

const postButtonStyle: CSSProperties = {
  width: '100%',
  border: 0,
  borderRadius: 10,
  background: TOKENS.ACCENT,
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  padding: '12px 16px',
  transition: 'opacity 160ms ease',
};

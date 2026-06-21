import type { TikTokCreatorInfo } from '@postrun/js';
import type { CSSProperties } from 'react';

import type { PreviewMedia, TikTokPreviewVariant } from '../types';

/**
 * Public props for the TikTok post preview — a faithful render of how a post will
 * look on TikTok, driven straight from our Post object plus the live creator info
 * the Content-Posting policy requires the publishing UI to show.
 *
 * The component is presentational: the host collects the variant + creator info
 * (via `useTikTokCreatorInfo`) + resolves media pixels, and passes them in. Later
 * chunks add the editable caption + the consent-gated Post button.
 */
export interface TikTokPostPreviewProps {
  /** The TikTok variant — either a compose-time write variant or a fetched read
   * variant (both carry the typed settings/body the card renders). */
  variant: TikTokPreviewVariant;
  /** Live creator info (nickname/avatar, audience options, interaction flags). */
  creatorInfo: TikTokCreatorInfo;
  /** Resolved media pixels (processed URLs or compose-time File blobs). */
  media?: PreviewMedia[];
  /** Class applied to the phone frame — your hook for sizing. */
  className?: string;
  /** Inline styles on the frame. */
  style?: CSSProperties;
}

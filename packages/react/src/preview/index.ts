/**
 * Post-preview components — faithful, schema-driven previews of how a post will
 * look once published. Hooks do the data work; these render the platform card so
 * you don't have to reproduce it. X and LinkedIn ship today; the per-platform
 * input types are shared so the others slot in next.
 */
export { XPostPreview, XPoll } from './x';
export type { XPostPreviewProps, XPollProps } from './x';
export {
  LinkedInPostPreview,
  ArticleCard,
  Poll,
  DocumentCard,
} from './linkedin';
export type {
  LinkedInPostPreviewProps,
  ArticleCardProps,
  PollProps,
  DocumentCardProps,
} from './linkedin';
export {
  TikTokPostPreview,
  TikTokPublishPanel,
  TikTokCaptionField,
  AudienceSelect,
  InteractionToggles,
  CommercialDisclosure,
  Declaration,
  TIKTOK_CAPTION_MAX,
  captionMaxFor,
} from './tiktok';
export type {
  TikTokPostPreviewProps,
  TikTokPublishPanelProps,
  TikTokCaptionFieldProps,
  TikTokTheme,
} from './tiktok';
export type {
  XPreviewAuthor,
  LinkedInPreviewAuthor,
  PreviewMedia,
  XPreviewMedia,
  XPreviewQuotedTweet,
  PreviewMediaKind,
} from './types';

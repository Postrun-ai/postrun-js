/**
 * Post-preview components — faithful, schema-driven previews of how a post will
 * look once published. Each card takes the post `variant` + the posting
 * `Connection` (the author derives from it) and resolves its pixels from the SDK
 * `MediaResource` — a read variant carries its assets inline; a compose draft
 * passes the uploaded assets via `media` and is matched by id.
 */
export { resolveVariantMedia } from './media-resolver';
export { XPostPreview, XPoll } from './x';
export type { XPostPreviewProps, XPollProps } from './x';
export {
  LinkedInPostPreview,
  ArticleCard,
  Poll,
  DocumentCard,
} from './linkedin';
export { InstagramPostPreview, ReelPreview } from './instagram';
export type {
  InstagramPostPreviewProps,
  ReelPreviewProps,
  InstagramTheme,
} from './instagram';
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
export { isReadyMedia } from './types';
export type {
  PreviewConnection,
  ResolvedMedia,
  ReadyMedia,
  XPreviewQuotedTweet,
  PreviewMediaKind,
  ReadPostVariant,
  XPreviewVariant,
  LinkedInPreviewVariant,
  TikTokPreviewVariant,
  InstagramPreviewVariant,
} from './types';

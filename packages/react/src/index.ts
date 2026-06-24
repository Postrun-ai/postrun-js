/**
 * @postrun/react — React provider + hooks for the Postrun API.
 *
 * Wrap once with <PostrunProvider> (+ usePostrun()); the hooks do the data
 * fetching, caching, and orchestration:
 *   profiles     useProfiles · useProfilesInfinite · useProfile · useCreate/Update/DeleteProfile
 *   connections  useConnect · useConnections · useConnection · useDiscoverableAccounts · useSelectAccount · useDisconnect
 *   media        useMediaUpload · useMedia · useMediaList · useMediaInfinite · useUpdateMedia · useDeleteMedia
 *   posts        usePosts · usePostsInfinite · useCalendar · usePost · useCreate/Update/DeletePost
 *
 * `*Infinite` hooks paginate (load-more); calendar/post hooks poll live while a
 * post is publishing. Composite UI (composer, calendar grid) is yours to build.
 */
export { PostrunProvider, usePostrun } from './context';
export type {
  PostrunProviderProps,
  PostrunContextValue,
} from './context';

export {
  useProfiles,
  useProfilesInfinite,
  useProfile,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
} from './profiles';
export {
  useConnect,
  useConnections,
  useConnection,
  useDiscoverableAccounts,
  useSelectAccount,
  useDisconnect,
} from './connections';
export type {
  UseConnectParams,
  UseConnectResult,
  ConnectState,
} from './connections';
export type {
  ConnectErrorReason,
  ConnectOutcome,
  DiscoverableAccount,
} from './connect-machine';
export { Connect } from './Connect';
export type { ConnectProps, ConnectRenderApi } from './Connect';
export type { ConnectionsFilter } from './keys';
export {
  useMediaUpload,
  useMedia,
  useMediaList,
  useMediaInfinite,
  useUpdateMedia,
  useDeleteMedia,
} from './media';
export type {
  MediaUploadStatus,
  MediaUploadOptions,
  MediaUploadItem,
  UseMediaUploadResult,
  UseMediaUploadOptions,
} from './media';
export { UploadError } from '@postrun/js';
export {
  usePosts,
  usePostsInfinite,
  useCalendar,
  usePost,
  useCreatePost,
  useValidatePost,
  useUpdatePost,
  useDeletePost,
} from './posts';
export type { CalendarFilters, LiveOptions } from './posts';
export { useTikTokCreatorInfo } from './tiktok';
export type { TikTokCreatorInfo } from './tiktok';
export { useAdTree } from './ads';
export type { UseAdTreeParams, UseAdTreeResult } from './ads';
export type {
  PostValidation,
  ValidationIssue,
  PostVariant,
  PostVariantError,
} from '@postrun/js';
export { useInfiniteList } from './infinite-list';
export type { InfiniteList } from './infinite-list';

// The generated TanStack Query layer (`*Options`/`*Mutation`/`*QueryKey` for every
// operation — Google Ads included) + the `usePostrunQuery`/`usePostrunMutation`
// sugar that injects the provider's client (Bearer via getToken) + QueryClient.
export * from './query';
export {
  profileKeys,
  connectionKeys,
  mediaKeys,
  postKeys,
  tiktokKeys,
} from './keys';

export {
  XPostPreview,
  XPoll,
  LinkedInPostPreview,
  ArticleCard,
  Poll,
  DocumentCard,
  InstagramPostPreview,
  ReelPreview,
  TikTokPostPreview,
  TikTokPublishPanel,
  TikTokCaptionField,
  AudienceSelect,
  InteractionToggles,
  CommercialDisclosure,
  Declaration,
  TIKTOK_CAPTION_MAX,
  captionMaxFor,
  resolveVariantMedia,
  isReadyMedia,
} from './preview';
export type {
  XPostPreviewProps,
  XPollProps,
  LinkedInPostPreviewProps,
  ArticleCardProps,
  PollProps,
  DocumentCardProps,
  InstagramPostPreviewProps,
  ReelPreviewProps,
  InstagramTheme,
  TikTokPostPreviewProps,
  TikTokPublishPanelProps,
  TikTokCaptionFieldProps,
  TikTokTheme,
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
} from './preview';

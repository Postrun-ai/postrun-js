/**
 * @postrun/js — typed JavaScript client for the Postrun API.
 *
 *   import { createPostrunClient, postsCreate } from '@postrun/js';
 *   import { ... } from '@postrun/js/schemas';        // client-side validation
 *
 * The client + SDK are generated from the public OpenAPI spec with Hey API, so
 * every call is strongly typed end-to-end and can never drift. Resource-style
 * SDK functions (`profilesList`, `postsCreate`, …) take a `{ client }` made by
 * `createPostrunClient` and return `{ data }`, throwing a typed `PostrunError`
 * on failure.
 */
export { createPostrunClient } from './client';
export type { PostrunClient, PostrunClientOptions } from './client';

// Generated resource-style SDK functions (profilesList, postsCreate, …), named
// from the spec's operationIds. Call with `{ client, body, path, query }`.
export * from './client/sdk.gen';

// Generated per-operation request/response types (ProfilesCreateData,
// PostsGetResponse, …) for callers that want the raw contract shapes.
export type * from './client/types.gen';

export { PostrunError } from './errors';
export type {
  PostrunProblem,
  PostrunErrorCode,
  PostrunFieldError,
} from './errors';

export type {
  Profile,
  ProfileList,
  ListProfilesQuery,
  CreateProfileInput,
  UpdateProfileInput,
  Connection,
  ConnectionList,
  ListConnectionsQuery,
  ConnectionKind,
  ConnectionStatus,
  ConnectSession,
  ConnectablePlatform,
  DiscoverableAccountList,
  SelectAccountInput,
  PostVariantInput,
  XPostVariant,
  LinkedInPostVariant,
  Post,
  PostList,
  ListPostsQuery,
  PostStatus,
  CreatePostInput,
  UpdatePostInput,
  PostPlatform,
  PostTypeFor,
  SettingsFor,
  PublishMode,
  PostMetadata,
  MediaKind,
  MediaResource,
  MediaTarget,
  CreateMediaResult,
  UploadTarget,
  CreateMediaInput,
  UpdateMediaInput,
  MediaList,
  ListMediaQuery,
  MediaStatus,
  Metadata,
  MetadataFilter,
} from './resources';

export {
  buildCreatePost,
  buildUpdatePost,
  ComposeError,
  POST_PLATFORMS,
  isPostPlatform,
} from './compose';
export type {
  ComposePostInput,
  ComposeUpdateInput,
  PostContent,
  ChannelConfig,
  Channels,
  MediaInput,
  ConnectionRef,
} from './compose';

/**
 * @postrun/js — typed JavaScript client for the Postrun API.
 *
 *   import { createPostrunClient, unwrap } from '@postrun/js';
 *   import type { paths } from '@postrun/js';        // raw spec types
 *   import { ... } from '@postrun/js/schemas';        // client-side validation (soon)
 *
 * The client is built on openapi-fetch over types generated from the public
 * OpenAPI spec, so every call is strongly typed end-to-end.
 */
export { createPostrunClient } from './client';
export type { PostrunClient, PostrunClientOptions } from './client';

export { PostrunError, unwrap } from './errors';
export type { PostrunProblem } from './errors';

export type {
  Profile,
  ProfileList,
  ListProfilesQuery,
  CreateProfileInput,
  UpdateProfileInput,
  Connection,
  ConnectionList,
  ConnectSession,
  ConnectablePlatform,
  DiscoverableAccountList,
  SelectAccountInput,
  PostVariantInput,
  XPostVariant,
  Post,
  PostList,
  ListPostsQuery,
  CreatePostInput,
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
} from './resources';

export { buildCreatePost, ComposeError } from './compose';
export type {
  ComposePostInput,
  PostContent,
  ChannelOverride,
  Channels,
  MediaInput,
  ConnectionRef,
} from './compose';

export type { paths, components, operations } from './generated/types';

import type {
  ConnectionsConnectData,
  ConnectionsConnectResponse,
  ConnectionsGetResponse,
  ConnectionsListAccountsResponse,
  ConnectionsListByProfileResponse,
  ConnectionsSelectData,
  MediaCreateData,
  MediaCreateResponse,
  MediaGetResponse,
  MediaUpdateData,
  PostsCreateData,
  PostsGetResponse,
  PostsListData,
  PostsListResponse,
  PostsUpdateData,
  ProfilesCreateData,
  ProfilesGetResponse,
  ProfilesListData,
  ProfilesListResponse,
  ProfilesUpdateData,
} from './client/types.gen';

/**
 * Resource and input shapes, DERIVED from the generated Hey API operation types
 * (`*Data` = request `{ body, path, query }`, `*Response` = success body). Never
 * hand-declared — there is exactly one definition of each, sourced from the
 * contract, so `pnpm generate` keeps them in lockstep with the live API.
 */

/** A profile — a client/brand workspace. */
export type Profile = ProfilesGetResponse;

/** A page of profiles (the list envelope). */
export type ProfileList = ProfilesListResponse;

/** Query parameters for listing profiles (filters + pagination). */
export type ListProfilesQuery = NonNullable<ProfilesListData['query']>;

/** Request body to create a profile. */
export type CreateProfileInput = NonNullable<ProfilesCreateData['body']>;

/** Request body to update a profile (send only what changes). */
export type UpdateProfileInput = NonNullable<ProfilesUpdateData['body']>;

/** A connected social/ads account on a profile. */
export type Connection = ConnectionsGetResponse;

/** A page of a profile's connections. */
export type ConnectionList = ConnectionsListByProfileResponse;

/** The session returned when starting a connect (OAuth) flow. */
export type ConnectSession = ConnectionsConnectResponse;

/** A platform a connection can start an OAuth connect flow for. */
export type ConnectablePlatform =
  NonNullable<ConnectionsConnectData['body']>['platform'];

/** Accounts discoverable on a pending connection, for the selection step. */
export type DiscoverableAccountList = ConnectionsListAccountsResponse;

/** Request body to select an account on a pending connection. */
export type SelectAccountInput = NonNullable<ConnectionsSelectData['body']>;

/** The create/update post body, derived from the contract. */
type CreatePostBody = NonNullable<PostsCreateData['body']>;

/**
 * One channel's variant on WRITE — the per-platform discriminated-union member
 * with fully typed native `settings`. Preferred over the read resource's variant
 * for anything that inspects settings (on read, `settings` is an opaque record);
 * it is also the compose-time shape, which is exactly what a live preview renders.
 */
export type PostVariantInput = CreatePostBody['variants'][number];

/** The X (Twitter) member of the write variant union — typed native settings
 * (`quote_tweet_id`, `reply`, `poll`, …). Narrowed from the contract, never
 * hand-declared. */
export type XPostVariant = Extract<PostVariantInput, { platform: 'x' }>;

/** The LinkedIn member of the write variant union — typed native settings
 * (`content_kind`, `visibility`, `article`, `poll`, `document`, `mentions`).
 * Narrowed from the contract, never hand-declared. */
export type LinkedInPostVariant = Extract<
  PostVariantInput,
  { platform: 'linkedin' }
>;

/** A post — its variants, schedule, and derived status (the read resource). */
export type Post = PostsGetResponse;

/** A page of posts (the calendar/queue list). */
export type PostList = PostsListResponse;

/** Query parameters for listing posts (filters + pagination). */
export type ListPostsQuery = NonNullable<PostsListData['query']>;

/** The full create-post request body — what `buildCreatePost` produces. */
export type CreatePostInput = CreatePostBody;

/** The update-post request body — what `buildUpdatePost` produces. */
export type UpdatePostInput = NonNullable<PostsUpdateData['body']>;

/** A posting platform — the variant discriminator (x / linkedin / …). */
export type PostPlatform = PostVariantInput['platform'];

/** The allowed `post_type` union for a given platform. */
export type PostTypeFor<P extends PostPlatform> = Extract<
  PostVariantInput,
  { platform: P }
>['post_type'];

/** The native `settings` shape for a given platform (typed per channel). */
export type SettingsFor<P extends PostPlatform> = Extract<
  PostVariantInput,
  { platform: P }
>['settings'];

/** Publish mode: `now` | `schedule` | `draft`. */
export type PublishMode = NonNullable<CreatePostBody['publish']>;

/** Customer metadata on a post (the shared scalar map). */
export type PostMetadata = NonNullable<CreatePostBody['metadata']>;

/** A media asset (image/video/gif/document) with its per-platform renditions. */
export type MediaResource = MediaGetResponse;

/** A media asset's kind (image / video / gif / document), from the contract. */
export type MediaKind = MediaResource['kind'];

/** A media render target — a post platform or `google_ads`. */
export type MediaTarget = NonNullable<
  NonNullable<MediaCreateData['body']>['targets']
>[number];

/** The create-media response: the resource plus a signed upload target. */
export type CreateMediaResult = MediaCreateResponse;

/** The signed direct-to-storage upload target returned on create. */
export type UploadTarget = NonNullable<CreateMediaResult['upload']>;

/** Request body to create a media asset. */
export type CreateMediaInput = NonNullable<MediaCreateData['body']>;

/** Request body to update a media asset (alt text / metadata / extend targets). */
export type UpdateMediaInput = NonNullable<MediaUpdateData['body']>;

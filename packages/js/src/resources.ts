import type {
  ConnectionsConnectData,
  ConnectionsConnectResponse,
  ConnectionsGetResponse,
  ConnectionsListAccountsResponse,
  ConnectionsListByProfileData,
  ConnectionsListByProfileResponse,
  ConnectionsSelectData,
  MediaCreateData,
  MediaCreateResponse,
  MediaGetResponse,
  MediaListData,
  MediaListResponse,
  MediaUpdateData,
  PostsCreateData,
  PostsGetResponse,
  PostsListData,
  PostsListResponse,
  PostsUpdateData,
  PostsValidateData,
  PostsValidateResponse,
  ProfilesCreateData,
  ProfilesGetResponse,
  ProfilesListData,
  ProfilesListResponse,
  ProfilesUpdateData,
  TiktokCreatorInfoResponse,
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

/** Query filters for listing a profile's connections (kind / status / pagination). */
export type ListConnectionsQuery = NonNullable<
  ConnectionsListByProfileData['query']
>;

/** A connection's kind — `posting` (social) or `ads`. From the contract. */
export type ConnectionKind = NonNullable<ListConnectionsQuery['kind']>;

/** A connection's lifecycle status — `pending` / `active` / `needs_reauth`. */
export type ConnectionStatus = NonNullable<ListConnectionsQuery['status']>;

/** The session returned when starting a connect (OAuth) flow. */
export type ConnectSession = ConnectionsConnectResponse;

/** A platform a connection can start an OAuth connect flow for. */
export type ConnectablePlatform =
  NonNullable<ConnectionsConnectData['body']>['platform'];

/** Accounts discoverable on a pending connection, for the selection step. */
export type DiscoverableAccountList = ConnectionsListAccountsResponse;

/**
 * A TikTok creator's live publish options for a connection — the data TikTok's
 * Content Posting policy REQUIRES the publishing UI to render: `creator`
 * (nickname + avatar), the `privacy_options` to offer (with NO default), the
 * positive `interaction` (allowed) flags for Comment/Duet/Stitch toggles, and
 * `max_video_duration_sec`. Derived from the contract, never hand-declared.
 */
export type TikTokCreatorInfo = TiktokCreatorInfoResponse;

/**
 * One TikTok privacy level — a member of the closed audience union
 * (`PUBLIC_TO_EVERYONE` / `MUTUAL_FOLLOW_FRIENDS` / `FOLLOWER_OF_CREATOR` /
 * `SELF_ONLY`). The per-account ALLOWED subset is `TikTokCreatorInfo.privacy_options`;
 * this is one value from it (what you bind a dropdown option to). Derived from
 * the contract, never hand-declared; render it with {@link tiktokPrivacyLabel}.
 */
export type TikTokPrivacyLevel = TikTokCreatorInfo['privacy_options'][number];

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

/** The TikTok member of the write variant union — typed native settings
 * (`privacy_level`, `disable_comment`/`disable_duet`/`disable_stitch`,
 * `brand_content_toggle`/`brand_organic_toggle`, `is_aigc`, photo/video cover).
 * Narrowed from the contract, never hand-declared — it is the compose-time shape a
 * live TikTok preview renders. */
export type TikTokPostVariant = Extract<
  PostVariantInput,
  { platform: 'tiktok' }
>;

/** The Instagram member of the write variant union — typed native settings
 * (`media_type`, `collaborators`, `user_tags`, `location_id`, and the reel-only
 * `share_to_feed`/`audio_name`/`cover_url`/`thumb_offset`). Narrowed from the
 * contract, never hand-declared — the compose-time shape an IG preview renders. */
export type InstagramPostVariant = Extract<
  PostVariantInput,
  { platform: 'instagram' }
>;

/** A post — its variants, schedule, and derived status (the read resource). */
export type Post = PostsGetResponse;

/**
 * One per-platform variant on a RETURNED post (the read resource): its own
 * `status`, a typed `error` ({@link PostVariantError}) when it failed, and a
 * `result` (platform id + permalink) when it published. Derived from the post
 * resource, never hand-declared. (For inspecting compose-time native `settings`,
 * prefer {@link PostVariantInput}; on read `settings` is opaque.)
 */
export type PostVariant = Post['variants'][number];

/**
 * A variant's typed publish failure — `{ code, message }`. The `code` is the
 * adapter's own minted reason (`x_access_not_permitted`, `linkedin_auth_expired`,
 * …); it stays a `string` because adapter codes are minted outside the API's
 * closed registry. Derived from the variant, never hand-declared.
 */
export type PostVariantError = NonNullable<PostVariant['error']>;

/**
 * Did the post fully publish? `true` ONLY when the rollup `status` is
 * `'published'` — `partially_published` and `failed` are NOT success. The single
 * pure predicate every surface (SDK, React hook, composer) shares, so "success"
 * has exactly one definition.
 */
export const isPublished = (post: Post): boolean =>
  post.status === 'published';

/**
 * The variants that FAILED to publish, each carrying its typed {@link
 * PostVariantError}. Empty when none failed. The pure helper behind
 * `useCreatePost().failedVariants` — usable directly from a non-React caller so
 * the "which platforms failed, and why" projection has one definition.
 */
export const failedVariants = (post: Post): PostVariant[] =>
  post.variants.filter((variant) => variant.status === 'failed');

/** A page of posts (the calendar/queue list). */
export type PostList = PostsListResponse;

/** Query parameters for listing posts (filters + pagination). */
export type ListPostsQuery = NonNullable<PostsListData['query']>;

/**
 * A post's derived rollup status — the values accepted by the list `status`
 * filter (draft / scheduled / publishing / partially_published / published /
 * failed). Sourced from the generated query contract, never hand-listed.
 */
export type PostStatus = NonNullable<ListPostsQuery['status']>[number];

/** The full create-post request body — what `buildCreatePost` produces. */
export type CreatePostInput = CreatePostBody;

/** The update-post request body — what `buildUpdatePost` produces. */
export type UpdatePostInput = NonNullable<PostsUpdateData['body']>;

/**
 * The validate-post request body — the composition-only subset of the create
 * body (`profile_id` + `variants`). `buildCreatePost` produces a superset, so
 * its output is structurally assignable here. Derived from the contract.
 */
export type ValidatePostInput = NonNullable<PostsValidateData['body']>;

/**
 * The server's publish-readiness verdict for a composed post — `{ object,
 * publishable, issues }`. The SERVER is the sole authority on validity; the SDK
 * only builds a best-effort payload and relays this result. Derived from the
 * contract, never hand-declared.
 */
export type PostValidation = PostsValidateResponse;

/**
 * One typed, per-variant problem in a `PostValidation` — a closed-registry
 * `code`, a human `message`, the `variant_index` + `path` it applies to, and the
 * optional `hint`/`allowed`/`got` the rule produced. Narrowed from the contract.
 */
export type ValidationIssue = PostValidation['issues'][number];

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

/**
 * A media asset's kind (image / video / gif / document), from the contract. The
 * resource's `kind` is nullable only in the transient pre-detection `uploading`
 * window; this is the concrete family, so it strips that null — what you pass to
 * create/upload and switch over on a settled asset.
 */
export type MediaKind = NonNullable<MediaResource['kind']>;

/** A media render target — a post platform or `google_ads`. */
export type MediaTarget = NonNullable<
  NonNullable<MediaCreateData['body']>['targets']
>[number];

/** The create-media response: the resource plus a multipart upload session. */
export type CreateMediaResult = MediaCreateResponse;

/** Request body to create a media asset. */
export type CreateMediaInput = NonNullable<MediaCreateData['body']>;

/** Request body to update a media asset (alt text / metadata / extend targets). */
export type UpdateMediaInput = NonNullable<MediaUpdateData['body']>;

/** A page of media assets (the list envelope). */
export type MediaList = MediaListResponse;

/** Query parameters for listing media (filters + pagination). */
export type ListMediaQuery = NonNullable<MediaListData['query']>;

/**
 * A media asset's lifecycle state — the values the list `status` filter accepts
 * (uploading / processing / ready / failed). From the contract, never hand-listed.
 */
export type MediaStatus = NonNullable<ListMediaQuery['status']>;

/**
 * Customer metadata — a flat scalar map (`string | number | boolean`; ≤50 keys,
 * keys ≤40 chars, ≤500-char strings, 16 KiB serialized). The contract uses this
 * SAME shape on every stored resource (profiles / posts / media); this alias is
 * derived from the media write body as a stable representative, so it's the type
 * to annotate metadata you send — never `Record<string, unknown>`. (The three
 * resources share one structural shape in the spec; were the API ever to diverge
 * one, prefer that resource's own `*['metadata']` for it.)
 */
export type Metadata = NonNullable<CreateMediaInput['metadata']>;

/**
 * A metadata filter for list endpoints — the same scalar map, matched by exact
 * containment (multiple keys ANDed; omit for no filter). Pass the object directly
 * from the SDK/React hooks; the client URL-encodes it for the REST query.
 */
export type MetadataFilter = NonNullable<ListMediaQuery['metadata']>;

# @postrun/js

## 2.2.1

## 2.2.0

### Minor Changes

- Add TikTok creator-info support for the composer's publish-options UI.

  TikTok's Content Posting policy requires the publishing UI to render the creator's
  nickname + avatar, a privacy dropdown (options from `creator_info`, with no
  default), and Comment/Duet/Stitch toggles per the account's flags. This release
  exposes that data in a best-DX shape.

  - **`@postrun/js`**: the generated `tiktokCreatorInfo` SDK function for
    `GET /connections/{id}/tiktok/creator-info`, plus a `TikTokCreatorInfo` resource
    type. The shape is `{ creator: { nickname, username, avatar_url }, privacy_options:
TikTokPrivacyLevel[], interaction: { comment, duet, stitch }, max_video_duration_sec }`
    — `privacy_options` is a typed subset of the closed `TikTokPrivacyLevel` union (now
    exported), and `interaction` flags are POSITIVE ("allowed", the inverse of TikTok's
    `*_disabled`) so a UI reads `if (interaction.comment) …`. Adds the pure
    `tiktokPrivacyLabel(value)` helper (Everyone / Friends / Followers / Only you) so the
    presentation lives in the SDK, not on the wire.
  - **`@postrun/react`**: `useTikTokCreatorInfo(connectionId)` — a query hook that
    fetches a TikTok connection's live creator info in the shape above. Disabled when
    `connectionId` is `null`. Exports `tiktokKeys` for cache control.

## 2.1.0

### Minor Changes

- Surface the publish-now outcome as first-class fields so it can't be ignored.

  - **Spec regen** picks up the additive `x_access_not_permitted` error code (X 402 — app not permitted / lacks required X API access or credits). It joins the generated `ErrorCode` union; no shapes changed, nothing breaks.
  - **`useCreatePost`** now exposes the derived publish outcome: `status` (the rollup), `isPublished` (`true` only when `status === 'published'`), and `failedVariants` (the variants that failed, each with its typed `error`). `create` still resolves the full `Post` and never throws on a partial/failed publish (a throw would discard the platforms that did publish). **Success = `status === 'published'`** — `partially_published` and `failed` are NOT success.
  - **`@postrun/js`** adds the pure helpers `isPublished(post)` / `failedVariants(post)` and the `PostVariant` / `PostVariantError` types, so a direct (non-React) caller shares the same outcome projection.

## 2.0.0

### Major Changes

- Connection delete is now **unconditional** — disconnecting an account is one-click and never blocked by existing posts (the industry norm). Published posts keep their history; a scheduled post that loses its account fails _at publish time_ with a typed reason. This regenerates the SDK to the new API contract:

  - **`connection_id` is now nullable** (`string | null`) on the post-variant resource and on the `post.completed` / `post.failed` webhook variant summaries — a variant whose connected account was removed reads `null` (its `result`/`permalink` history is preserved). **Breaking:** handle the null where you read a variant's `connection_id`.
  - **Error codes changed (breaking for exhaustive switches):** `connection_in_use` is **removed** (deleting a connection no longer 409s on referencing posts), and `connection_removed` + `variant_unparseable` are **added** — a variant whose connection was removed, or whose stored settings no longer parse, surfaces as a typed publish/readiness failure rather than silently vanishing.

  `useConnect` / `useDisconnect` and the rest of the React surface are unchanged.

## 1.3.0

### Minor Changes

- Post validation: the SDK builds, the server decides.

  - `buildCreatePost` / `derivePostType` are now TOTAL — they never throw for a media/`post_type` combination. Validity (which media pair with which placement, document support, count limits, empty media) is the SERVER's job, returned as typed issues by the new `POST /v1/posts/validate`. `derivePostType` is best-effort SUGAR for a default placement; the only retained `ComposeError` guards are genuine usage errors (an unresolvable connection, a build with zero channels). An in-progress composition can always be built to validate.
  - New `useValidatePost(profileId)` (`@postrun/react`) — builds the same best-effort variant set and calls `/posts/validate`, returning `{ validate, publishable, issues, isPending, error, isReady, connectedChannels }`. It is a READ (no cache invalidation); `validate` is a stable callback and the hook never debounces internally (let the caller debounce for live-as-you-type).
  - New type aliases (`@postrun/js`, re-exported from `@postrun/react`): `PostValidation`, `ValidationIssue`, `ValidatePostInput` — derived from the regenerated client.

## 1.2.0

## 1.1.0

## 1.0.0

### Minor Changes

- Embedded one-click connect. `useConnect` now runs the OAuth flow IN-APP via a Nango popup — no redirect to the hosted page, no second click — and exposes an in-app account picker for multi-account platforms (Meta Ads, Facebook Pages).

  **Breaking change to `useConnect`.** The old surface (`useConnect()` returning a mutation whose `mutate({ profileId, platform })` redirected the browser to the hosted page) is replaced by `useConnect({ profileId, platform, onConnected })` returning `{ state, start, select, reset }`:

  - `start()` opens the OAuth popup **in-page** — call it directly in your button's `onClick` (it's gesture-safe: the session is pre-minted, so `nango.auth()` fires synchronously inside the click).
  - `state.phase` walks `preparing → idle → connecting → picking → active | connected_pending | cancelled | error`. On `picking`, `state.accounts` are the discoverable accounts to render your own picker, activated via `select(externalAccountId)`. `connected_pending` is a terminal success (the grant landed; refetch your list).
  - `onConnected(connection)` fires once a connection is fully ACTIVE.
  - The hosted `/connect` page remains as a no-SDK fallback (link to `hosted_connect_url`).

  New **`<Connect>`** headless render-prop component over the hook:

  ```tsx
  <Connect profileId={id} platform="x" onConnected={onConnected}>
    {({ state, start, select }) => /* your button + picker */}
  </Connect>
  ```

  `@postrun/js`: the connect-session response now carries `connect_session_token`, `provider_config_key`, and `nango_host` — the fields the SDK needs to drive `nango.auth()` in-page.

- Consolidate media uploads into ONE hook. `useMediaUpload` now handles a single file OR many — the separate `useMediaUploads` hook (and its `UseMediaUploadsResult` / `UseMediaUploadsOptions` types) is removed.

  **Breaking change to `useMediaUpload`.** The old single-file surface (`upload(file)` + top-level `status`/`progress`/`media`/`error` + `cancel()`) is gone. The hook now returns `{ items, ready, isUploading, add, remove, reset }`:

  - `add(files, options)` accepts one `File`, a `FileList`, or a `File[]`, and returns a promise resolving to the settled (`ready`|`failed`) resources for that batch, in add-order, excluding any item removed/aborted mid-flight. Single-file usage: `const [asset] = await add(file, opts)` (or read `ready[0]`). The reactive `items` still update live for UI.
  - Each file gets its own `MediaUploadItem` slot (`status`/`progress`/`media`/`error`); `progress` is the 0–1 client-side byte bar, `media.progress.{stage,percent}` is the live server pipeline bar.
  - Uploads run through ONE shared `p-limit` gate (`concurrency`, default 3, set via `useMediaUpload({ concurrency })`) — global across `add` calls. Transient PUT failures retry via `p-retry` (4xx short-circuited). `remove(id)` aborts + drops one file; `reset()` aborts all + clears.

  `@postrun/react` is a major bump because the previously-published single-file shape is removed.

  `kind` and `content_type` are now PURE OPTIONAL OVERRIDES. The API auto-detects both from the uploaded bytes (magic-number sniff), so a minimal upload is `add(file, { profileId })` — no MIME on the `File` required. The hook no longer infers kind client-side or throws when `file.type` is empty; pass `contentType` only to override (e.g. a legacy Office binary the server sniff can't disambiguate).

  Surface live processing progress: `MediaResource` now carries `progress: { stage, percent }` (regenerated from the API spec), ticked live on each poll so a UI can show the server-side pipeline stage (`queued → analyzing → transcoding → done`) alongside the client-side byte-upload bar.

## 0.2.0

### Minor Changes

- c7ab560: Composer enablement + the changes since 0.1.0:

  - `useConnections(profileId, { kind, status })` — filter a profile's connections by kind (`posting`/`ads`) or lifecycle status, so a composer can fetch social-only accounts. Adds `ListConnectionsQuery` / `ConnectionKind` / `ConnectionStatus` / `ConnectionsFilter`.
  - `useMediaList` + `useMediaInfinite` (full filters + pagination); `mediaKeys` list/infinite; list-cache invalidation on media mutations.
  - Named `Metadata` + `MetadataFilter` type aliases.
  - TikTok compose handler (`video`/`single_image`/`carousel`); `buildVariants` made auto-exhaustive over the platform registry.
  - Fix: `useConnect` now reads the renamed `hosted_connect_url`; `MediaKind` re-derived as non-null.

## 0.1.0

### Minor Changes

- First public release.

  - `@postrun/js` — typed SDK (Hey API), runtime Zod validators (`@postrun/js/schemas`), throw-based typed errors (`PostrunError` with a closed `code` union, `request_id`, `fieldErrors`), and the server-only token mint (`@postrun/js/server`).
  - `@postrun/react` — `<PostrunProvider>` + hooks for profiles, connections (hosted OAuth), media upload, and posts — including live status polling (`usePost`/`useCalendar`) and append-style pagination (`usePostsInfinite`/`useProfilesInfinite`).

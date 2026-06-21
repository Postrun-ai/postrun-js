# @postrun/js

## 2.16.0

### Minor Changes

- Regenerate from the improved media typing; drop the resolver's bridge type.

  The spec now `$ref`s the shared `Media` component for the nested asset on a
  fetched post (`variant.media[].media`), so it's the SAME named type as
  `MediaResource` (from `GET /v1/media`) — no longer a structurally-identical
  duplicate.

  - Regenerated the client (`types.gen.ts`/`zod.gen.ts`) from the refreshed spec.
  - `media-resolver.ts` drops the `InlineAsset`/`PreviewAsset` `Pick` bridge that
    existed only to reconcile the two duplicate types — it now uses `MediaResource`
    directly (140 → 107 lines). Behavior unchanged; all preview tests green.

## 2.15.0

### Minor Changes

- Regenerate the SDK from the improved OpenAPI spec (shared components).

  The API now emits shared `components.schemas` with `$ref` reuse (21 named
  components, was 1) instead of inlining every shape. Regenerating the client
  collapses the duplication:

  - `types.gen.ts` and `zod.gen.ts` shrink by ~8,000 lines net — reused shapes
    (`Media`, `Connection`, `Post`, `PostVariant`, …) are now single named types
    referenced everywhere, not re-inlined at each use site.
  - Better DX: hover/IDE shows a named `Media`/`Connection`/etc. instead of a giant
    inline object literal, and the nested asset on a fetched post
    (`variant.media[].media`) is the same `Media` shape as `GET /v1/media`.
  - Public types are unchanged in shape (all hand-written derivations still resolve);
    this is an internal codegen cleanup with no API surface change.

## 2.14.0

### Minor Changes

- Simpler preview API — render from the SDK `MediaResource`, never a local `File`.

  Each `*PostPreview` now takes the post `variant` + the SDK `Connection` (the author
  derives from it) + optional uploaded `media: MediaResource[]` for compose. A fetched
  (read) variant carries its assets inline, so previewing a post from `usePost` needs
  no media plumbing at all.

  - **Pixels resolve from `MediaResource` only** via the new pure `resolveVariantMedia`
    (exported) — it reads the per-platform rendition URL and returns an honest
    `ResolvedMedia` with `state: 'ready' | 'processing'`. A still-processing asset shows
    the shared "Processing media…" tile (no fake spinner, no broken `<img>`).
  - **Author derives from the `Connection`** (`avatar_url`/`username`/
    `external_account_name`); only `verified` and LinkedIn `headline` stay caller-supplied
    (the fields the API doesn't store).
  - **Removed**: the local-`File`/object-URL path (`useResolvedMedia`, the `File`-based
    `toPreviewMedia`), and the hand-built author types (`PreviewMedia`, `XPreviewAuthor`,
    `LinkedInPreviewAuthor`, `InstagramPreviewAuthor`, `ConnectionIdentity`). Net code
    reduction; the preview surface is smaller.

  **Breaking** (no consumers yet): preview props are now `{ variant, connection, media? }`
  instead of `{ variant, author, media }`, and `media` is `MediaResource[]`, not
  `PreviewMedia[]`.

## 2.13.0

### Minor Changes

- Regenerate the SDK for enriched read-post media.

  A fetched post's variant media now carries the full `MediaResource` inline
  (`variant.media[].media` — id, kind, content_type, status, `per_platform`
  renditions, …), so reading a post no longer needs a separate `GET /v1/media` per
  attachment to resolve URLs/dimensions. The regenerated client + Zod validators
  reflect the enriched shape; the change is additive.

## 2.12.0

### Minor Changes

- Add a framework-agnostic `uploadToTarget()` to `@postrun/js`.

  Upload a file's bytes straight to a signed upload target from any frontend (an
  agent, a non-React app) without a backend — the PUT-with-progress logic no longer
  lives only inside the React hook.

  - `uploadToTarget(file, target, { onProgress?, signal?, retries? })` — `target` is
    the SDK-derived `UploadTarget`; progress via XHR (axios); cancellation via
    `AbortSignal`. Retries are composed with `p-retry`: network errors, 5xx, and 429
    retry; any other 4xx (e.g. an expired signed URL) is terminal; an aborted signal
    stops immediately. Throws `UploadError` (with the HTTP status) on a hard failure.
  - `UploadError` now lives in `@postrun/js` (still re-exported from `@postrun/react`
    — public surface unchanged).
  - `@postrun/react`'s `useMediaUpload` now reuses `uploadToTarget` (the duplicated
    PUT/progress/retry code is gone); `axios`/`p-retry` moved to `@postrun/js`.

## 2.11.0

### Minor Changes

- Typed read variant — previews now accept a fetched post with no transform.

  The API's read variant is now a typed discriminated union (its `settings` are typed
  per platform on read, matching the write contract), so the SDK regenerates with a
  fully-typed `PostVariant` instead of an opaque settings blob.

  - **Previews accept the read shape.** Every `*PostPreview`'s `variant` prop is
    widened from the compose-time write variant to **write | read** — so you can pass
    a post straight from `usePost`/`usePosts`/the calendar with no glue:
    `<XPostPreview variant={post.variants[0]} … />` now type-checks and renders.
  - New exported types: `ReadPostVariant<P>`, `XPreviewVariant`,
    `LinkedInPreviewVariant`, `TikTokPreviewVariant`, `InstagramPreviewVariant`.
  - Regenerated `@postrun/js` client (`types.gen.ts`/`zod.gen.ts`) from the refreshed
    OpenAPI spec.

  No transform/adapter needed — the typed contract made read↔preview symmetry free.

## 2.10.0

## 2.9.0

## 2.8.0

### Minor Changes

- Add the Instagram preview (feed + reel), unify the caption fold, and make
  `theme="auto"` consistent across every card.

  `@postrun/react`:

  - **`InstagramPostPreview`** — a clean-room, schema-driven Instagram preview
    covering everything the API supports: a **feed** post (single image / swipeable
    carousel via Embla) and a **reel** (9:16 video). Header with avatar, username,
    verified seal, and collaborators; the action row (like/comment/share/save — no
    fabricated counts); a bold-username caption; the reel's audio label. Light/dark/
    `auto` themed; the reel is always dark. Identity (`InstagramPreviewAuthor`) is
    **SDK-driven** — `username`/`avatar_url` derive from the `Connection` type.
  - **Caption fold polish** — a single shared `ExpandableText` powers the
    "more"/"less" fold for the Instagram and TikTok captions: expands to the FULL
    text with **no inner scrollbar** (removed TikTok's `max-height`/scroll).
  - **`theme="auto"` now resolves identically on every card** — the CSS-variable
    cards (LinkedIn, Instagram, the TikTok panel) follow the OS color scheme via CSS
    `light-dark()` + `color-scheme`, matching how `react-tweet` (X) resolves `auto`.
    No more JS-after-mount flash or X-vs-LinkedIn divergence.

  `@postrun/js`:

  - `InstagramPostVariant` type (derived from the contract).

## 2.7.0

## 2.6.0

### Minor Changes

- X preview: render polls + bring it to the same bar as TikTok/LinkedIn.

  `@postrun/react`:

  - `XPostPreview` now renders the one missing content surface — **polls**
    (`settings.poll`): the 2–4 options as X's pre-vote outlined pills plus an honest
    "0 votes · <time left>" footer (no fabricated counts). Poll is mutually
    exclusive with media/quote/card (per the contract), so it renders in their place.
  - `XPoll` exported for recomposition. (`card_uri` stays unrendered — it's an opaque
    Cards-API reference with no client-renderable content.)

  `@postrun/js`:

  - `xPollDurationLabel(durationMinutes)` + the `XPoll` settings type (derived from
    the contract) — the poll card's "time left" label.

  The rest of the X preview already rode on `react-tweet` (the real X card) with a
  pure, cast-free schema→tweet mapper; this fills the content gap and adds the poll
  test coverage.

## 2.5.0

### Minor Changes

- LinkedIn preview: render the rich `content_kind`s (article, poll, document) + resync the OpenAPI spec.

  `@postrun/react`:

  - `LinkedInPostPreview` now renders every `content_kind`, not just text/image/video:
    - **`ArticleCard`** — the link share card (source domain, headline, description,
      optional thumbnail), driven from `settings.article`.
    - **`Poll`** — the question + 2–4 pre-vote option pills + "0 votes • <duration>"
      footer (no fabricated counts), driven from `settings.poll`.
    - **`DocumentCard`** — the document unit (first-page cover or a document
      affordance + a dark caption bar with the title), driven from `settings.document`.
  - All three are exported for recomposition, render in light/dark/`auto`, and the
    image mosaic's last `media[0]!` cast was removed.

  `@postrun/js`:

  - `linkedinPollDurationLabel` + the `LinkedInPollDuration` type (derived from the
    contract) — the poll card's "time left" label.
  - OpenAPI spec resynced from the API (types + Zod validators regenerated).

## 2.4.0

### Minor Changes

- Add the TikTok post preview + publish panel (TikTok Content-Posting Required UX).

  `@postrun/react`:

  - `TikTokPostPreview` — a faithful, schema-driven render of how a post looks on
    TikTok (mobile layout): 9:16 card with the action rail over the video, a
    swipeable photo carousel (Embla) with bottom dots, the username/caption/music
    row, the commercial label ("Paid partnership" / "Promotional content") and the
    AIGC label ("Creator labeled as AI-generated") derived from the post settings,
    and `‑‑‑` counts (no fabricated metrics). The caption clamps to two lines with a
    "more"/"less" toggle and scrolls so the full to-be-posted content is always
    readable (Required UX §5a). Unmodified media — no watermark.
  - `TikTokPublishPanel` — the Required-UX confirmation surface: editable caption
    with the correct caps (video 2200 / photo 4000), audience selector with no
    default, creator-gated Comment/Duet/Stitch toggles, commercial disclosure, a
    video-only AIGC toggle, a processing notice, the consent declaration directly
    above the Post button, and a Post button whose click is the affirmative-consent
    gate (disabled until valid). Light/dark/`auto` theming.
  - Sub-components (`TikTokCaptionField`, `AudienceSelect`, `InteractionToggles`,
    `CommercialDisclosure`, `Declaration`) exported for recomposition.

  `@postrun/js`:

  - `TikTokPostVariant` type (the compose-time TikTok variant).
  - TikTok options model + helpers (`defaultTikTokOptions`, `audiencePrivacyOptions`,
    `interactionRows`, `commercialLabelNotice`, `tiktokSettings`, …) — the single
    source for TikTok's Required-UX rules, consumed by the React panel.

- Publish-validation issues now carry `platform` — the authoritative platform a
  readiness issue belongs to. Group or branch on it directly instead of re-deriving
  from `variant_index` (the variant order is canonical, not your channel order, so
  that index does not track your selection). The `display_error` for count/content
  issues is now platform-aware ("Your TikTok post needs exactly 1 image — you
  attached 0").

## 2.3.0

### Minor Changes

- Post-validation issues now carry the required, customer-facing `display_error`
  string (the Plaid `display_message` model) — a short, friendly, render-this line
  for each readiness issue, alongside the developer-grade `message`. Duration limits
  read as human time (e.g. "59 minutes 20 seconds"), not raw seconds.

  Also surfaces the TikTok creator-info hook (`useTikTokCreatorInfo`) + `tiktokPrivacyLabel`
  helper, and removes the long-dropped `kind` / `content_type` overrides from
  `MediaUploadOptions` — the API auto-detects both from the uploaded bytes, so these
  were already ignored. Omit them; nothing else changes.

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

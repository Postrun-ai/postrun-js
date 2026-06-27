# @postrun/react

## 3.2.0

### Patch Changes

- Updated dependencies [d1e68e9]
  - @postrun/js@3.2.0

## 3.1.0

### Minor Changes

- Add `media_upload_invalid_parts` to the typed error-code union. `POST /v1/media/{id}/multipart/complete` now returns a typed 422 for malformed/duplicate/out-of-order/undersized parts (previously a generic 500), so customers can branch on it. Regenerated from the API OpenAPI spec.

### Patch Changes

- Updated dependencies
  - @postrun/js@3.1.0

## 3.0.0

### Major Changes

- Post shape is now server-derived from the media — the customer never declares it.

  The API no longer accepts `post_type` on a write variant, or LinkedIn
  `content_kind` / Instagram `media_type` in write `settings`. The server derives
  the shape from each asset's byte-detected kind and surfaces it (nullable) only on
  the READ variant (`post_type`, plus LinkedIn `content_kind` / Instagram
  `media_type`).

  - **`MediaInput` is now `{ id }`** (the required `kind` is gone) — attach an
    uploaded asset by id and the server figures out the shape:
    `create({ channels: { instagram: { settings: {}, media: [{ id: asset.id }] } } })`.
  - **`ChannelConfig.postType` override removed**, and the client-side
    `derivePostType` is gone — the composed write body never sends `post_type`,
    `content_kind`, or `media_type`.
  - **`PostTypeFor<P>` is replaced by `PostType`** (the closed shape union, derived
    from the read variant).
  - **Preview components** derive the visual shape from the resolved media +
    settings sub-objects, so they accept both compose (write) and fetched (read)
    variants unchanged.
  - **`<TikTokPublishPanel>` / `<TikTokCaptionField>`** now take a `postType:
PostType` prop (the shape the composer is building) instead of reading it off
    the write variant; `captionMaxFor` accepts `PostType`.
  - Removed error code `content_kind_mismatch` (the declared-vs-derived mismatch no
    longer exists).

### Minor Changes

- Fix client-side validation of conversion events.

  - **Timestamps with timezone offsets now validate.** Every `date-time` field
    (e.g. a conversion's `event_timestamp`, a post's `schedule_at`) is generated as
    `z.iso.datetime({ offset: true })`, so a valid RFC 3339 timestamp with an offset
    like `2026-06-21T14:32:00-04:00` validates client-side exactly as the API accepts
    it (previously the generated validator was UTC-`Z`-only and would false-reject it).
  - **New `conversionEventSchema`** (from `@postrun/js/schemas`) layers the API's
    cross-field rules — each conversion needs at least one match signal (gclid /
    gbraid / wbraid / user_data), and each `user_data` identifier needs at least one
    of email / phone / address — on top of the generated `zGoogleAdsConversionEvent`.
    Use it to validate a conversion before sending, the same way the API does.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @postrun/js@3.0.0

## 2.25.0

### Minor Changes

- Google Ads: conversion history list, structured error `source`, and consistent
  bare-id parent references.

  - **Conversion history list** — new `googleListConversionRequests`
    (`GET /google/{connection_id}/conversions`) returns the recent real conversion
    sends on a connection (newest first), each `{ request_id, conversion_action_id,
event_count, created_at }`; deep-link any row to its live per-destination status
    via `googleGetConversionStatus`. New importable type `GoogleAdsConversionRequest`.
  - **Structured error `source`** — every error now carries one importable
    `ErrorSource` (`{ platform, platform_code?, field?, value?, platform_request_id? }`)
    on `PostrunError.source`, surfacing the platform's own field-level reject detail
    (Google Ads + the Data Manager conversion API) instead of dropping it. A
    multi-field reject lists every offending field on `errors[]`.
  - **Consistent bare-id parent references** — create bodies for ad groups, keywords,
    and ads now take a bare numeric parent id (e.g. `campaign: "123"`,
    `ad_group: "456"`), matching `campaign_budget` — so a created entity's id drops
    straight into the next create. A full `resource_name` is rejected at the boundary.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.25.0

## 2.24.0

### Minor Changes

- Correct the Google Ads conversion SEND contract (live-verified against the Data
  Manager API). `event_source` is now a REQUIRED field on each conversion event
  (WEB / APP / IN_STORE / PHONE / MESSAGE / OTHER — Google rejects a missing one);
  postal `address` requires all four parts (`given_name` / `family_name` /
  `region_code` / `postal_code`) with `region_code` as an ISO 3166-1 alpha-2 code;
  `event_timestamp` accepts a timezone offset (e.g. `+05:30`), not just `Z`. The
  conversion status read now returns an empty `destinations` array (poll again) for
  the first ~minute after a send, while Google registers the request, instead of an
  error.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.24.0

## 2.23.0

### Minor Changes

- Add Google Ads conversion SEND + STATUS (Data Manager API). New SDK functions
  `googleSendConversions` (POST `/google/{connection_id}/conversions:send`) and
  `googleGetConversionStatus` (GET `/google/{connection_id}/conversions/status`),
  plus named, importable types: `GoogleAdsConversionConsent`,
  `GoogleAdsConversionUserIdentifier`, `GoogleAdsConversionEvent`,
  `GoogleAdsSendConversionsResult`, `GoogleAdsConversionStatusReason`,
  `GoogleAdsConversionWarning`, and `GoogleAdsConversionStatus`. Send plaintext
  identifiers (email / phone / address) — they're hashed server-side; pass
  `dry_run: true` to validate against Google without sending.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.23.0

## 2.22.0

### Minor Changes

- Sync the generated client to the current Postrun API spec:

  - **Removed the Google Ads offline conversion-upload operation** (`googleUploadConversions`, `POST /google/{connection_id}/conversion-uploads`). Google blocked `UploadClickConversions` in the Google Ads API on 2026-06-15; offline conversion import moves to the Data Manager API. Conversion **actions** and **goals** are unchanged.
  - **Removed the per-variant `crop_box` field** from post media inputs/resources. It was never applied at publish; use the media asset's own dimensions.
  - **Narrowed a post variant's `error.code`** to the typed publish-error union (was a loose `string`), so it can be branched on directly.
  - Error-type fidelity improvements on the request-log `error` shape.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.22.0

## 2.21.0

### Minor Changes

- Google Ads reads: status filter, campaign budget, and keyed metric/segment maps.

  - **`status` filter** on `GET /v1/google/{conn}/ads/tree` and the `ad-groups`/`ads`/`keywords` lists — a typed `GoogleAdsReadStatusFilter` (`Array<'ENABLED' | 'PAUSED' | 'REMOVED'>`). **Omit it to get the default view (everything except `REMOVED`)**, matching Google Ads' own default; pass it to narrow to specific serving states.
  - **`budget_micros`** on the ad-tree **campaign** node (the campaign's average daily budget in micros; `null` at ad_group/ad/keyword levels).
  - **Keyed metric/segment maps** — `GoogleAdTreeNode.metrics`, `GoogleAdsInsightsRow.metrics`, and `GoogleAdsInsightsRow.segments` are now **keyed objects** (`{ clicks?: number | null; … }`) instead of a loose `{ [key: string]: number | null }`, so each metric/segment is individually typed and autocompletes.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.21.0

## 2.20.0

### Minor Changes

- Google Ads tree hook + first-class idempotency.

  - **`useAdTree` (`@postrun/react`)** — renders the Google Ads campaign → ad_group → ad/keyword tree from `GET /v1/google/{conn}/ads/tree`. Fetches the campaign level plus one query per expanded campaign (controlled `expanded`) and groups the flat nodes; changing `since`/`until`/`metrics` refetches. Stable references (memoized).
  - **`groupAdTree` + `AdTreeNode` (`@postrun/js`)** — pure helper that groups the flat `GoogleAdTreeNode[]` into a nested tree by `parent_id` (a node whose parent is absent is a root, so campaign-level and per-campaign subtree pages group + merge correctly).
  - **Typed `Idempotency-Key` header** — every idempotent write now exposes an optional, typed `Idempotency-Key` parameter (with the `IdempotencyKey` type + `zIdempotencyKey` validator), regenerated from the spec.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.20.0

## 2.19.0

### Minor Changes

- Google Ads tree-ready reads + targeting completeness.

  - **Insights leaf levels** — `POST /v1/google/{conn}/insights` now supports `ad` and
    `keyword` levels (alongside account/campaign/ad_group), each row carrying `parent_id`
    so a campaign→ad-group→ad/keyword tree is assemblable, plus a level↔filter matrix
    (leaf levels require `ad_group_id`). New named types `GoogleAdsInsightLevel/Metric/Segment`.
  - **List parent filters** — `ad-groups?campaign_id=`, `ads?ad_group_id=`, `keywords?ad_group_id=`
    for lazy per-branch loading.
  - **Named entity components** — `GoogleAdsAdGroup`, `GoogleAdsAd`, `GoogleAdsKeyword`,
    `GoogleAdsAudience` (and the criteria/insights shapes) are now single named SDK types.
  - **Audience discovery** includes `custom_audience`; campaign targeting-setting is
    read-merge-write (no longer wipes other dimensions).

  All exposed as typed TanStack Query options (`googleListAdGroupsOptions`,
  `googleGetInsightsOptions`, `googleListAudiencesOptions`, …) via `@postrun/react`.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.19.0

## 2.18.0

### Minor Changes

- Add a generated TanStack Query layer for every API operation.

  - `@postrun/js/query` exposes `*Options` (query) and `*Mutation` factories generated
    by Hey API's `@tanstack/react-query` plugin — one per operation, fully typed from
    the OpenAPI spec (Google Ads campaigns/ad-groups/ads/keywords/insights, the new
    targeting criteria + audiences, plus posts/media/profiles/connections/webhooks).
    `@tanstack/react-query` is an optional peer of `@postrun/js`, so non-react
    consumers never pull it.
  - `@postrun/react` re-exports those options and adds `usePostrunQuery` /
    `usePostrunMutation` — sugar that injects the provider's configured client
    (Bearer via `getToken`) and its isolated `QueryClient`, so a customer composes
    any endpoint with no per-endpoint wrapper and no global client.
  - Spec synced with the new Google Ads targeting endpoints (geo/language + demographics
    - audiences + targeting-setting).

### Patch Changes

- Updated dependencies
  - @postrun/js@2.18.0

## 2.17.0

### Minor Changes

- Rewrite the media uploader as a resilient, resumable multipart upload.

  The single-PUT `uploadToTarget` is replaced by a framework-agnostic `uploadFile`
  built on `@uppy/core` + `@uppy/aws-s3` (headless). It drives a chunked S3
  multipart upload against the API's signing endpoints — `createMultipartUpload`
  returns the cached create-response session (no extra round-trip), `signPart`,
  `listParts` (resume after a dropped connection), `completeMultipartUpload`, and
  `abortMultipartUpload` — owning chunking, parallel parts, per-part retry, resume,
  and progress. `useMediaUpload` consumes it transparently.

  - New: `uploadFile(file, { mediaId, session, client, onProgress?, signal? })`,
    `UploadFileOptions`, and the `MultipartSession` type.
  - Removed: `uploadToTarget`, `UploadToTargetOptions`, and the `UploadTarget` type
    (the create response now returns a multipart `upload` session); the `axios` and
    `p-retry` dependencies are dropped from `@postrun/js`. `UploadError` stays but
    now carries the underlying failure as `cause`.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.17.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.16.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.15.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.14.0

## 2.13.0

### Minor Changes

- Regenerate the SDK for enriched read-post media.

  A fetched post's variant media now carries the full `MediaResource` inline
  (`variant.media[].media` — id, kind, content_type, status, `per_platform`
  renditions, …), so reading a post no longer needs a separate `GET /v1/media` per
  attachment to resolve URLs/dimensions. The regenerated client + Zod validators
  reflect the enriched shape; the change is additive.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.13.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.12.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.11.0

## 2.10.0

### Minor Changes

- Polish the post-preview empty / processing states to the Linear/Vercel bar, with
  zero layout shift across networks:

  - **Stable card width (the layout-shift fix).** The Instagram and LinkedIn cards
    used `maxWidth` with no `width`, so they shrank to their content — an empty post
    collapsed to a fraction of a populated card's width. Both now pin `width: 100%`
    (capped at the network's feed width), so the empty, processing, and loaded states
    render at identical dimensions. Verified: IG card 470px / media box 468×468 across
    all three states.
  - **Instagram empty / processing.** Replaced the solid-black void (and the generic
    placeholder icon) with Instagram's authentic media-loading grey skeleton — a quiet
    "No media yet" line, a shimmer while pixels resolve, in the always-reserved 1:1
    frame. The Reel card gets the same treatment.
  - **X empty state.** Shows X's own "What's happening?" prompt (muted) in the body
    slot, aligned via react-tweet's body CSS variables and theme-aware secondary color,
    instead of a hollow header + action bar.
  - **LinkedIn empty state.** Shows LinkedIn's "What do you want to talk about?" prompt
    when the post has no commentary, media, or rich unit. Single images now reserve
    their natural aspect ratio (when dimensions are known) to avoid a load-time jump.
  - **Shared `MediaPlaceholder`.** Extracted the empty/processing tile every card uses
    (TikTok now consumes it too), so the treatment stays consistent and icon-free.

  `ReelPreview` gains an additive optional `pending` prop.

### Patch Changes

- @postrun/js@2.10.0

## 2.9.0

### Minor Changes

- Code-review fixes across all four previews (quality, SDK-driven types, robustness, perf).

  - **X media now renders the original src.** `react-tweet`'s `getMediaUrl` rewrites
    the path + appends `?format=&name=` (only valid for `pbs.twimg.com`), which 404'd
    customer-CDN images and broke compose-time `blob:` URLs. A `MediaImg` that maps
    react-tweet's transform back to our raw url fixes it (tested).
  - **Author types are now SDK-driven.** `XPreviewAuthor` and `LinkedInPreviewAuthor`
    derive `username`/`avatar_url` from the SDK `Connection` (like `InstagramPreviewAuthor`);
    `name`/`headline`/`verified` remain caller-supplied (the fields our API doesn't
    store). **Breaking:** `handle`→`username`, `avatarUrl`→`avatar_url`.
  - **`LinkedInVisibility`** now derives from the contract instead of a hand-listed union.
  - **Consumability:** `ResolvedMedia`, `ConnectionIdentity`, and `ReelPreviewProps`
    are now exported from the package root.
  - **`ReelPreview`:** added `'use client'`, uses the shared `ExpandableText` fold
    (no silent truncation), handles a null `username`, and exports its props.
  - **Robustness:** Instagram `Caption` handles a null username; `isReel` keys off the
    authoritative `post_type` only; `FeedMedia` carousel keys are stable across reorder.
  - **Perf:** hoisted the theme `paletteVars` + LinkedIn body colors to module consts;
    memoized LinkedIn `linkify`/`mentionNames`.
  - **a11y:** TikTok audience `<select>` is labelled; the options `Row` only renders a
    `<label>` when it targets a control; LinkedIn hashtags no longer scroll-to-top.
  - **Tests:** `ExpandableText` (fold), LinkedIn PostBody collapse + content-kind
    dispatch, Instagram `isReel` negative case, X raw-media src.

### Patch Changes

- @postrun/js@2.9.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.8.0

## 2.7.0

### Minor Changes

- Add `toPreviewMedia(items)` — the bridge from `useMediaUpload`'s `MediaUploadItem[]`
  to the preview cards' `PreviewMedia[]`.

  Both shapes are SDK-owned (the hook produces one, every preview card consumes the
  other), so this mapping belonged in the SDK instead of being hand-written by every
  `useMediaUpload` + preview consumer. It passes the local `File` (so a preview
  renders immediately, before and after upload settles), derives `kind` from the
  detected `media.kind` (else the file MIME), drops documents and unidentifiable
  files (not previewable), and fills `width`/`height`/`alt` from the settled asset.

### Patch Changes

- @postrun/js@2.7.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.6.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.5.0

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

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @postrun/js@2.4.0

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.3.0

## 2.2.1

### Patch Changes

- Fix: long-transcoding videos were marked `failed` and silently dropped from posts.

  `useMediaUpload`'s status poll had a 5-minute ceiling (`pollUntilSettled`). A large
  or long video whose server-side transcode ran past 5 minutes hit the timeout, and
  the client flipped the item to `failed` even though the asset later reached `ready`
  on the server. A `failed` item is excluded from `ready`, so the (actually-ready)
  video never made it into the post — collapsing it to a no-media post downstream.

  The poll ceiling is now 30 minutes (`MEDIA_POLL_TIMEOUT_MS`), a generous backstop
  for real transcodes; assets still normally settle in seconds-to-minutes.
  - @postrun/js@2.2.1

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

### Patch Changes

- Updated dependencies
  - @postrun/js@2.2.0

## 2.1.0

### Minor Changes

- Surface the publish-now outcome as first-class fields so it can't be ignored.

  - **Spec regen** picks up the additive `x_access_not_permitted` error code (X 402 — app not permitted / lacks required X API access or credits). It joins the generated `ErrorCode` union; no shapes changed, nothing breaks.
  - **`useCreatePost`** now exposes the derived publish outcome: `status` (the rollup), `isPublished` (`true` only when `status === 'published'`), and `failedVariants` (the variants that failed, each with its typed `error`). `create` still resolves the full `Post` and never throws on a partial/failed publish (a throw would discard the platforms that did publish). **Success = `status === 'published'`** — `partially_published` and `failed` are NOT success.
  - **`@postrun/js`** adds the pure helpers `isPublished(post)` / `failedVariants(post)` and the `PostVariant` / `PostVariantError` types, so a direct (non-React) caller shares the same outcome projection.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.1.0

## 2.0.0

### Major Changes

- Connection delete is now **unconditional** — disconnecting an account is one-click and never blocked by existing posts (the industry norm). Published posts keep their history; a scheduled post that loses its account fails _at publish time_ with a typed reason. This regenerates the SDK to the new API contract:

  - **`connection_id` is now nullable** (`string | null`) on the post-variant resource and on the `post.completed` / `post.failed` webhook variant summaries — a variant whose connected account was removed reads `null` (its `result`/`permalink` history is preserved). **Breaking:** handle the null where you read a variant's `connection_id`.
  - **Error codes changed (breaking for exhaustive switches):** `connection_in_use` is **removed** (deleting a connection no longer 409s on referencing posts), and `connection_removed` + `variant_unparseable` are **added** — a variant whose connection was removed, or whose stored settings no longer parse, surfaces as a typed publish/readiness failure rather than silently vanishing.

  `useConnect` / `useDisconnect` and the rest of the React surface are unchanged.

### Patch Changes

- Updated dependencies
  - @postrun/js@2.0.0

## 1.3.0

### Minor Changes

- Post validation: the SDK builds, the server decides.

  - `buildCreatePost` / `derivePostType` are now TOTAL — they never throw for a media/`post_type` combination. Validity (which media pair with which placement, document support, count limits, empty media) is the SERVER's job, returned as typed issues by the new `POST /v1/posts/validate`. `derivePostType` is best-effort SUGAR for a default placement; the only retained `ComposeError` guards are genuine usage errors (an unresolvable connection, a build with zero channels). An in-progress composition can always be built to validate.
  - New `useValidatePost(profileId)` (`@postrun/react`) — builds the same best-effort variant set and calls `/posts/validate`, returning `{ validate, publishable, issues, isPending, error, isReady, connectedChannels }`. It is a READ (no cache invalidation); `validate` is a stable callback and the hook never debounces internally (let the caller debounce for live-as-you-type).
  - New type aliases (`@postrun/js`, re-exported from `@postrun/react`): `PostValidation`, `ValidationIssue`, `ValidatePostInput` — derived from the regenerated client.

### Patch Changes

- Updated dependencies
  - @postrun/js@1.3.0

## 1.2.0

### Minor Changes

- `useConnect` / `<Connect>` gain an **`onSuccess()`** callback that fires whenever the connect succeeds — `active` OR `connected_pending` — so hosts can "close the dialog + let the auto-refetched list show the result" in one place, instead of watching `state.phase` for the pending case. `onConnected(connection)` still fires (only) on `active` when you need the bound connection.

### Patch Changes

- @postrun/js@1.2.0

## 1.1.0

### Minor Changes

- `useConnect` DX improvements (all additive):

  - **Auto-refetch:** a successful connect now invalidates your `useConnections` list, so the new account appears with no manual refetch.
  - **Callbacks:** `onError(reason)` and `onCancelled()` join `onConnected` — react to outcomes without reading `state.phase`.
  - **`prepare()` + `prepareOnMount`:** for a MULTI-platform picker, set `prepareOnMount: false` and call `prepare()` on the button's `onPointerEnter`/`onFocus` so only the platform the user is about to click mints a session (not all of them on mount). Default stays `true`, so a dedicated "Connect X" button is unchanged. `<Connect>` threads all of these.
  - **New `prepare_failed` reason** in `ConnectErrorReason`: a session-mint failure (before the OAuth popup opens) is now distinct from a Nango grant `auth_failed`, and a 2xx connect with no body surfaces this typed error instead of silently hanging.

### Patch Changes

- @postrun/js@1.1.0

## 1.0.0

### Major Changes

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

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @postrun/js@1.0.0

## 0.2.0

### Minor Changes

- c7ab560: Composer enablement + the changes since 0.1.0:

  - `useConnections(profileId, { kind, status })` — filter a profile's connections by kind (`posting`/`ads`) or lifecycle status, so a composer can fetch social-only accounts. Adds `ListConnectionsQuery` / `ConnectionKind` / `ConnectionStatus` / `ConnectionsFilter`.
  - `useMediaList` + `useMediaInfinite` (full filters + pagination); `mediaKeys` list/infinite; list-cache invalidation on media mutations.
  - Named `Metadata` + `MetadataFilter` type aliases.
  - TikTok compose handler (`video`/`single_image`/`carousel`); `buildVariants` made auto-exhaustive over the platform registry.
  - Fix: `useConnect` now reads the renamed `hosted_connect_url`; `MediaKind` re-derived as non-null.

### Patch Changes

- Updated dependencies [c7ab560]
  - @postrun/js@0.2.0

## 0.1.0

### Minor Changes

- First public release.

  - `@postrun/js` — typed SDK (Hey API), runtime Zod validators (`@postrun/js/schemas`), throw-based typed errors (`PostrunError` with a closed `code` union, `request_id`, `fieldErrors`), and the server-only token mint (`@postrun/js/server`).
  - `@postrun/react` — `<PostrunProvider>` + hooks for profiles, connections (hosted OAuth), media upload, and posts — including live status polling (`usePost`/`useCalendar`) and append-style pagination (`usePostsInfinite`/`useProfilesInfinite`).

### Patch Changes

- Updated dependencies
  - @postrun/js@0.1.0

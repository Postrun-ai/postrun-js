# @postrun/react

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

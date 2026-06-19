# @postrun/react

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

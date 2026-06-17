# @postrun/js

## 0.1.0

### Minor Changes

- First public release.

  - `@postrun/js` — typed SDK (Hey API), runtime Zod validators (`@postrun/js/schemas`), throw-based typed errors (`PostrunError` with a closed `code` union, `request_id`, `fieldErrors`), and the server-only token mint (`@postrun/js/server`).
  - `@postrun/react` — `<PostrunProvider>` + hooks for profiles, connections (hosted OAuth), media upload, and posts — including live status polling (`usePost`/`useCalendar`) and append-style pagination (`usePostsInfinite`/`useProfilesInfinite`).

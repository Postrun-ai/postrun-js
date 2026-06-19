---
"@postrun/js": minor
"@postrun/react": minor
---

Composer enablement + the changes since 0.1.0:

- `useConnections(profileId, { kind, status })` — filter a profile's connections by kind (`posting`/`ads`) or lifecycle status, so a composer can fetch social-only accounts. Adds `ListConnectionsQuery` / `ConnectionKind` / `ConnectionStatus` / `ConnectionsFilter`.
- `useMediaList` + `useMediaInfinite` (full filters + pagination); `mediaKeys` list/infinite; list-cache invalidation on media mutations.
- Named `Metadata` + `MetadataFilter` type aliases.
- TikTok compose handler (`video`/`single_image`/`carousel`); `buildVariants` made auto-exhaustive over the platform registry.
- Fix: `useConnect` now reads the renamed `hosted_connect_url`; `MediaKind` re-derived as non-null.

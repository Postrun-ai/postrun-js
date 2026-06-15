# @postrun/react

React provider, hooks, and headless components for the [Postrun API](https://postrun.ai).

Wrap your app once, then build your UI from hooks (data + orchestration) and a few
domain-aware components (the connect dance, brand marks, the media pipeline).

```tsx
import { PostrunProvider } from '@postrun/react';

function App() {
  return (
    <PostrunProvider getToken={() => fetch('/api/postrun-token').then((r) => r.json()).then((t) => t.token)}>
      {/* your app */}
    </PostrunProvider>
  );
}
```

## What this ships

**Hooks** (do the work — you render):

- `useProfiles` / `useProfile`
- `useConnections` / `useConnect`
- `useMediaUpload`
- `usePosts` / `usePost`

**Components** (domain knowledge you shouldn't have to reproduce):

- `PlatformIcon` — real brand marks (X, LinkedIn, Meta, …)
- `ConnectAccountButton` — the full OAuth + account-select flow
- `NetworkSelector` — pick connected accounts
- `MediaDropzone` — upload → process → per-platform preview

Composite, opinionated UI (a post composer, a calendar/queue) is **deliberately not
shipped** — that's your product and your taste. Build it from the hooks above.

## License

Source-available under [PolyForm Shield 1.0.0](../../LICENSE): use it freely in
your product; you may not use it to build a competing API.

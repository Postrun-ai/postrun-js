# @postrun/react

React provider and hooks for the [Postrun API](https://postrun.ai).

Wrap your app once, then build your UI from hooks that handle the data fetching,
caching, and orchestration for you — the hosted OAuth connect flow, the media
upload pipeline, live status polling, and pagination.

```tsx
import { PostrunProvider } from '@postrun/react';

function App() {
  return (
    <PostrunProvider
      getToken={() =>
        fetch('/api/postrun-token')
          .then((r) => r.json())
          .then((t) => t.token)
      }
    >
      {/* your app */}
    </PostrunProvider>
  );
}
```

Your backend mints a short-lived, scoped token from your secret key; the provider
calls `getToken` to supply it. The secret key never touches the browser.

## Hooks

**Profiles** — `useProfiles` · `useProfilesInfinite` · `useProfile` ·
`useCreateProfile` · `useUpdateProfile` · `useDeleteProfile`

**Connections** — `useConnect` (hosted OAuth) · `useConnections` ·
`useConnection` · `useDiscoverableAccounts` · `useSelectAccount` ·
`useDisconnect`

**Media** — `useMediaUpload` (signed upload → bytes → poll until ready) ·
`useMedia` · `useUpdateMedia` · `useDeleteMedia`

**Posts** — `usePosts` · `usePostsInfinite` · `useCalendar` · `usePost` ·
`useCreatePost` · `useUpdatePost` · `useDeletePost`

Lists paginate with the `*Infinite` hooks — a clean append-style surface
(`{ items, loadMore, hasMore, isLoading, isLoadingMore, total }`). The calendar
and post hooks poll live while a post is publishing and stop the moment it
settles, so a scheduled post visibly transitions with no manual refetch.

Composite, opinionated UI (a post composer, a calendar grid) is **deliberately
not shipped** — that's your product and your taste. Build it from the hooks above.

## License

[Apache-2.0](../../LICENSE) — use it freely in your product, with an explicit
patent grant. "Postrun" is a trademark (see [NOTICE](../../NOTICE)).

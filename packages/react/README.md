# @postrun/react

React provider and hooks for the [Postrun API](https://postrun.ai).

Wrap your app once, then build your UI from hooks that handle the data fetching,
caching, and orchestration for you — the embedded one-click OAuth connect flow,
the media upload pipeline, live status polling, and pagination.

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

**Connections** — `useConnect` (embedded one-click OAuth) · `Connect` (drop-in) ·
`useConnections` · `useConnection` · `useDiscoverableAccounts` ·
`useSelectAccount` · `useDisconnect`

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

## One-click connect

Connect a platform from **your own button**, in your own app — no redirect, no
second click. `<Connect>` runs the OAuth popup in-page and, for multi-account
platforms (Meta Ads, Facebook Pages), hands you the discoverable accounts to draw
your own picker. It's headless: you render every pixel.

```tsx
import { Connect } from '@postrun/react';

function ConnectX({
  profileId,
  onConnected,
}: {
  profileId: string;
  onConnected: () => void; // e.g. refetch your connections list
}) {
  return (
    <Connect profileId={profileId} platform="x" onConnected={onConnected}>
      {({ state, start, select, reset }) => {
        if (state.phase === 'picking') {
          return (
            <ul>
              {state.accounts.map((a) => (
                <li key={a.external_account_id}>
                  <button onClick={() => select(a.external_account_id)}>
                    {a.name ?? a.external_account_id}
                  </button>
                </li>
              ))}
            </ul>
          );
        }
        if (state.phase === 'error') {
          return <button onClick={reset}>Try again</button>;
        }
        return (
          // `start` MUST be called directly in the click — it opens the popup
          // synchronously, so the browser keeps it inside the user gesture.
          <button onClick={start} disabled={state.phase !== 'idle'}>
            {state.phase === 'active' ? 'Connected ✓' : 'Connect X'}
          </button>
        );
      }}
    </Connect>
  );
}
```

Prefer wiring it yourself? `useConnect({ profileId, platform, onConnected })`
returns the same `{ state, start, prepare, select, reset }` — `<Connect>` is just
a thin render-prop wrapper over it. The hosted `/connect` page remains available
as a no-SDK fallback (link to the `hosted_connect_url` from a `POST .../connect`).

`onConnected` also auto-refetches your `useConnections` list, so the new account
shows up with no manual refetch. Pass `onError(reason)` / `onCancelled()` if you'd
rather react with callbacks than read `state.phase`.

**Multi-platform picker?** A session is pre-minted on mount, which is ideal for a
dedicated button but would mint one per platform in a "pick a network" list. Set
`prepareOnMount={false}` and call `prepare()` on the button's intent
(`onPointerEnter`/`onFocus`) so only the platform the user is about to click mints:

```tsx
<Connect profileId={id} platform="meta_ads" prepareOnMount={false} onConnected={refetch}>
  {({ state, start, prepare, select }) =>
    state.phase === 'picking' ? (
      <Picker accounts={state.accounts} onPick={select} />
    ) : (
      <button onPointerEnter={prepare} onFocus={prepare} onClick={start}>
        Connect Meta
      </button>
    )
  }
</Connect>
```

## License

[Apache-2.0](../../LICENSE) — use it freely in your product, with an explicit
patent grant. "Postrun" is a trademark (see [NOTICE](../../NOTICE)).

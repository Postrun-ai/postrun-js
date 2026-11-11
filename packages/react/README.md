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
platforms (Facebook Pages), hands you the discoverable accounts to draw
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

A successful connect auto-refetches your `useConnections` list, so the new account
shows up with no manual refetch. Prefer callbacks to reading `state.phase`? Use
`onSuccess()` (fires on success — `active` **or** `connected_pending`, ideal for
"close the dialog"), `onConnected(connection)` (only `active`, hands you the bound
connection), `onError(reason)`, and `onCancelled()`.

**Multi-platform picker?** A session is pre-minted on mount, which is ideal for a
dedicated button but would mint one per platform in a "pick a network" list. Set
`prepareOnMount={false}` and call `prepare()` on the button's intent
(`onPointerEnter`/`onFocus`) so only the platform the user is about to click mints:

```tsx
<Connect profileId={id} platform="facebook_page" prepareOnMount={false} onConnected={refetch}>
  {({ state, start, prepare, select }) =>
    state.phase === 'picking' ? (
      <Picker accounts={state.accounts} onPick={select} />
    ) : (
      <button onPointerEnter={prepare} onFocus={prepare} onClick={start}>
        Connect Facebook
      </button>
    )
  }
</Connect>
```

## Post previews

Show how a post will look on each network before it publishes, rendered from
the same variant you send to `useCreatePost`:

| Component | Network |
| --- | --- |
| `XPostPreview` | X (built on `react-tweet`, so your bundler must load its CSS modules; Next.js and Vite do) |
| `LinkedInPostPreview` | LinkedIn |
| `InstagramPostPreview` · `ReelPreview` | Instagram feed · Reels |
| `TikTokPostPreview` | TikTok (always dark; takes `creatorInfo` from `useTikTokCreatorInfo`) |
| `TikTokPublishPanel` | TikTok's required pre-publish panel (caption, audience, disclosures) |

```tsx
import { XPostPreview, useMediaUpload } from '@postrun/react';

const { ready } = useMediaUpload();

<XPostPreview
  variant={variant}            // a draft you're composing, or a post you fetched
  connection={connection}      // from useConnections(); supplies name, @handle, avatar
  media={ready}                // drafts only: fetched posts carry their media inline
  theme={isDark ? 'dark' : 'light'}
/>;
```

- **Media** comes from the Postrun media API. A preview shows the exact
  rendition each network will receive, with a "Processing media…" tile until it
  is ready. Local files are not previewed.
- **Theme**: `auto` (the default) follows the **OS** color scheme, not your app.
  If your app has its own light/dark toggle, pass `theme` explicitly.
- `MediaResource` is exported here for typing the `media` prop.

### Compose your own

Every preview is built from parts you can reorder, drop, or replace. Render the
network's `Root` with the same props as the preview, then any parts you want:

```tsx
import {
  LinkedInPreviewRoot,
  LinkedInPreviewHeader,
  LinkedInPreviewContent,
  LinkedInPreviewActions,
  useLinkedInPreview,
} from '@postrun/react';

function MyBody() {
  const { variant } = useLinkedInPreview(); // the same data our parts read
  return <MyEditor value={variant.body} />;
}

<LinkedInPreviewRoot variant={variant} connection={connection} media={ready}>
  <LinkedInPreviewHeader />
  <MyBody />
  <LinkedInPreviewContent />
  <LinkedInPreviewActions />
</LinkedInPreviewRoot>;
```

| Network | Root | Parts | Data hook |
| --- | --- | --- | --- |
| X | `XPreviewRoot` | `Header` · `Body` · `Content` · `Actions` (prefixed `XPreview…`) | `useXPreview()` |
| LinkedIn | `LinkedInPreviewRoot` | `Header` · `Body` · `Content` · `Actions` | `useLinkedInPreview()` |
| Instagram | `InstagramPreviewRoot` | `Header` · `Content` · `Actions` · `Body` | `useInstagramPreview()` |
| TikTok | `TikTokPreviewRoot` | `Content` · `Body` · `Actions` | `useTikTokPreview()` |

`Body` is the post text, `Content` is what sits with it (media, poll, article,
quoted post), and `Actions` is the static engagement row. A part throws if it is
rendered outside its `Root`. The Instagram `Root` renders the feed card; a single
video is a reel, so use `<ReelPreview>` for it (`<InstagramPostPreview>` switches
for you). TikTok's `Body` and `Actions` sit on top of the video, so a replacement
positions itself.

## License

[Apache-2.0](../../LICENSE) — use it freely in your product, with an explicit
patent grant. "Postrun" is a trademark (see [NOTICE](../../NOTICE)).

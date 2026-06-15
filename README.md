# postrun-js

Official JavaScript SDK + React hooks/components for the [Postrun API](https://postrun.ai) —
the unified posting + ads API for apps and AI agents.

Build a full social-scheduling UI (a Hootsuite-style app) directly against Postrun,
**without standing up your own backend** beyond minting a scoped token.

## Packages

| Package | What it is |
| --- | --- |
| [`@postrun/js`](./packages/js) | Typed HTTP client + client-side validation, generated from the public OpenAPI spec |
| [`@postrun/react`](./packages/react) | `<PostrunProvider>` + hooks (`useProfiles`, `useConnect`, `useMediaUpload`, `usePosts`, …) + a few domain-aware components |

## Philosophy

- **Hooks do the work; you render.** Data and orchestration (the OAuth dance,
  upload→process→poll) ship as hooks. The presentation is yours.
- **Components only where we carry domain knowledge** you shouldn't reproduce —
  real platform brand marks, the connect flow, the media pipeline. No giant
  composer, no opinionated calendar. That's your product.
- **The contract is the source of truth.** Types and validators are generated
  from `https://api.postrun.ai/v1/openapi.json`, so the SDK can't drift.

## Develop

```bash
pnpm install
pnpm build       # turbo build, all packages
pnpm typecheck
pnpm test
```

## License

[Apache-2.0](./LICENSE) — use, modify, and ship it freely in your own products,
with an explicit patent grant. The Postrun **name and marks** are trademarks (see
[NOTICE](./NOTICE)); the license covers the code, not the brand.

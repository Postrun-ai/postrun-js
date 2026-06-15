# @postrun/js

Typed JavaScript client for the [Postrun API](https://postrun.ai) — the unified
posting + ads API for apps and AI agents.

```ts
import { PostrunClient } from '@postrun/js';

const postrun = new PostrunClient({
  // Your backend mints a short-lived scoped token from a secret `pr_` key.
  // The secret NEVER touches the browser — only the token does.
  getToken: () => fetch('/api/postrun-token').then((r) => r.json()).then((t) => t.token),
});
```

## Entry points

| Import | Purpose |
| --- | --- |
| `@postrun/js` | The HTTP client (`PostrunClient`) |
| `@postrun/js/schemas` | Client-side validation — _coming next_ |

## Generated from the contract

The typed per-endpoint surface and the validation schemas are **generated from
the public OpenAPI spec** (`https://api.postrun.ai/v1/openapi.json`) via
`pnpm generate`, so the SDK can never drift from the live API.

## Client-side validation (planned)

Because the API validates every write with Zod and publishes the spec, the same
checks ship to the browser: a customer can validate a post _before_ calling the
API — instant feedback, no network round-trip, identical to the server `dry_run`.

## License

Source-available under [PolyForm Shield 1.0.0](../../LICENSE): use it freely in
your product; you may not use it to build a competing API.

# @postrun/js

Typed JavaScript client for the [Postrun API](https://postrun.ai) — the unified
posting + ads API for apps and AI agents.

The client, the resource-style SDK functions, and the validation schemas are all
**generated from the public OpenAPI spec** with [Hey API](https://heyapi.dev), so
every path, param, body, response, and error code is strongly typed end-to-end
and can never drift from the live API.

## Install

```sh
npm install @postrun/js
```

## Two-sided model: a server mints, the browser calls

Your backend holds the secret `pr_` key and mints **short-lived, scoped tokens**.
The browser only ever holds a token and calls the API directly — the secret never
reaches the browser.

### Backend — mint a scoped token

```ts
import { createPostrunServer } from '@postrun/js/server';

const postrun = createPostrunServer({
  secretKey: process.env.POSTRUN_SECRET_KEY!, // a `pr_…` key — server only
});

// In your token endpoint (e.g. GET /api/postrun-token):
const { token } = await postrun.tokens.mint({
  profile_scope: { type: 'ids', values: ['prof_123'] },
  scopes: ['posts:read', 'posts:write'],
});
```

`createPostrunServer` refuses to run in a browser. The raw `postrun.client` is
also exposed for any other server-side call (pass it to a generated SDK function:
`postsCreate({ client: postrun.client, body })`).

### Frontend — call the API with the token

```ts
import { createPostrunClient, postsList } from '@postrun/js';

const postrun = createPostrunClient({
  // Called per request — fetch/cache/refresh the minted token here.
  getToken: () => fetch('/api/postrun-token').then((r) => r.json()).then((t) => t.token),
});

// SDK functions take `{ client }` and return the value directly (throw on error).
const { data } = await postsList({ client: postrun, query: { limit: 20 } });
```

## Typed errors

Every failed request throws a `PostrunError`. Its `code` is the **closed
`PostrunErrorCode` union** generated from the API's error registry, so you get
autocomplete and exhaustive branching — never a bare string.

```ts
import { postsCreate, PostrunError } from '@postrun/js';
import type { PostrunErrorCode } from '@postrun/js';

try {
  await postsCreate({ client: postrun, body });
} catch (err) {
  if (err instanceof PostrunError) {
    // `err.code` autocompletes to the closed set of Postrun error codes.
    switch (err.code) {
      case 'not_publishable':
        // One or more variants aren't ready to publish.
        break;
      case 'validation_failed':
        // Per-field problems on a 422 are surfaced for convenience:
        for (const { field, code, detail } of err.fieldErrors) {
          console.warn(`${field}: ${detail} (${code})`);
        }
        break;
      case 'rate_limited':
        // Back off and retry.
        break;
      default:
        break;
    }

    // Always available for support/debugging:
    console.error(err.status, err.code, err.request_id);
  }
}
```

`PostrunError` exposes:

| Field | Type | Notes |
| --- | --- | --- |
| `status` | `number` | HTTP status. |
| `code` | `PostrunErrorCode \| undefined` | Closed union; `undefined` only for an unrecognized code. |
| `request_id` | `string \| undefined` | Quote this in support requests. |
| `fieldErrors` | `{ field, code, detail }[]` | Per-field validation problems (empty unless 422). |
| `problem` | `PostrunProblem \| undefined` | The full parsed RFC 9457 body. |

## Client-side validation — `@postrun/js/schemas`

The same Zod validators the API uses ship to the browser, so you can validate a
request **before** sending it — instant feedback, no network round-trip.

```ts
import { zPostsCreateBody } from '@postrun/js/schemas';

const result = zPostsCreateBody.safeParse(draft);
if (!result.success) {
  // Show field errors locally before calling the API.
}
```

## Entry points

| Import | Purpose |
| --- | --- |
| `@postrun/js` | The client (`createPostrunClient`), the generated SDK functions, and typed errors. |
| `@postrun/js/server` | `createPostrunServer` — mint scoped tokens from your secret key (server only). |
| `@postrun/js/schemas` | Generated Zod validators for client-side validation. |

## Generated from the contract

`src/client/**` is generated from `openapi.json` (synced from the Postrun API) via
`pnpm generate`. Everything else (client wiring, typed errors, compose helpers) is
hand-written on top of that generated layer.

## License

[Apache-2.0](../../LICENSE) — use it freely in your product, with an explicit
patent grant. "Postrun" is a trademark (see [NOTICE](../../NOTICE)).

---
"@postrun/js": minor
---

Automatic token management. The SDK now caches the scoped token and refreshes it reactively, so `getToken` can be a trivial "fetch a token from my backend" — it is no longer called per request, and customers no longer cache or track token expiry themselves.

- `getToken` is called once; its result is reused for every request (concurrent first-load requests share a single in-flight call, so exactly one token is minted).
- When a request returns `401`, the SDK fetches a fresh token via `getToken` and retries the request once — preserving the method, body, and all headers (including the `Idempotency-Key`), overriding only `Authorization`. Retrying only on `401` is side-effect-safe: a `401` is rejected at the auth layer before the request executes.

Applies to `@postrun/react` automatically — `PostrunProvider` wraps `createPostrunClient`.

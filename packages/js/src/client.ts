import { createClient, createConfig } from './client/client';
import type { Client } from './client/client';
import { PostrunError } from './errors';
import { createTokenCache } from './token-cache';
import type { TokenCache } from './token-cache';

/**
 * The strongly-typed Postrun API client (Hey API). Pass it to any generated SDK
 * function via `{ client }`; every path, param, body, and response is inferred
 * from the OpenAPI spec, so the SDK can never drift from the live API.
 */
export type PostrunClient = Client;

export interface PostrunClientOptions {
  /** Override the API base URL (defaults to the production gateway). */
  baseUrl?: string;
  /**
   * Returns a short-lived scoped token. The host app's backend mints it from a
   * secret `pr_` key (`POST /v1/tokens`); the secret never reaches the browser.
   * The client caches the result and only re-fetches reactively on a `401`, so
   * this can be a trivial "fetch a token from my backend" — it is NOT called
   * per request.
   */
  getToken: () => string | Promise<string>;
}

const DEFAULT_BASE_URL = 'https://api.postrun.ai/v1';

/** The one status a fresh token can fix; 403/404 are scope/tenancy, not auth. */
const UNAUTHORIZED = 401;

/**
 * Wrap `fetch` so a single `401` triggers one token refresh + retry. The request
 * is cloned BEFORE the first send so its body survives the retry; on retry only
 * `Authorization` is overridden — every other header (idempotency key,
 * content-type, …) is preserved. A refresh failure surfaces the original `401`.
 * Bounded to one retry (no recursion), so a genuinely bad credential just
 * returns the second `401` for the error interceptor to surface.
 */
function createRetryingFetch(tokenCache: TokenCache): typeof fetch {
  const realFetch: typeof fetch = (...args) => globalThis.fetch(...args);

  return async (input, init) => {
    const request = new Request(input, init);
    const retryable = request.clone();

    const response = await realFetch(request);
    if (response.status !== UNAUTHORIZED) {
      return response;
    }

    try {
      const token = await tokenCache.refresh();
      const headers = new Headers(retryable.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return await realFetch(new Request(retryable, { headers }));
    } catch {
      return response;
    }
  };
}

/** Append `key=value` (URL-encoded) for one scalar to the running parts list. */
function appendScalar(parts: string[], key: string, value: unknown): void {
  parts.push(
    `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
}

/**
 * Serialize the query string for every Postrun request, by value shape:
 *
 *  - **Array** (e.g. `status`) → repeated params (`status=a&status=b`), the
 *    OpenAPI `form`/`explode` form the API parses into a `.in(...)` filter. A
 *    JSON-encoded array would fail the array-of-enum validation.
 *  - **Object** (e.g. `metadata`) → one URL-encoded JSON blob, because the API's
 *    schema runs a `JSON.parse` preprocess on it; bracket form would mean the
 *    server never sees a `metadata` key and silently drops the filter.
 *  - **Scalar** → the value as-is.
 *
 * Operations needing a different shape (the ads reads' `metrics`/`segments`
 * params) carry their own per-call serializer in the generated SDK, which
 * overrides this.
 */
function serializeQuery(query: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          appendScalar(parts, key, item);
        }
      }
    } else if (typeof value === 'object') {
      appendScalar(parts, key, JSON.stringify(value));
    } else {
      appendScalar(parts, key, value);
    }
  }

  return parts.join('&');
}

/**
 * Construct a typed client. The browser only ever holds the scoped token —
 * the cached token is sent as `Bearer <token>` for the spec's `bearerAuth`
 * security scheme, re-fetched only when a request returns `401`.
 *
 * Calls throw on failure (`throwOnError`), so SDK functions return the value
 * directly (no `{ data, error }` to unwrap) — the throw-based shape every major
 * SDK uses. The error interceptor maps the raw failure to a typed `PostrunError`
 * (status + machine `code` + RFC 9457 problem), so `catch` always gets the same
 * actionable shape.
 */
export function createPostrunClient(
  options: PostrunClientOptions,
): PostrunClient {
  const tokenCache = createTokenCache(options.getToken);

  const client = createClient(
    createConfig({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      auth: () => tokenCache.current(),
      fetch: createRetryingFetch(tokenCache),
      querySerializer: serializeQuery,
      throwOnError: true,
    }),
  );

  client.interceptors.error.use((error, response) =>
    error instanceof PostrunError
      ? error
      : new PostrunError(response?.status ?? 0, error),
  );

  return client;
}

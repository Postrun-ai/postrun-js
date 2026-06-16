import { createClient, createConfig } from './client/client';
import type { Client } from './client/client';
import { PostrunError } from './errors';

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
   * Returns a valid short-lived scoped token. The host app's backend mints it
   * from a secret `pr_` key (`POST /v1/tokens`); the secret never reaches the
   * browser. Called per request — cache/refresh before `exp` inside here.
   */
  getToken: () => string | Promise<string>;
}

const DEFAULT_BASE_URL = 'https://api.postrun.ai/v1';

/**
 * The `metadata` filter is parsed by the API as a URL-encoded JSON string (its
 * schema runs a `JSON.parse` preprocess), so an object value must be sent as one
 * JSON blob, not the client's default bracket form. This global serializer
 * JSON-encodes object values; operations that need a different shape (the ads
 * reads' `metrics`/`segments` deepObject params) carry their own per-call
 * serializer in the generated SDK, which overrides this.
 */
function serializeQuery(query: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(raw)}`);
  }

  return parts.join('&');
}

/**
 * Construct a typed client. The browser only ever holds the scoped token —
 * `getToken` is invoked per request and its value is sent as `Bearer <token>`
 * for the spec's `bearerAuth` security scheme.
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
  const client = createClient(
    createConfig({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      auth: () => options.getToken(),
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

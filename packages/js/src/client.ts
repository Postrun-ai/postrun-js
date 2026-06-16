import createOpenApiClient from 'openapi-fetch';
import type { Client } from 'openapi-fetch';

import type { paths } from './generated/types';

/**
 * The strongly-typed Postrun API client. Every path, method, path/query param,
 * request body, and response is inferred from the OpenAPI spec — there are no
 * hand-written request/response types anywhere downstream (including the React
 * hooks), so the SDK can never drift from the live API.
 */
export type PostrunClient = Client<paths>;

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
 * JSON blob, not openapi-fetch's default bracket form.
 *
 * KNOWN LIMITATION (deferred with ads): this currently JSON-encodes EVERY object
 * value, which is right for `metadata` but wrong for the bracket-notation params
 * the oRPC backend expects on the ads-insights reads (`metrics[]=`,
 * `time_range[since]=`). No shipped hook uses those yet. Fix when ads hooks land
 * — verify the exact bracket format against the oRPC deserializer first; it may
 * pair with a backend change.
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

/** Construct a typed client. The browser only ever holds the scoped token. */
export function createPostrunClient(
  options: PostrunClientOptions,
): PostrunClient {
  const client = createOpenApiClient<paths>({
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    querySerializer: serializeQuery,
  });

  client.use({
    async onRequest({ request }) {
      const token = await options.getToken();
      request.headers.set('authorization', `Bearer ${token}`);
      return request;
    },
  });

  return client;
}

/**
 * Minimal typed client for the Postrun API.
 *
 * The browser NEVER holds a secret `pr_` key. It holds a short-lived, scoped
 * token minted by the customer's backend (`POST /v1/tokens`). This client takes
 * a `getToken` callback so the host app decides how to fetch/refresh that token;
 * the client just attaches it as `Authorization: Bearer <token>`.
 *
 * NOTE: scaffold stub. The typed per-endpoint surface is generated from the
 * public OpenAPI spec (`pnpm generate`) — see the package README.
 */
export interface PostrunClientOptions {
  /** Base URL of the API. Defaults to the production gateway. */
  baseUrl?: string;
  /** Returns a valid scoped token (JWT). Called per request; cache/refresh as needed. */
  getToken: () => string | Promise<string>;
}

const DEFAULT_BASE_URL = 'https://api.postrun.ai/v1';

export class PostrunClient {
  readonly #baseUrl: string;
  readonly #getToken: PostrunClientOptions['getToken'];

  constructor(options: PostrunClientOptions) {
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.#getToken = options.getToken;
  }

  /** Low-level request helper. Typed resource methods are layered on top (generated). */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.#getToken();

    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // TODO: parse the RFC 9457 problem envelope into a typed PostrunError.
    if (!response.ok) {
      throw new Error(`Postrun API error: ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

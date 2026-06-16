import { createPostrunClient } from './client';
import type { PostrunClient } from './client';
import { tokensMint } from './client/sdk.gen';
import type { TokensMintData } from './client/types.gen';

type MintRequestBody = TokensMintData['body'];
type WireProfileScope = MintRequestBody['profile_scope'];

/**
 * A coarse `resource:action` permission — the closed set the API accepts,
 * derived from the spec so it can never drift. Money/structural writes are NOT
 * scopes: those endpoints are secret-key-only and a browser token can't reach
 * them, by design.
 */
export type TokenScope = MintRequestBody['scopes'][number];

/**
 * Which profiles a minted token may act on:
 *  - `'all'`                       — every profile on the account
 *  - `{ ids: [...] }`              — specific Postrun profile ids
 *  - `{ externalIds: [...] }`      — your own ids (resolved per request, so it
 *                                    also covers profiles created after minting)
 */
export type ProfileScope =
  | 'all'
  | { readonly ids: readonly string[] }
  | { readonly externalIds: readonly string[] };

export interface MintTokenInput {
  /** Profiles the token may act on. */
  profiles: ProfileScope;
  /** What the token grants. At least one scope is required. */
  scopes: readonly TokenScope[];
  /** Token lifetime in seconds (API default 900 / 15 min, max 1800 / 30 min). */
  ttlSeconds?: number;
}

export interface MintedToken {
  /** The signed JWT — hand it to your frontend. */
  token: string;
  /** ISO-8601 expiry (mint time + ttl). Cache and refresh before it passes. */
  expiresAt: string;
}

export interface PostrunServerOptions {
  /** Your secret `pr_` API key. NEVER expose this to a browser. */
  secretKey: string;
  /** Override the API base URL (defaults to the production gateway). */
  baseUrl?: string;
}

export interface PostrunServer {
  /** A typed client authenticated with the secret key — for any server-side call. */
  readonly client: PostrunClient;
  readonly tokens: {
    /** Mint a short-lived, scoped frontend token from the secret key. */
    mint(input: MintTokenInput): Promise<MintedToken>;
  };
}

/** The secret key must never reach a browser — fail loudly if it would. */
function assertServerOnly(): void {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    throw new Error(
      'createPostrunServer must run only on a server — it holds your secret pr_ key. ' +
        'In the browser, use createPostrunClient with a minted scoped token instead.',
    );
  }
}

function toWireProfileScope(scope: ProfileScope): WireProfileScope {
  if (scope === 'all') return { type: 'all' };
  if ('ids' in scope) return { type: 'ids', values: [...scope.ids] };
  return { type: 'external_id', values: [...scope.externalIds] };
}

/**
 * Create a server-side Postrun client from a secret `pr_` key. Its primary job
 * is `tokens.mint` — issue a short-lived, scoped token your frontend hands to
 * `createPostrunClient`, so the secret key never reaches the browser. The raw
 * `client` is exposed for any other server-side call.
 */
export function createPostrunServer(options: PostrunServerOptions): PostrunServer {
  assertServerOnly();
  if (!options.secretKey) {
    throw new Error('createPostrunServer requires a secret `pr_` key (secretKey).');
  }

  const client = createPostrunClient({
    baseUrl: options.baseUrl,
    getToken: () => options.secretKey,
  });

  async function mint(input: MintTokenInput): Promise<MintedToken> {
    if (input.scopes.length === 0) {
      throw new Error(
        'mint requires at least one scope — a token with no scopes can do nothing.',
      );
    }

    const { data } = await tokensMint({
      client,
      body: {
        profile_scope: toWireProfileScope(input.profiles),
        scopes: [...input.scopes],
        ttl_seconds: input.ttlSeconds,
      },
    });

    return { token: data.token, expiresAt: data.expires_at };
  }

  return { client, tokens: { mint } };
}

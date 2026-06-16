import { createPostrunClient } from './client';
import type { PostrunClient } from './client';
import { tokensMint } from './client/sdk.gen';
import type { TokensMintData, TokensMintResponse } from './client/types.gen';

/**
 * The body for minting a scoped token — the generated request shape (snake_case,
 * the exact wire contract). `scopes` is the closed `resource:action` union and
 * `profile_scope` the `{ type, values }` selector, both derived from the spec so
 * they can never drift. Money/structural writes are NOT scopes: those endpoints
 * are secret-key-only and a browser token simply cannot reach them, by design.
 */
export type MintTokenInput = TokensMintData['body'];

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
    mint(input: MintTokenInput): Promise<TokensMintResponse>;
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

/**
 * Create a server-side Postrun client from a secret `pr_` key. Its primary job
 * is `tokens.mint` — issue a short-lived, scoped token your frontend hands to
 * `createPostrunClient`, so the secret key never reaches the browser. The raw
 * `client` is exposed for any other server-side call (e.g. the generated SDK
 * functions: `postsCreate({ client })`).
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

  async function mint(input: MintTokenInput): Promise<TokensMintResponse> {
    const { data } = await tokensMint({ client, body: input });
    return data;
  }

  return { client, tokens: { mint } };
}

/**
 * In-memory token cache for the Postrun client. The host app's `getToken`
 * becomes a trivial "mint a token from my backend"; this cache holds the result
 * and reuses it for every request. There is no expiry math, JWT decoding, or
 * timer — a stale token is detected reactively when a request returns `401`,
 * which calls `refresh()`. Concurrent fetches share one in-flight promise, so N
 * parallel requests (first load, or N concurrent 401s) mint exactly one token.
 */

export interface TokenCache {
  /** The cached token, minting one on first use. */
  current(): Promise<string>;
  /** Discard the cached token and mint a new one (use after a 401). */
  refresh(): Promise<string>;
}

export function createTokenCache(
  getToken: () => string | Promise<string>,
): TokenCache {
  let cached: string | undefined;
  let inFlight: Promise<string> | undefined;

  const mint = (): Promise<string> => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(getToken)
        .then((token) => {
          cached = token;
          return token;
        })
        .finally(() => {
          inFlight = undefined;
        });
    }
    return inFlight;
  };

  return {
    current() {
      return cached !== undefined ? Promise.resolve(cached) : mint();
    },
    refresh() {
      cached = undefined;
      return mint();
    },
  };
}

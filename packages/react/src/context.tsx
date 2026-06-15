import { createContext, createElement, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { PostrunClient } from '@postrun/js';

/**
 * The value every hook and component reads from context: a configured client.
 * Everything else (`useProfiles`, `useConnect`, `useMediaUpload`, …) is built on
 * top of this, so a host app wires auth exactly once at the provider.
 */
export interface PostrunContextValue {
  client: PostrunClient;
}

const PostrunContext = createContext<PostrunContextValue | null>(null);

export interface PostrunProviderProps {
  /**
   * Returns a valid short-lived scoped token. The host app's backend mints it
   * from a secret `pr_` key (`POST /v1/tokens`); the secret never reaches the
   * browser. Called per request — cache and refresh before `exp` inside here.
   */
  getToken: () => string | Promise<string>;
  /** Override the API base URL (defaults to the production gateway). */
  baseUrl?: string;
  children: ReactNode;
}

export function PostrunProvider({
  getToken,
  baseUrl,
  children,
}: PostrunProviderProps) {
  const value = useMemo<PostrunContextValue>(
    () => ({ client: new PostrunClient({ getToken, baseUrl }) }),
    [getToken, baseUrl],
  );

  return createElement(PostrunContext.Provider, { value }, children);
}

/** Access the configured Postrun client. Throws if used outside a provider. */
export function usePostrun(): PostrunContextValue {
  const value = useContext(PostrunContext);

  if (value === null) {
    throw new Error('usePostrun must be used within a <PostrunProvider>.');
  }

  return value;
}

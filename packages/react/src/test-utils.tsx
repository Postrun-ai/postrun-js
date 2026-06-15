import { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { PostrunProvider } from './context';

/** A provider wrapper with a retry-free client so error paths fail fast. */
export function testWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <PostrunProvider getToken={() => 'tok'} queryClient={queryClient}>
      {children}
    </PostrunProvider>
  );
}

/** Stub fetch with a JSON response and record each Request for assertions. */
export function recordFetch(body: unknown, status = 200) {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

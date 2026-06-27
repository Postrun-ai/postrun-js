import { act, render, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';

import { profilesList } from '@postrun/js';

import { PostrunProvider, usePostrun } from './context';

/**
 * The headline guarantee: the client is constructed ONCE and stays referentially
 * stable across re-renders, even though callers pass a brand-new `getToken`
 * closure on every render. A thrashing client would reset per-request state and
 * defeat any token caching we layer on later.
 */
test('keeps one stable client across re-renders despite a new getToken each render', () => {
  const seen: unknown[] = [];

  function Capture() {
    seen.push(usePostrun().client);
    return null;
  }

  function Parent() {
    const [n, setN] = useState(0);
    return (
      // A fresh arrow on every render — the common real-world case.
      <PostrunProvider getToken={() => `tok-${n}`}>
        <button onClick={() => setN((v) => v + 1)}>rerender</button>
        <Capture />
      </PostrunProvider>
    );
  }

  const { getByText } = render(<Parent />);
  act(() => getByText('rerender').click());

  expect(seen.length).toBeGreaterThanOrEqual(2);
  expect(seen[0]).toBe(seen[seen.length - 1]);
});

test('throws a clear, actionable error when used outside a provider', () => {
  expect(() => renderHook(() => usePostrun())).toThrow(
    /within a <PostrunProvider>/,
  );
});

test('caches the token across requests and re-fetches the freshest closure on a 401', async () => {
  const sent: string[] = [];
  const okBody = JSON.stringify({
    object: 'list',
    data: [],
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  });
  // First request 200, second 401 (then its retry 200): a 401 — never a token
  // prop change alone — is what makes the client re-fetch the token.
  const statuses = [200, 401, 200];
  let index = 0;
  const fetchMock = vi.fn(async (input: Request) => {
    sent.push(input.headers.get('authorization') ?? '');
    const status = statuses[Math.min(index, statuses.length - 1)]!;
    index += 1;
    return new Response(status === 200 ? okBody : '{}', {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);

  let client: ReturnType<typeof usePostrun>['client'] | undefined;
  function Grab() {
    client = usePostrun().client;
    return null;
  }
  function Tree({ token }: { token: string }) {
    return (
      <PostrunProvider getToken={() => token}>
        <Grab />
      </PostrunProvider>
    );
  }

  const { rerender } = render(<Tree token="tok-A" />);
  await act(async () => {
    if (client) await profilesList({ client });
  });

  // New token prop → new getToken closure. The cached token is reused (NO
  // re-fetch) until the request 401s, which forces a refresh that reads the
  // freshest closure via the provider's ref.
  rerender(<Tree token="tok-B" />);
  await act(async () => {
    if (client) await profilesList({ client });
  });

  expect(sent).toEqual(['Bearer tok-A', 'Bearer tok-A', 'Bearer tok-B']);
  vi.unstubAllGlobals();
});

import { act, render, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';

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

test('sends the freshest getToken result on every request (stable client, live token)', async () => {
  const sent: string[] = [];
  const fetchMock = vi.fn(async (input: Request) => {
    sent.push(input.headers.get('authorization') ?? '');
    return new Response(
      JSON.stringify({
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
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
    await client?.GET('/profiles');
  });

  // New token prop → new getToken closure; the stable client must pick it up.
  rerender(<Tree token="tok-B" />);
  await act(async () => {
    await client?.GET('/profiles');
  });

  expect(sent).toEqual(['Bearer tok-A', 'Bearer tok-B']);
  vi.unstubAllGlobals();
});

import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { PostrunError } from '@postrun/js';

import { PostrunProvider } from './context';
import {
  useCreateProfile,
  useDeleteProfile,
  useProfile,
  useProfiles,
  useUpdateProfile,
} from './profiles';

const PROFILE = {
  id: 'prof_1',
  name: 'Acme',
  description: null,
  external_id: null,
  metadata: {},
  created_at: null,
  updated_at: null,
};

const LIST = {
  object: 'list',
  data: [PROFILE],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
};

/** A wrapper with a retry-free client so error paths fail fast and tests isolate. */
function wrapper() {
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
function recordFetch(body: unknown, status = 200) {
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

afterEach(() => vi.unstubAllGlobals());

test('useProfiles returns the typed list once loaded', async () => {
  recordFetch(LIST);
  const { result } = renderHook(() => useProfiles(), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(LIST);
});

test('useProfiles surfaces a typed error instead of throwing', async () => {
  recordFetch({ code: 'not_found', title: 'Not found', status: 404 }, 404);
  const { result } = renderHook(() => useProfiles(), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(PostrunError);
});

test('useProfiles forwards filters and pagination to the request', async () => {
  const calls = recordFetch(LIST);
  renderHook(() => useProfiles({ limit: 5, external_id: 'ext_1' }), {
    wrapper: wrapper(),
  });

  await waitFor(() => expect(calls).toHaveLength(1));
  const url = new URL(calls[0]!.url);
  expect(url.pathname).toMatch(/\/profiles$/);
  expect(url.searchParams.get('limit')).toBe('5');
  expect(url.searchParams.get('external_id')).toBe('ext_1');
});

test('useProfiles dedupes concurrent identical queries into one request', async () => {
  const calls = recordFetch(LIST);
  const { result } = renderHook(
    () => ({ a: useProfiles(), b: useProfiles() }),
    { wrapper: wrapper() },
  );

  await waitFor(() =>
    expect(result.current.a.isSuccess && result.current.b.isSuccess).toBe(true),
  );
  expect(calls).toHaveLength(1);
});

test('useProfile returns a single profile by id', async () => {
  const calls = recordFetch(PROFILE);
  const { result } = renderHook(() => useProfile('prof_1'), {
    wrapper: wrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(PROFILE);
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/profiles\/prof_1$/);
});

test('useCreateProfile posts the body and returns the created profile', async () => {
  const calls = recordFetch(PROFILE, 201);
  const { result } = renderHook(() => useCreateProfile(), {
    wrapper: wrapper(),
  });

  let created: unknown;
  await act(async () => {
    created = await result.current.mutateAsync({ name: 'Acme' });
  });

  expect(calls[0]!.method).toBe('POST');
  expect(await calls[0]!.json()).toEqual({ name: 'Acme' });
  expect(created).toEqual(PROFILE);
});

test('useUpdateProfile patches the profile by id', async () => {
  const calls = recordFetch(PROFILE);
  const { result } = renderHook(() => useUpdateProfile(), {
    wrapper: wrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync({ id: 'prof_1', name: 'Renamed' });
  });

  expect(calls[0]!.method).toBe('PATCH');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/profiles\/prof_1$/);
  expect(await calls[0]!.json()).toEqual({ name: 'Renamed' });
});

test('useDeleteProfile deletes the profile by id', async () => {
  const calls = recordFetch({ id: 'prof_1', object: 'profile', deleted: true });
  const { result } = renderHook(() => useDeleteProfile(), {
    wrapper: wrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync('prof_1');
  });

  expect(calls[0]!.method).toBe('DELETE');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/profiles\/prof_1$/);
});

test('creating a profile invalidates and refetches the list', async () => {
  const calls = recordFetch(LIST);
  const { result } = renderHook(
    () => ({ list: useProfiles(), create: useCreateProfile() }),
    { wrapper: wrapper() },
  );

  await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
  const afterInitialLoad = calls.length;

  await act(async () => {
    await result.current.create.mutateAsync({ name: 'New' });
  });

  // POST + an automatic list refetch triggered by invalidation.
  await waitFor(() =>
    expect(calls.length).toBeGreaterThan(afterInitialLoad + 1),
  );
});

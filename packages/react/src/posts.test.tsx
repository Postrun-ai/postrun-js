import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { useDeletePost, usePost, usePosts } from './posts';
import { recordFetch, testWrapper } from './test-utils';

const POST = {
  id: 'post_1',
  object: 'post',
  profile_id: 'prof_1',
  external_id: null,
  status: 'scheduled',
  schedule_at: '2026-06-20T14:00:00Z',
  tags: [],
  notes: null,
  metadata: {},
  variants: [],
  created_at: '2026-06-15T00:00:00Z',
  updated_at: '2026-06-15T00:00:00Z',
};

const LIST = {
  object: 'list',
  data: [POST],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
};

afterEach(() => vi.unstubAllGlobals());

test('usePosts returns the typed list once loaded', async () => {
  recordFetch(LIST);
  const { result } = renderHook(() => usePosts(), { wrapper: testWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(LIST);
});

test('usePosts forwards profile + status filters to the request', async () => {
  const calls = recordFetch(LIST);
  renderHook(() => usePosts({ profile_id: 'prof_1', limit: 5 }), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(calls).toHaveLength(1));
  const url = new URL(calls[0]!.url);
  expect(url.pathname).toMatch(/\/posts$/);
  expect(url.searchParams.get('profile_id')).toBe('prof_1');
  expect(url.searchParams.get('limit')).toBe('5');
});

test('usePost returns a single post by id', async () => {
  const calls = recordFetch(POST);
  const { result } = renderHook(() => usePost('post_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(POST);
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/posts\/post_1$/);
});

test('useDeletePost deletes a post by id', async () => {
  const calls = recordFetch({ id: 'post_1', object: 'post', deleted: true });
  const { result } = renderHook(() => useDeletePost(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync('post_1');
  });

  expect(calls[0]!.method).toBe('DELETE');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/posts\/post_1$/);
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import {
  useCreatePost,
  useDeletePost,
  usePost,
  usePosts,
  useUpdatePost,
} from './posts';
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

function mockCreateFlow() {
  const calls: Request[] = [];
  const CONN = {
    id: 'conn_x',
    profile_id: 'prof_1',
    platform: 'x',
    external_account_id: 'acc_1',
    external_account_name: 'X',
    currency: null,
    created_at: null,
    updated_at: null,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const url = new URL(request.url);
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      if (request.method === 'GET' && url.pathname.endsWith('/connections')) {
        return json({ object: 'list', data: [CONN], total: 1, limit: 20, offset: 0, has_more: false });
      }
      if (request.method === 'POST' && url.pathname.endsWith('/posts')) return json(POST, 201);
      return json({}, 404);
    }),
  );
  return calls;
}

test('useCreatePost resolves connections, builds the body, and posts', async () => {
  const calls = mockCreateFlow();
  const { result } = renderHook(() => useCreatePost('prof_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.connectedChannels).toContain('x'));

  await act(async () => {
    await result.current.create({ content: { body: 'hi' }, channels: ['x'] });
  });

  const post = calls.find(
    (c) => c.method === 'POST' && new URL(c.url).pathname.endsWith('/posts'),
  )!;
  const sent = await post.json();
  expect(sent.profile_id).toBe('prof_1');
  expect(sent.variants[0].connection_id).toBe('conn_x');
  expect(sent.variants[0].body).toBe('hi');
});

test('useUpdatePost PATCHes the post (light edit)', async () => {
  const calls = recordFetch(POST);
  const { result } = renderHook(() => useUpdatePost('post_1'), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync({ schedule_at: '2026-06-20T14:00:00Z' });
  });

  const patch = calls.find((c) => c.method === 'PATCH')!;
  expect(new URL(patch.url).pathname).toMatch(/\/posts\/post_1$/);
  expect(await patch.json()).toEqual({ schedule_at: '2026-06-20T14:00:00Z' });
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

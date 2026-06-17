import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { PostrunError } from '@postrun/js';

import {
  useCalendar,
  useCreatePost,
  useDeletePost,
  usePost,
  usePosts,
  useUpdatePost,
} from './posts';
import { pollingWrapper, recordFetch, testWrapper } from './test-utils';

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

test('useCalendar forwards the date range + multi-status filters to the request', async () => {
  const calls = recordFetch(LIST);
  renderHook(
    () =>
      useCalendar({
        profile_id: 'prof_1',
        scheduled_after: '2026-06-01T00:00:00Z',
        scheduled_before: '2026-06-30T23:59:59Z',
        status: ['scheduled', 'failed'],
      }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(calls).toHaveLength(1));
  const url = new URL(calls[0]!.url);
  expect(url.pathname).toMatch(/\/posts$/);
  expect(url.searchParams.get('profile_id')).toBe('prof_1');
  expect(url.searchParams.get('scheduled_after')).toBe('2026-06-01T00:00:00Z');
  expect(url.searchParams.get('scheduled_before')).toBe(
    '2026-06-30T23:59:59Z',
  );
  // Multi-status serializes as repeated `status=` params (form/explode).
  expect(url.searchParams.getAll('status')).toEqual(['scheduled', 'failed']);
});

test('useCalendar returns the typed list and forwards a lone status value', async () => {
  const calls = recordFetch(LIST);
  const { result } = renderHook(() => useCalendar({ status: ['scheduled'] }), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(LIST);
  expect(new URL(calls[0]!.url).searchParams.getAll('status')).toEqual([
    'scheduled',
  ]);
});

test('useCalendar surfaces a typed PostrunError instead of throwing', async () => {
  recordFetch({ code: 'invalid_request', title: 'Bad request', status: 400 }, 400);
  const { result } = renderHook(
    () => useCalendar({ scheduled_after: 'not-a-date' }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(PostrunError);
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
    await result.current.create({ content: { body: 'hi' }, channels: { x: { settings: {} } } });
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

// --- Live-status polling -----------------------------------------------------
//
// `vi.useFakeTimers()` is new to this package. The discipline (TanStack Query
// v5): install fake timers BEFORE renderHook (the query registers its first
// internal timer on mount), advance with `advanceTimersByTimeAsync` (the
// interval callback awaits fetch — the sync variant won't drain the microtask
// queue, leaving the GET count stuck at 1), and run under `pollingWrapper`
// (`gcTime: Infinity`) so advancing timers past the default gc window doesn't
// drop the query mid-test. `globalThis.setTimeout` (what TQ uses) is patched by
// vitest's fake timers.

/** Flush the query's initial fetch under fake timers, inside act(). */
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

const DETAIL_GETS = (calls: Request[]) =>
  calls.filter(
    (c) =>
      c.method === 'GET' && /\/posts\/post_1$/.test(new URL(c.url).pathname),
  ).length;

const LIST_GETS = (calls: Request[]) =>
  calls.filter(
    (c) => c.method === 'GET' && /\/posts$/.test(new URL(c.url).pathname),
  ).length;

/** Route GET /posts/:id, advancing the returned status per request. */
function mockPostSequence(statuses: string[]) {
  const calls: Request[] = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const status = statuses[Math.min(i++, statuses.length - 1)];
      return new Response(JSON.stringify({ ...POST, status }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

/** Route GET /posts (list), advancing which page (by status set) per request. */
function mockListSequence(pages: string[][]) {
  const calls: Request[] = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const statuses = pages[Math.min(i++, pages.length - 1)]!;
      const data = statuses.map((status, n) => ({
        ...POST,
        id: `post_${n}`,
        status,
      }));
      return new Response(
        JSON.stringify({
          object: 'list',
          data,
          total: data.length,
          limit: 20,
          offset: 0,
          has_more: false,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
  return calls;
}

test('usePost polls while in-flight, then stops once terminal', async () => {
  vi.useFakeTimers();
  try {
    const calls = mockPostSequence(['scheduled', 'publishing', 'published']);
    const { result } = renderHook(() => usePost('post_1'), {
      wrapper: pollingWrapper(),
    });

    await settle();
    expect(result.current.isSuccess).toBe(true);
    expect(DETAIL_GETS(calls)).toBe(1); // scheduled

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(DETAIL_GETS(calls)).toBe(2); // publishing

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(DETAIL_GETS(calls)).toBe(3); // published (terminal)

    // No further polling after terminal.
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(DETAIL_GETS(calls)).toBe(3);
  } finally {
    vi.useRealTimers();
  }
});

test.each(['published', 'failed', 'partially_published', 'draft'])(
  'usePost does not poll a terminal %s post',
  async (status) => {
    vi.useFakeTimers();
    try {
      const calls = mockPostSequence([status]);
      const { result } = renderHook(() => usePost('post_1'), {
        wrapper: pollingWrapper(),
      });

      await settle();
    expect(result.current.isSuccess).toBe(true);
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(DETAIL_GETS(calls)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  },
);

test('usePost(id, { live: false }) never polls even while in-flight', async () => {
  vi.useFakeTimers();
  try {
    const calls = mockPostSequence(['scheduled']);
    const { result } = renderHook(() => usePost('post_1', { live: false }), {
      wrapper: pollingWrapper(),
    });

    await settle();
    expect(result.current.isSuccess).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(DETAIL_GETS(calls)).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

test('usePost polls by default (no option needed)', async () => {
  vi.useFakeTimers();
  try {
    const calls = mockPostSequence(['publishing', 'published']);
    const { result } = renderHook(() => usePost('post_1'), {
      wrapper: pollingWrapper(),
    });

    await settle();
    expect(result.current.isSuccess).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(DETAIL_GETS(calls)).toBeGreaterThan(1);
  } finally {
    vi.useRealTimers();
  }
});

test('useCalendar polls while ANY post is in-flight, then stops', async () => {
  vi.useFakeTimers();
  try {
    const calls = mockListSequence([
      ['scheduled', 'published'],
      ['published', 'published'],
    ]);
    const { result } = renderHook(() => useCalendar(), {
      wrapper: pollingWrapper(),
    });

    await settle();
    expect(result.current.isSuccess).toBe(true);
    expect(LIST_GETS(calls)).toBe(1); // contains a scheduled post

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(LIST_GETS(calls)).toBeGreaterThan(1); // re-polled while in-flight

    const afterTerminal = LIST_GETS(calls); // page is now all-published
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(LIST_GETS(calls)).toBe(afterTerminal); // stopped
  } finally {
    vi.useRealTimers();
  }
});

test('useCalendar does not poll when all posts are terminal', async () => {
  vi.useFakeTimers();
  try {
    const calls = mockListSequence([['published', 'failed', 'draft']]);
    const { result } = renderHook(() => useCalendar(), {
      wrapper: pollingWrapper(),
    });

    await settle();
    expect(result.current.isSuccess).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(LIST_GETS(calls)).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

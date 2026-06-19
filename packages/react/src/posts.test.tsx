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
  useValidatePost,
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

// --- Publish outcome ergonomics ---------------------------------------------
//
// `POST /v1/posts` (publish:now) returns the created post with a rollup `status`
// + per-variant `status`/typed `error`. The hook must surface that outcome as
// first-class derived fields so a caller can never toast "published" on a post
// that actually failed. "Success" === `status === 'published'`. The promise
// always RESOLVES (a throw would discard the variants that DID publish).

const X_VARIANT = {
  id: 'pv_x',
  object: 'post_variant',
  connection_id: 'conn_x',
  platform: 'x',
  post_type: 'text',
  body: 'hi',
  status: 'failed',
  settings: {},
  schedule_at: null,
  result: null,
  error: {
    code: 'x_access_not_permitted',
    message: "Your X app isn't permitted to create this post.",
  },
  media: [],
};

const LI_VARIANT = {
  id: 'pv_li',
  object: 'post_variant',
  connection_id: 'conn_li',
  platform: 'linkedin',
  post_type: 'text',
  body: 'hi',
  status: 'published',
  settings: {},
  schedule_at: null,
  result: {
    platform_post_id: 'urn:li:1',
    permalink: 'https://linkedin.com/p/1',
    published_at: '2026-06-15T00:00:01Z',
  },
  error: null,
  media: [],
};

/** A create flow whose `POST /posts` returns a configurable post body. */
function mockCreateReturning(post: unknown) {
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
        return json({
          object: 'list',
          data: [CONN],
          total: 1,
          limit: 20,
          offset: 0,
          has_more: false,
        });
      }
      if (request.method === 'POST' && url.pathname.endsWith('/posts')) {
        return json(post, 201);
      }
      return json({}, 404);
    }),
  );
  return calls;
}

async function createAndSettle(post: unknown) {
  mockCreateReturning(post);
  const { result } = renderHook(() => useCreatePost('prof_1'), {
    wrapper: testWrapper(),
  });
  await waitFor(() => expect(result.current.connectedChannels).toContain('x'));
  let resolved: unknown;
  await act(async () => {
    resolved = await result.current.create({
      content: { body: 'hi' },
      channels: { x: { settings: {} } },
    });
  });
  // `mutateAsync` resolves with the value before the hook re-renders with
  // `mutation.data` populated; wait for the derived `status` to settle.
  await waitFor(() => expect(result.current.status).toBeDefined());
  return { result, resolved };
}

test('useCreatePost: a published post → no failed variants, isPublished true', async () => {
  const published = {
    ...POST,
    status: 'published',
    variants: [LI_VARIANT],
  };
  const { result, resolved } = await createAndSettle(published);

  expect(result.current.status).toBe('published');
  expect(result.current.failedVariants).toEqual([]);
  expect(result.current.isPublished).toBe(true);
  // create() still resolves the FULL post (callers can read everything).
  expect(resolved).toEqual(published);
});

test('useCreatePost: a failed post exposes status + the failed variant w/ its typed error', async () => {
  const failed = {
    ...POST,
    status: 'failed',
    variants: [X_VARIANT],
  };
  const { result } = await createAndSettle(failed);

  expect(result.current.status).toBe('failed');
  expect(result.current.isPublished).toBe(false);
  expect(result.current.failedVariants).toEqual([X_VARIANT]);
  expect(result.current.failedVariants[0]!.error).toEqual({
    code: 'x_access_not_permitted',
    message: "Your X app isn't permitted to create this post.",
  });
});

test('useCreatePost: a partially_published post → only the failed variants', async () => {
  const partial = {
    ...POST,
    status: 'partially_published',
    variants: [LI_VARIANT, X_VARIANT],
  };
  const { result } = await createAndSettle(partial);

  expect(result.current.status).toBe('partially_published');
  expect(result.current.isPublished).toBe(false);
  // Only the failed one — the published LinkedIn variant is NOT included.
  expect(result.current.failedVariants).toEqual([X_VARIANT]);
});

test('useCreatePost: before any create, outcome fields are empty/undefined (no throw)', async () => {
  mockCreateReturning({ ...POST, status: 'published', variants: [] });
  const { result } = renderHook(() => useCreatePost('prof_1'), {
    wrapper: testWrapper(),
  });
  await waitFor(() => expect(result.current.isReady).toBe(true));

  expect(result.current.status).toBeUndefined();
  expect(result.current.isPublished).toBe(false);
  expect(result.current.failedVariants).toEqual([]);
});

const VALIDATION = {
  object: 'validation',
  publishable: false,
  issues: [
    {
      code: 'media_count_invalid',
      message: 'X text post cannot carry media.',
      variant_index: 0,
      path: ['media'],
    },
  ],
};

/** A connect-then-validate flow: GET /connections, POST /posts/validate. */
function mockValidateFlow() {
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
      if (request.method === 'POST' && url.pathname.endsWith('/posts/validate')) {
        return json(VALIDATION, 200);
      }
      return json({}, 404);
    }),
  );
  return calls;
}

test('useValidatePost builds the body, calls /posts/validate, and returns the verdict', async () => {
  const calls = mockValidateFlow();
  const { result } = renderHook(() => useValidatePost('prof_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.connectedChannels).toContain('x'));

  let verdict: Awaited<ReturnType<typeof result.current.validate>> | undefined;
  await act(async () => {
    verdict = await result.current.validate({
      content: { body: 'hi' },
      channels: { x: { settings: {} } },
    });
  });

  const sent = calls.find(
    (c) =>
      c.method === 'POST' &&
      new URL(c.url).pathname.endsWith('/posts/validate'),
  )!;
  const body = await sent.json();
  expect(body.profile_id).toBe('prof_1');
  expect(body.variants[0].connection_id).toBe('conn_x');
  expect(body.variants[0].body).toBe('hi');

  // The endpoint verdict flows straight back (it's a READ — no transformation).
  expect(verdict).toEqual(VALIDATION);
  await waitFor(() => expect(result.current.publishable).toBe(false));
  expect(result.current.issues).toEqual(VALIDATION.issues);
});

test('useValidatePost is a READ — read-only return shape, no mutation handle', async () => {
  mockValidateFlow();
  const { result } = renderHook(() => useValidatePost('prof_1'), {
    wrapper: testWrapper(),
  });
  await waitFor(() => expect(result.current.isReady).toBe(true));

  // A read hook exposes no create/reset/data mutation surface.
  expect('create' in result.current).toBe(false);
  expect('reset' in result.current).toBe(false);

  await act(async () => {
    await result.current.validate({ channels: { x: { settings: {} } } });
  });
  await waitFor(() => expect(result.current.publishable).toBe(false));
});

test('useValidatePost surfaces a typed error instead of swallowing it', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname.endsWith('/connections')) {
        return new Response(
          JSON.stringify({
            object: 'list',
            data: [
              {
                id: 'conn_x',
                profile_id: 'prof_1',
                platform: 'x',
                external_account_id: 'a',
                external_account_name: 'X',
                currency: null,
                created_at: null,
                updated_at: null,
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
            has_more: false,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ code: 'internal_error', title: 'Boom', status: 500 }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }),
  );

  const { result } = renderHook(() => useValidatePost('prof_1'), {
    wrapper: testWrapper(),
  });
  await waitFor(() => expect(result.current.isReady).toBe(true));

  await act(async () => {
    await expect(
      result.current.validate({ channels: { x: { settings: {} } } }),
    ).rejects.toBeInstanceOf(PostrunError);
  });
  await waitFor(() => expect(result.current.error).toBeInstanceOf(PostrunError));
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

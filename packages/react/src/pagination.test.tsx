import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostrunError } from '@postrun/js';

import { useMediaInfinite } from './media';
import { usePostsInfinite } from './posts';
import { useProfilesInfinite } from './profiles';
import { testWrapper } from './test-utils';

afterEach(() => vi.unstubAllGlobals());

/** A list-envelope page, shaped like every Postrun list endpoint returns. */
function page(offset: number, limit: number, ids: readonly string[], total: number) {
  const data = ids.slice(offset, offset + limit).map((id) => ({ id }));
  return {
    object: 'list',
    data,
    total,
    limit,
    offset,
    has_more: offset + data.length < total,
  };
}

/** Stub fetch, returning the envelope page selected by the request's `offset`. */
function pagedFetch(ids: readonly string[]) {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const params = new URL(request.url).searchParams;
      const offset = Number(params.get('offset') ?? '0');
      const limit = Number(params.get('limit') ?? '20');
      return new Response(JSON.stringify(page(offset, limit, ids, ids.length)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

/** Read a recorded request's URL without a non-null assertion. */
function urlOf(calls: readonly Request[], index: number) {
  const request = calls[index];
  if (request === undefined) {
    throw new Error(`no request at index ${index}`);
  }
  return new URL(request.url);
}

describe('usePostsInfinite', () => {
  it('loads the first page and reports total + hasMore', async () => {
    pagedFetch(['p1', 'p2', 'p3']);
    const { result } = renderHook(
      () => usePostsInfinite(undefined, { pageSize: 1 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1']);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends pages on loadMore, page by page, until exhausted', async () => {
    const calls = pagedFetch(['p1', 'p2', 'p3']);
    const { result } = renderHook(
      () => usePostsInfinite(undefined, { pageSize: 1 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(result.current.hasMore).toBe(false);

    // Each page used the envelope-derived next offset (0 → 1 → 2).
    const offsets = calls.map(
      (_, i) => urlOf(calls, i).searchParams.get('offset'),
    );
    expect(offsets).toEqual(['0', '1', '2']);
  });

  it('loadMore is a no-op once hasMore is false', async () => {
    const calls = pagedFetch(['only']);
    const { result } = renderHook(() => usePostsInfinite(), {
      wrapper: testWrapper(),
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    act(() => result.current.loadMore());
    await Promise.resolve();
    expect(calls).toHaveLength(1);
  });

  it('forwards filters and page size to the request', async () => {
    const calls = pagedFetch(['p1']);
    renderHook(
      () => usePostsInfinite({ profile_id: 'prof_1', status: ['scheduled'] }, { pageSize: 5 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(calls).toHaveLength(1));
    const url = urlOf(calls, 0);
    expect(url.searchParams.get('profile_id')).toBe('prof_1');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('status')).toBe('scheduled');
  });

  it('surfaces a typed PostrunError on a failed page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              type: 'https://docs.postrun.ai/errors/internal_error',
              title: 'Something went wrong',
              status: 500,
              code: 'internal_error',
            }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );

    const { result } = renderHook(() => usePostsInfinite(), {
      wrapper: testWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toBeInstanceOf(PostrunError);
  });
});

describe('useProfilesInfinite', () => {
  it('loads the first page of profiles', async () => {
    pagedFetch(['prof_1', 'prof_2']);
    const { result } = renderHook(
      () => useProfilesInfinite(undefined, { pageSize: 1 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items.map((p) => p.id)).toEqual(['prof_1']);
    expect(result.current.hasMore).toBe(true);
  });
});

describe('useMediaInfinite', () => {
  it('loads the first page and reports total + hasMore', async () => {
    pagedFetch(['med_1', 'med_2', 'med_3']);
    const { result } = renderHook(
      () => useMediaInfinite(undefined, { pageSize: 1 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((m) => m.id)).toEqual(['med_1']);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends pages on loadMore until exhausted', async () => {
    pagedFetch(['med_1', 'med_2']);
    const { result } = renderHook(
      () => useMediaInfinite(undefined, { pageSize: 1 }),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((m) => m.id)).toEqual(['med_1', 'med_2']);
    expect(result.current.hasMore).toBe(false);
  });

  it('forwards filters (incl. metadata) and page size to the request', async () => {
    const calls = pagedFetch(['med_1']);
    renderHook(
      () =>
        useMediaInfinite(
          { profile_id: 'prof_1', kind: 'image', metadata: { plan: 'pro' } },
          { pageSize: 5 },
        ),
      { wrapper: testWrapper() },
    );

    await waitFor(() => expect(calls).toHaveLength(1));
    const url = urlOf(calls, 0);
    expect(url.searchParams.get('profile_id')).toBe('prof_1');
    expect(url.searchParams.get('kind')).toBe('image');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(JSON.parse(url.searchParams.get('metadata') ?? 'null')).toEqual({
      plan: 'pro',
    });
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { PostrunError } from '@postrun/js';

import {
  useDeleteMedia,
  useMedia,
  useMediaList,
  useMediaUpload,
  useUpdateMedia,
} from './media';
import { recordFetch, testWrapper } from './test-utils';

// Mock the upload seam so tests never touch real axios/XHR.
vi.mock('./upload-bytes', () => ({
  uploadBytes: vi.fn(async (_target, _file, opts) => opts?.onProgress?.(1)),
  UploadError: class UploadError extends Error {
    status = 0;
  },
}));

const MEDIA = {
  id: 'med_1',
  object: 'media',
  profile_id: 'prof_1',
  kind: 'video',
  status: 'ready',
  raw: false,
  error: null,
  source: { format: 'video/mp4', bytes: 1000, width: 1080, height: 1920, duration_ms: 5000 },
  alt_text: null,
  per_platform: {
    instagram: { status: 'ready', url: 'https://cdn/ig.mp4', width: 1080, height: 1920, bytes: 900, warnings: [], errors: [] },
  },
  external_id: null,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const UPLOAD_TARGET = {
  url: 'https://r2.example/upload',
  method: 'PUT',
  headers: { 'content-type': 'video/mp4' },
  expires_at: '2026-01-01T00:10:00Z',
};

const MEDIA_LIST = {
  object: 'list',
  data: [MEDIA],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
};

/** Route fetch for the media flow; record requests for assertions. */
function mockMedia(getStatuses: string[] = ['ready']) {
  const calls: Request[] = [];
  let getIndex = 0;
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

      if (request.method === 'POST' && url.pathname.endsWith('/media')) {
        return json({ ...MEDIA, status: 'uploading', upload: UPLOAD_TARGET }, 201);
      }
      if (request.method === 'GET' && url.pathname.endsWith('/media')) {
        return json(MEDIA_LIST);
      }
      if (request.method === 'GET' && url.pathname.includes('/media/')) {
        const status = getStatuses[Math.min(getIndex++, getStatuses.length - 1)];
        return json({ ...MEDIA, status });
      }
      if (request.method === 'PATCH') return json(MEDIA);
      if (request.method === 'DELETE')
        return json({ id: 'med_1', object: 'media', deleted: true });
      return json({}, 404);
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

function videoFile() {
  return new File(['bytes'], 'reel.mp4', { type: 'video/mp4' });
}

test('useMediaUpload infers kind, uploads, polls to ready, and surfaces per_platform', async () => {
  const calls = mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });

  let media: { per_platform: Record<string, { status: string }> } | undefined;
  await act(async () => {
    media = await result.current.upload(videoFile(), {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  const post = calls.find((c) => c.method === 'POST')!;
  expect(await post.json()).toMatchObject({
    profile_id: 'prof_1',
    kind: 'video',
    content_type: 'video/mp4',
    targets: ['instagram'],
  });
  expect(result.current.status).toBe('ready');
  expect(result.current.progress).toBe(1);
  expect(media!.per_platform.instagram!.status).toBe('ready');
});

test('useMediaUpload keeps polling while the asset is still processing', async () => {
  mockMedia(['processing', 'processing', 'ready']);
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });

  await act(async () => {
    await result.current.upload(videoFile(), { profileId: 'prof_1', targets: ['instagram'] });
  });

  expect(result.current.status).toBe('ready');
});

test('useUpdateMedia extends targets via PATCH', async () => {
  const calls = mockMedia();
  const { result } = renderHook(() => useUpdateMedia(), { wrapper: testWrapper() });

  await act(async () => {
    await result.current.mutateAsync({ id: 'med_1', targets: ['x', 'linkedin'] });
  });

  const patch = calls.find((c) => c.method === 'PATCH')!;
  expect(new URL(patch.url).pathname).toMatch(/\/media\/med_1$/);
  expect(await patch.json()).toEqual({ targets: ['x', 'linkedin'] });
});

test('useDeleteMedia deletes by id', async () => {
  const calls = mockMedia();
  const { result } = renderHook(() => useDeleteMedia(), { wrapper: testWrapper() });

  await act(async () => {
    await result.current.mutateAsync('med_1');
  });

  const del = calls.find((c) => c.method === 'DELETE')!;
  expect(new URL(del.url).pathname).toMatch(/\/media\/med_1$/);
});

test('useMedia retrieves an asset by id', async () => {
  mockMedia();
  const { result } = renderHook(() => useMedia('med_1'), { wrapper: testWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.id).toBe('med_1');
});

test('useMediaUpload throws a clear error when content_type cannot be resolved', async () => {
  mockMedia();
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });
  const typeless = new File(['bytes'], 'blob'); // no MIME type

  await act(async () => {
    await expect(
      result.current.upload(typeless, { profileId: 'prof_1', kind: 'image' }),
    ).rejects.toThrow(/content type/i);
  });
});

test('useMediaUpload accepts an explicit contentType override', async () => {
  const calls = mockMedia();
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });
  const typeless = new File(['bytes'], 'doc');

  await act(async () => {
    await result.current.upload(typeless, {
      profileId: 'prof_1',
      contentType: 'application/pdf',
    });
  });

  const post = calls.find((c) => c.method === 'POST')!;
  expect(await post.json()).toMatchObject({
    content_type: 'application/pdf',
    kind: 'document',
  });
});

test('useMediaList returns the typed page once loaded', async () => {
  recordFetch(MEDIA_LIST);
  const { result } = renderHook(() => useMediaList(), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(MEDIA_LIST);
});

test('useMediaList forwards every filter, encoding metadata as one JSON param', async () => {
  const calls = recordFetch(MEDIA_LIST);
  renderHook(
    () =>
      useMediaList({
        profile_id: 'prof_1',
        status: 'ready',
        kind: 'video',
        external_id: 'ext-9',
        metadata: { campaign: 'summer', priority: 3 },
        limit: 5,
      }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(calls).toHaveLength(1));
  const url = new URL(calls[0]!.url);
  expect(url.pathname).toMatch(/\/media$/);
  expect(url.searchParams.get('profile_id')).toBe('prof_1');
  expect(url.searchParams.get('status')).toBe('ready');
  expect(url.searchParams.get('kind')).toBe('video');
  expect(url.searchParams.get('external_id')).toBe('ext-9');
  expect(url.searchParams.get('limit')).toBe('5');
  // The scalar metadata map rides as one URL-encoded JSON object, types intact.
  expect(JSON.parse(url.searchParams.get('metadata')!)).toEqual({
    campaign: 'summer',
    priority: 3,
  });
});

test('useMediaList surfaces a typed PostrunError instead of throwing', async () => {
  recordFetch(
    {
      type: 'https://docs.postrun.ai/errors/validation_failed',
      title: 'Bad request',
      status: 400,
      code: 'validation_failed',
    },
    400,
  );
  const { result } = renderHook(() => useMediaList({ status: 'ready' }), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(PostrunError);
});

test('a delete invalidates the cached list so it refetches', async () => {
  const calls = mockMedia();
  const listGets = () =>
    calls.filter(
      (c) => c.method === 'GET' && /\/media$/.test(new URL(c.url).pathname),
    ).length;

  const { result } = renderHook(
    () => ({ list: useMediaList(), remove: useDeleteMedia() }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
  const before = listGets();

  await act(async () => {
    await result.current.remove.mutateAsync('med_1');
  });

  await waitFor(() => expect(listGets()).toBeGreaterThan(before));
});

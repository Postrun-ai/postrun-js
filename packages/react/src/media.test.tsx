import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { PostrunError, createPostrunClient } from '@postrun/js';

import {
  MEDIA_POLL_TIMEOUT_MS,
  pollUntilSettled,
  useDeleteMedia,
  useMedia,
  useMediaList,
  useMediaUpload,
  useUpdateMedia,
} from './media';
import { recordFetch, testWrapper } from './test-utils';
import { uploadBytes } from './upload-bytes';

// Mock the upload seam so tests never touch real axios/XHR.
vi.mock('./upload-bytes', () => ({
  uploadBytes: vi.fn(async (_target, _file, opts) => opts?.onProgress?.(1)),
  UploadError: class UploadError extends Error {
    status = 0;
  },
}));

const mockedUpload = vi.mocked(uploadBytes);

/** The default upload behaviour: report 100% and resolve. */
const defaultUpload = async (
  _target: unknown,
  _file: unknown,
  opts?: { onProgress?: (fraction: number) => void },
) => opts?.onProgress?.(1);

/** Map a status to the `progress` the API would report alongside it. */
function progressFor(status: string) {
  if (status === 'ready' || status === 'failed') {
    return { stage: 'done', percent: 100 };
  }
  if (status === 'processing') return { stage: 'transcoding', percent: 65 };
  return { stage: 'queued', percent: 0 };
}

const MEDIA = {
  id: 'med_1',
  object: 'media',
  profile_id: 'prof_1',
  kind: 'video',
  status: 'ready',
  progress: { stage: 'done', percent: 100 },
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
        const status = getStatuses[Math.min(getIndex++, getStatuses.length - 1)]!;
        return json({ ...MEDIA, status, progress: progressFor(status) });
      }
      if (request.method === 'PATCH') return json(MEDIA);
      if (request.method === 'DELETE')
        return json({ id: 'med_1', object: 'media', deleted: true });
      return json({}, 404);
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  mockedUpload.mockImplementation(defaultUpload);
});

function videoFile() {
  return new File(['bytes'], 'reel.mp4', { type: 'video/mp4' });
}

test('useMediaUpload (single file) uploads, polls to ready, surfaces per_platform, and resolves the awaited asset — sending NO kind/content_type so the API auto-detects', async () => {
  const calls = mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });

  let assets: Array<{ per_platform: Record<string, { status: string }> }> = [];
  await act(async () => {
    // Single-file usage: pass ONE File, await the batch, destructure the asset.
    assets = await result.current.add(videoFile(), {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  const post = calls.find((c) => c.method === 'POST')!;
  const body = (await post.json()) as Record<string, unknown>;
  // The API sniffs kind/content_type from the bytes — the hook forwards NEITHER.
  expect(body).toMatchObject({ profile_id: 'prof_1', targets: ['instagram'] });
  expect('kind' in body).toBe(false);
  expect('content_type' in body).toBe(false);
  expect(result.current.items).toHaveLength(1);
  expect(result.current.items[0]?.status).toBe('ready');
  expect(result.current.items[0]?.progress).toBe(1);
  expect(result.current.ready).toHaveLength(1);
  expect(assets).toHaveLength(1);
  const [asset] = assets;
  expect(asset!.per_platform.instagram!.status).toBe('ready');
});

test('useMediaUpload keeps polling while the asset is still processing', async () => {
  mockMedia(['processing', 'processing', 'ready']);
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });

  await act(async () => {
    await result.current.add(videoFile(), { profileId: 'prof_1', targets: ['instagram'] });
  });

  expect(result.current.items[0]?.status).toBe('ready');
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

test('useMediaUpload uploads a file with no MIME type fine — the API detects kind/content_type', async () => {
  const calls = mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });
  const typeless = new File(['bytes'], 'blob'); // no MIME type

  let assets: unknown[] = ['unset'];
  await act(async () => {
    assets = await result.current.add(typeless, { profileId: 'prof_1' });
  });

  // No client-side throw, no fabricated metadata — the POST omits both fields.
  const post = calls.find((c) => c.method === 'POST')!;
  const body = (await post.json()) as Record<string, unknown>;
  expect('kind' in body).toBe(false);
  expect('content_type' in body).toBe(false);
  expect(assets).toHaveLength(1);
  expect(result.current.items[0]?.status).toBe('ready');
});

test('useMediaUpload forwards explicit kind/contentType overrides', async () => {
  const calls = mockMedia();
  const { result } = renderHook(() => useMediaUpload(), { wrapper: testWrapper() });
  const typeless = new File(['bytes'], 'doc');

  await act(async () => {
    await result.current.add(typeless, {
      profileId: 'prof_1',
      kind: 'document',
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

test('useMediaUpload uploads many files, settling each into `ready`', async () => {
  mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    result.current.add([videoFile(), videoFile()], {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  await waitFor(() => expect(result.current.isUploading).toBe(false));
  expect(result.current.items).toHaveLength(2);
  expect(result.current.items.every((item) => item.status === 'ready')).toBe(
    true,
  );
  expect(result.current.ready).toHaveLength(2);
});

test('useMediaUpload add resolves to the settled assets for the batch, in order', async () => {
  mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), {
    wrapper: testWrapper(),
  });

  let assets: Array<{ id: string }> = [];
  await act(async () => {
    assets = await result.current.add([videoFile(), videoFile()], {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  expect(assets).toHaveLength(2);
  expect(assets.every((asset) => asset.id === 'med_1')).toBe(true);
});

test('useMediaUpload caps in-flight uploads at the concurrency limit', async () => {
  mockMedia(['ready']);

  // Hold every upload open so we can observe how many run at once.
  let active = 0;
  let maxActive = 0;
  const releases: Array<() => void> = [];
  mockedUpload.mockImplementation(async (_t, _f, opts) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => {
      releases.push(() => {
        active -= 1;
        opts?.onProgress?.(1);
        resolve();
      });
    });
  });

  const { result } = renderHook(() => useMediaUpload({ concurrency: 2 }), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    result.current.add([videoFile(), videoFile(), videoFile()], {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  // Only 2 of the 3 start — the gate holds the third back.
  await waitFor(() => expect(releases).toHaveLength(2));
  expect(maxActive).toBe(2);

  // Release the first; the queued third now gets its slot.
  await act(async () => {
    releases[0]!();
  });
  await waitFor(() => expect(releases).toHaveLength(3));
  expect(maxActive).toBe(2);

  // Drain the rest and let everything settle.
  await act(async () => {
    releases[1]!();
    releases[2]!();
  });
  await waitFor(() => expect(result.current.isUploading).toBe(false));
  expect(result.current.ready).toHaveLength(3);
});

test('useMediaUpload surfaces live progress.stage while processing', async () => {
  mockMedia(['processing', 'processing', 'ready']);
  const { result } = renderHook(() => useMediaUpload(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    result.current.add([videoFile()], {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  // While processing, the poll ticks surface the server's progress.
  await waitFor(
    () =>
      expect(result.current.items[0]?.media?.progress.stage).toBe(
        'transcoding',
      ),
    { timeout: 4000 },
  );
  expect(result.current.items[0]?.media?.progress.percent).toBe(65);

  await waitFor(() => expect(result.current.items[0]?.status).toBe('ready'), {
    timeout: 8000,
  });
  expect(result.current.items[0]?.media?.progress.stage).toBe('done');
}, 12000);

test('useMediaUpload remove drops an item and aborts it in flight', async () => {
  mockMedia(['ready']);

  const releases: Array<() => void> = [];
  mockedUpload.mockImplementation(
    async () =>
      new Promise<void>((resolve) => {
        releases.push(resolve);
      }),
  );

  const { result } = renderHook(() => useMediaUpload(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    result.current.add([videoFile(), videoFile()], {
      profileId: 'prof_1',
      targets: ['instagram'],
    });
  });

  await waitFor(() => expect(result.current.items).toHaveLength(2));
  const victim = result.current.items[0]!.id;

  await act(async () => {
    result.current.remove(victim);
  });

  expect(result.current.items).toHaveLength(1);
  expect(result.current.items.some((item) => item.id === victim)).toBe(false);

  await act(async () => {
    releases.forEach((release) => release());
  });
});

test('useMediaUpload reset clears every item', async () => {
  mockMedia(['ready']);
  const { result } = renderHook(() => useMediaUpload(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    result.current.add([videoFile()], { profileId: 'prof_1' });
  });
  await waitFor(() => expect(result.current.items).toHaveLength(1));

  await act(async () => {
    result.current.reset();
  });
  expect(result.current.items).toHaveLength(0);
  expect(result.current.isUploading).toBe(false);
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

// --- poll timeout (RCA: a 5-minute ceiling marked still-transcoding-but-
// eventually-ready videos as `failed`, dropping them from the post) -------------

test('MEDIA_POLL_TIMEOUT_MS is 30 minutes — long enough for a real video transcode', () => {
  expect(MEDIA_POLL_TIMEOUT_MS).toBe(30 * 60 * 1000);
});

test('pollUntilSettled keeps polling a long-transcoding video past the old 5-minute ceiling and settles `ready` (never fabricates `failed`)', async () => {
  vi.useFakeTimers();
  try {
    let polls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        polls += 1;
        // Stay 'processing' for ~6 minutes of polling (240 × 1.5s = 360s, well
        // past the old 300s timeout that used to mark it failed), then `ready`.
        const status = polls > 240 ? 'ready' : 'processing';
        return new Response(
          JSON.stringify({ ...MEDIA, status, progress: progressFor(status) }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );

    const client = createPostrunClient({
      getToken: () => 'tok',
      baseUrl: 'https://api.test',
    });
    const settled = pollUntilSettled(
      client,
      'med_1',
      new AbortController().signal,
    );

    // Drive ~6.5 min of fake time; the old 5-min timeout would have rejected here.
    await vi.advanceTimersByTimeAsync(6.5 * 60 * 1000);

    await expect(settled).resolves.toMatchObject({ status: 'ready' });
    expect(polls).toBeGreaterThan(200);
  } finally {
    vi.useRealTimers();
  }
});

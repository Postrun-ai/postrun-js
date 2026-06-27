import { afterEach, expect, test, vi } from 'vitest';

import { mediaGet } from './client/sdk.gen';
import type { Media } from './client/types.gen';
import { waitForMedia } from './media';

vi.mock('./client/sdk.gen', () => ({
  mediaGet: vi.fn(),
}));

const mockedGet = vi.mocked(mediaGet);

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** A full, contract-shaped `Media` with the given `status` (override as needed). */
function makeMedia(status: Media['status'], overrides: Partial<Media> = {}): Media {
  return {
    id: 'med_1',
    object: 'media',
    profile_id: 'prof_1',
    kind: 'video',
    content_type: 'video/mp4',
    status,
    progress: { stage: status === 'ready' ? 'done' : 'transcoding', percent: 50 },
    raw: false,
    error: null,
    source: { format: 'video/mp4', bytes: 1000, width: 1080, height: 1920, duration_ms: 5000 },
    alt_text: null,
    per_platform: {},
    external_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Resolve `mediaGet` with `media`, in the `{ data, request, response }` shape. */
function resolveGet(media: Media) {
  mockedGet.mockResolvedValue({
    data: media,
    request: new Request('https://api.test/v1/media/med_1'),
    response: new Response(),
  });
}

/** Have each successive `mediaGet` call resolve with the next status in `sequence`. */
function sequenceGet(sequence: Media['status'][]) {
  let call = 0;
  mockedGet.mockImplementation(() => {
    const status = sequence[Math.min(call, sequence.length - 1)] ?? 'processing';
    call += 1;
    return Promise.resolve({
      data: makeMedia(status),
      request: new Request('https://api.test/v1/media/med_1'),
      response: new Response(),
    });
  });
}

test('returns immediately when the asset is already ready on the first poll', async () => {
  resolveGet(makeMedia('ready'));

  const media = await waitForMedia('med_1');

  expect(media.status).toBe('ready');
  expect(mockedGet).toHaveBeenCalledTimes(1);
});

test('polls until status becomes ready, then resolves with the asset', async () => {
  vi.useFakeTimers();
  sequenceGet(['processing', 'processing', 'ready']);

  const promise = waitForMedia('med_1', { pollInterval: 10 });
  await vi.advanceTimersByTimeAsync(50);

  await expect(promise).resolves.toMatchObject({ status: 'ready' });
  expect(mockedGet).toHaveBeenCalledTimes(3);
});

test('resolves (does NOT throw) when status settles to failed — the caller inspects status', async () => {
  vi.useFakeTimers();
  sequenceGet(['processing', 'failed']);

  const promise = waitForMedia('med_1', { pollInterval: 10 });
  await vi.advanceTimersByTimeAsync(30);

  await expect(promise).resolves.toMatchObject({ status: 'failed' });
});

test('calls onPoll with each polled snapshot', async () => {
  vi.useFakeTimers();
  sequenceGet(['processing', 'processing', 'ready']);
  const onPoll = vi.fn();

  const promise = waitForMedia('med_1', { pollInterval: 10, onPoll });
  await vi.advanceTimersByTimeAsync(50);
  await promise;

  expect(onPoll).toHaveBeenCalledTimes(3);
  expect(onPoll.mock.calls.map(([m]) => (m as Media).status)).toEqual([
    'processing',
    'processing',
    'ready',
  ]);
});

test('rejects on timeout when the asset never settles', async () => {
  vi.useFakeTimers();
  resolveGet(makeMedia('processing'));

  const promise = waitForMedia('med_1', { pollInterval: 10, timeout: 40 });
  const expectation = expect(promise).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(60);
  await expectation;
});

test('rejects immediately with an AbortError when the signal is already aborted', async () => {
  resolveGet(makeMedia('processing'));
  const controller = new AbortController();
  controller.abort();

  await expect(
    waitForMedia('med_1', { signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(mockedGet).not.toHaveBeenCalled();
});

test('rejects with an AbortError when the signal aborts mid-wait', async () => {
  vi.useFakeTimers();
  resolveGet(makeMedia('processing'));
  const controller = new AbortController();

  const promise = waitForMedia('med_1', {
    pollInterval: 10,
    signal: controller.signal,
  });
  const expectation = expect(promise).rejects.toMatchObject({
    name: 'AbortError',
  });

  await vi.advanceTimersByTimeAsync(15);
  controller.abort();
  await vi.advanceTimersByTimeAsync(15);

  await expectation;
});

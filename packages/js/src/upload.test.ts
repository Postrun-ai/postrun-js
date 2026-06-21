import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { UploadError, uploadToTarget } from './upload';
import type { UploadTarget } from './resources';

const TARGET: UploadTarget = {
  url: 'https://r2.example/upload',
  method: 'PUT',
  headers: { 'content-type': 'video/mp4' },
  expires_at: '2026-01-01T00:10:00Z',
};

function file(): Blob {
  return new Blob(['bytes'], { type: 'video/mp4' });
}

/** A real AxiosError carrying an HTTP response status (so `isAxiosError` passes). */
function httpError(status: number): AxiosError {
  const config = new AxiosHeaders();
  const error = new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', {
    headers: config,
  });
  // Minimal response shape — only `.status` is read by the util.
  error.response = {
    status,
    statusText: '',
    data: undefined,
    headers: {},
    config: { headers: config },
  };
  return error;
}

/** A real AxiosError with no response (network failure → status 0). */
function networkError(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadToTarget', () => {
  test('PUTs to the target and reports progress + 100% on success', async () => {
    const spy = vi
      .spyOn(axios, 'request')
      .mockImplementation(async (config: AxiosRequestConfig) => {
        config.onUploadProgress?.({
          loaded: 50,
          total: 100,
          bytes: 50,
          lengthComputable: true,
        });
        return { data: undefined };
      });

    const progress: number[] = [];
    await uploadToTarget(file(), TARGET, { onProgress: (f) => progress.push(f) });

    expect(spy).toHaveBeenCalledTimes(1);
    const config = spy.mock.calls[0]![0];
    expect(config.method).toBe('PUT');
    expect(config.url).toBe(TARGET.url);
    expect(config.headers).toEqual(TARGET.headers);
    // Mid-flight fraction then the terminal 1.
    expect(progress).toEqual([0.5, 1]);
  });

  test('retries a 500 then succeeds (retriable: server error)', async () => {
    let attempts = 0;
    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      attempts += 1;
      if (attempts < 2) throw httpError(500);
      return { data: undefined };
    });

    await expect(uploadToTarget(file(), TARGET)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('retries a 429 (throttle) then succeeds', async () => {
    let attempts = 0;
    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      attempts += 1;
      if (attempts < 2) throw httpError(429);
      return { data: undefined };
    });

    await expect(uploadToTarget(file(), TARGET)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('retries a network error (status 0) then succeeds', async () => {
    let attempts = 0;
    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      attempts += 1;
      if (attempts < 2) throw networkError();
      return { data: undefined };
    });

    await expect(uploadToTarget(file(), TARGET)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('a 400 is terminal — no retry, surfaces UploadError with the status', async () => {
    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      throw httpError(400);
    });

    await expect(uploadToTarget(file(), TARGET)).rejects.toMatchObject({
      name: 'UploadError',
      status: 400,
    });
    // Tried exactly once — the 4xx is not retried.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('a 403 (expired signed URL) is terminal — no retry', async () => {
    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      throw httpError(403);
    });

    await expect(uploadToTarget(file(), TARGET)).rejects.toBeInstanceOf(
      UploadError,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('an aborted signal rejects without retrying', async () => {
    const controller = new AbortController();
    const abortError = new Error('canceled');
    abortError.name = 'CanceledError';

    const spy = vi.spyOn(axios, 'request').mockImplementation(async () => {
      // Simulate axios surfacing the abort once the signal fires.
      controller.abort();
      throw abortError;
    });

    // Aborting is terminal — p-retry stops on the fired signal and rejects; it
    // is NOT classified as a retriable failure, so the PUT runs exactly once.
    await expect(
      uploadToTarget(file(), TARGET, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalledTimes(2);
  });
});

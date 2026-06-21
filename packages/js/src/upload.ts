import axios, { isAxiosError } from 'axios';
import pRetry, { AbortError } from 'p-retry';

import type { UploadTarget } from './resources';

/** A failed direct-to-storage upload, carrying the HTTP status (0 = network). */
export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

export interface UploadToTargetOptions {
  /** Fraction uploaded, 0..1. Called as bytes flow and once with 1 on success. */
  onProgress?: (fraction: number) => void;
  /** Abort the in-flight upload (and stop retrying). */
  signal?: AbortSignal;
  /** Max retry attempts for retriable failures (network / 5xx / 429). Default 3. */
  retries?: number;
}

/**
 * A 4xx (other than 429) won't fix on retry — an expired signed URL surfaces as a
 * 403, a malformed request as a 400, etc. 429 (throttle) and 5xx ARE retriable,
 * as is a network error (status 0).
 */
function isTerminal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}

/**
 * PUT a file's bytes to a signed upload target, with progress, cancellation, and
 * retry — the single home for the direct-to-storage upload. axios drives the XHR
 * (the Fetch API can't report upload progress in browsers); `p-retry` composes the
 * backoff so the loop is never hand-rolled. Network errors, 5xx, and 429 are
 * retried; any other 4xx (e.g. an expired URL) is terminal; an aborted signal
 * stops immediately. Throws `UploadError` (with the HTTP status) on a hard
 * failure, or re-throws the original abort error on cancellation.
 */
export async function uploadToTarget(
  file: Blob,
  target: UploadTarget,
  opts: UploadToTargetOptions = {},
): Promise<void> {
  const { onProgress, signal } = opts;

  async function putOnce(): Promise<void> {
    try {
      await axios.request({
        method: target.method,
        url: target.url,
        data: file,
        headers: target.headers,
        signal,
        onUploadProgress: (event) => {
          if (event.total) {
            onProgress?.(event.loaded / event.total);
          }
        },
      });
      onProgress?.(1);
    } catch (error) {
      // A cancellation propagates as-is so p-retry treats it as an abort.
      if (signal?.aborted) {
        throw error;
      }
      if (isAxiosError(error)) {
        const status = error.response?.status ?? 0;
        throw new UploadError(
          status,
          status
            ? `Upload failed (HTTP ${status}).`
            : 'Upload failed: network error.',
        );
      }
      throw error;
    }
  }

  await pRetry(
    async () => {
      try {
        await putOnce();
      } catch (error) {
        if (error instanceof UploadError && isTerminal(error.status)) {
          throw new AbortError(error);
        }
        throw error;
      }
    },
    { retries: opts.retries ?? 3, signal },
  );
}

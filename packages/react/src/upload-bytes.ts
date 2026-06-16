import axios, { isAxiosError } from 'axios';

import type { UploadTarget } from '@postrun/js';

/** A failed direct-to-storage upload, carrying the HTTP status (0 = network). */
export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

export interface UploadBytesOptions {
  /** Fraction uploaded, 0..1. Called as bytes flow and once with 1 on success. */
  onProgress?: (fraction: number) => void;
  /** Abort the in-flight upload. */
  signal?: AbortSignal;
}

/**
 * PUT a file's bytes to a signed upload target, with progress and cancellation.
 * axios drives the XHR (the Fetch API can't report upload progress in browsers);
 * retry/poll are composed on top via p-retry/p-wait-for.
 */
export async function uploadBytes(
  target: UploadTarget,
  file: Blob,
  options: UploadBytesOptions = {},
): Promise<void> {
  const { onProgress, signal } = options;

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
    // A cancellation propagates as-is so callers (and p-retry) treat it as abort.
    if (signal?.aborted) {
      throw error;
    }
    if (isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      throw new UploadError(
        status,
        status ? `Upload failed (HTTP ${status}).` : 'Upload failed: network error.',
      );
    }
    throw error;
  }
}

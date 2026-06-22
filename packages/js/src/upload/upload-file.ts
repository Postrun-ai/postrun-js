import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';

import type { PostrunClient } from '../client';
import {
  mediaAbort,
  mediaComplete,
  mediaListParts,
  mediaSignPart,
} from '../client/sdk.gen';
import type { MediaCreateResponse } from '../client/types.gen';
import { listedPartsToS3, s3PartsToComplete } from './casing';
import { UploadError } from './upload-error';

/**
 * The multipart session the create response carries on its `upload` field — the
 * cached `{ upload_id, key, part_size, expires_at }` Uppy's `createMultipartUpload`
 * returns without a second HTTP call. Derived from the contract, never declared.
 */
export type MultipartSession = NonNullable<MediaCreateResponse['upload']>;

export interface UploadFileOptions {
  /** The media id the create call returned — binds the multipart sub-endpoints. */
  mediaId: string;
  /** The cached `upload` session from the create response (`upload_id`/`key`/…). */
  session: MultipartSession;
  /** The typed client the sub-endpoint calls go through (auth + base URL). */
  client: PostrunClient;
  /** Fraction uploaded, 0..1, as bytes flow; called once with 1 on success. */
  onProgress?: (fraction: number) => void;
  /** Abort the in-flight upload (cancels Uppy and aborts the R2 session). */
  signal?: AbortSignal;
}

/**
 * Upload ONE file's bytes to R2 with a resilient, resumable multipart upload,
 * driving `@uppy/aws-s3` headless (no DOM). Uppy owns the bug-prone mechanics —
 * fixed-size chunking, parallel parts, per-part retry, resume via `listParts`,
 * and progress — wired to OUR signing endpoints (`createMultipartUpload` returns
 * the cached create-response session, so there's no extra round-trip to start).
 *
 * Resolves when the upload is fully assembled on R2 (the object then settles
 * through the same probe/transform pipeline a `source_url` import does). Throws
 * {@link UploadError} on a hard failure, or a `DOMException('AbortError')` when
 * `signal` fires.
 */
export async function uploadFile(
  file: Blob,
  options: UploadFileOptions,
): Promise<void> {
  const { mediaId, session, client, onProgress, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Upload aborted', 'AbortError');
  }

  const uppy = new Uppy({ autoProceed: false }).use(AwsS3, {
    // Every file is one resumable multipart upload — no size-threshold split, so
    // the path is uniform and a tiny file is just a 1-part upload (PLAN §2). The
    // literal `true` (not a `() => true`) selects Uppy's always-multipart variant.
    shouldUseMultipart: true,
    // Pin Uppy's chunk size to the server's part size — every part except the
    // last MUST be exactly this (an R2 requirement the session encodes).
    getChunkSize: () => session.part_size,

    // Start: hand back the cached session from the create response — NO HTTP.
    createMultipartUpload: () => ({
      uploadId: session.upload_id,
      key: session.key,
    }),

    // Sign one part → POST /media/{id}/multipart/sign. The sub-endpoint reads the
    // upload id from the asset row, so the body carries only the part number.
    signPart: async (_file, { partNumber }) => {
      const { data } = await mediaSignPart({
        client,
        path: { id: mediaId },
        body: { part_number: partNumber },
      });
      return { url: data.url };
    },

    // Resume: GET /media/{id}/multipart/parts → map snake_case → S3 PascalCase so
    // Uppy skips the parts R2 already holds after a dropped connection.
    listParts: async () => {
      const { data } = await mediaListParts({
        client,
        path: { id: mediaId },
      });
      return listedPartsToS3(data.parts);
    },

    // Finish: map Uppy's S3 parts → snake_case → POST /media/{id}/multipart/complete.
    completeMultipartUpload: async (_file, { parts }) => {
      await mediaComplete({
        client,
        path: { id: mediaId },
        body: { parts: s3PartsToComplete(parts) },
      });
      return {};
    },

    // Cancel: POST /media/{id}/multipart/abort (idempotent server-side).
    abortMultipartUpload: async () => {
      await mediaAbort({ client, path: { id: mediaId } });
    },
  });

  // Uppy's `progress` event is the overall 0–100 across all parts of the queue
  // (one file here) — forward it as a 0..1 fraction.
  uppy.on('progress', (percent) => onProgress?.(percent / 100));

  const onAbort = () => {
    uppy.cancelAll();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    uppy.addFile({ name: fileName(file), type: file.type, data: file });
    const result = await uppy.upload();

    if (signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    const failed = result?.failed ?? [];
    if (failed.length > 0) {
      throw new UploadError('Multipart upload failed.', {
        cause: failed[0]?.error,
      });
    }

    onProgress?.(1);
  } finally {
    signal?.removeEventListener('abort', onAbort);
    uppy.destroy();
  }
}

/** Uppy needs a file name; a bare `Blob` has none, so fall back to a stable one. */
function fileName(file: Blob): string {
  return file instanceof File ? file.name : 'upload';
}

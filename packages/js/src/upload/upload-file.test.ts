import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { AwsS3Part } from '@uppy/aws-s3';

import { createPostrunClient } from '../client';
import type { PostrunClient } from '../client';
import type { MultipartSession } from './upload-file';

/**
 * We unit-test OUR signing-fn wiring (the request shapes + the listParts S3
 * mapping), not Uppy's upload engine. So `@uppy/core` is mocked to a constructor
 * that CAPTURES the `AwsS3` options object — we then invoke each custom signer
 * directly against a real `PostrunClient` whose `fetch` is stubbed per-endpoint.
 * This keeps the test free of Uppy's runtime while exercising every endpoint call.
 */

type AwsS3Options = {
  shouldUseMultipart: true;
  getChunkSize: () => number;
  createMultipartUpload: () => { uploadId: string; key: string };
  signPart: (
    file: unknown,
    opts: { partNumber: number },
  ) => Promise<{ url: string }>;
  listParts: (file: unknown, opts: unknown) => Promise<AwsS3Part[]>;
  completeMultipartUpload: (
    file: unknown,
    opts: { parts: AwsS3Part[] },
  ) => Promise<unknown>;
  abortMultipartUpload: (file: unknown, opts: unknown) => Promise<void>;
};

let captured: AwsS3Options | undefined;
// When set, the fake Uppy's `upload()` reports this file as failed.
let failWith: Error | undefined;
// Event handlers the SUT registers (so a test can drive `progress`).
let handlers: Record<string, (arg: number) => void>;
// Set true when the SUT cancels the upload (the abort path).
let cancelled: boolean;
// Test hook fired INSIDE `upload()` — e.g. to abort mid-flight.
let onUploadStart: (() => void) | undefined;

vi.mock('@uppy/core', () => {
  class FakeUppy {
    use(_plugin: unknown, options: AwsS3Options) {
      captured = options;
      return this;
    }
    on(event: string, handler: (arg: number) => void) {
      handlers[event] = handler;
      return this;
    }
    addFile() {
      return 'file-id';
    }
    async upload() {
      onUploadStart?.();
      handlers.progress?.(50); // emit a mid-upload progress tick (0–100)
      return failWith
        ? { successful: [], failed: [{ error: failWith }] }
        : { successful: [], failed: [] };
    }
    cancelAll() {
      cancelled = true;
    }
    destroy() {}
  }
  return { default: FakeUppy };
});

vi.mock('@uppy/aws-s3', () => ({ default: class FakeAwsS3 {} }));

// Imported AFTER the mocks so the fake Uppy is wired in.
const { uploadFile } = await import('./upload-file');

const SESSION: MultipartSession = {
  upload_id: 'upl_123',
  key: 'media/med_1/source',
  part_size: 8_388_608,
  expires_at: '2026-06-21T12:10:00Z',
};

let requests: Request[];

function client(): PostrunClient {
  return createPostrunClient({
    getToken: () => 'tok',
    baseUrl: 'https://api.test/v1',
  });
}

function stubFetch(): void {
  requests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      requests.push(request);
      const url = new URL(request.url);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      if (url.pathname.endsWith('/multipart/sign')) {
        return json({ url: 'https://r2.test/signed-part?partNumber=1' });
      }
      if (url.pathname.endsWith('/multipart/parts')) {
        return json({
          parts: [
            { part_number: 1, etag: '"aaa"', size: 8_388_608 },
            { part_number: 2, etag: '"bbb"', size: 4_096 },
          ],
        });
      }
      // complete + abort both return the media resource.
      return json({ id: 'med_1', object: 'media', status: 'processing' });
    }),
  );
}

beforeEach(() => {
  captured = undefined;
  failWith = undefined;
  handlers = {};
  cancelled = false;
  onUploadStart = undefined;
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function driveSigners(): Promise<AwsS3Options> {
  // Run uploadFile to register the AwsS3 options; the fake upload resolves empty.
  await uploadFile(new File(['x'], 'reel.mp4', { type: 'video/mp4' }), {
    mediaId: 'med_1',
    session: SESSION,
    client: client(),
  });
  if (!captured) throw new Error('AwsS3 options were not captured.');
  return captured;
}

test('getChunkSize is the server part_size and shouldUseMultipart is always true', async () => {
  const opts = await driveSigners();
  expect(opts.getChunkSize()).toBe(SESSION.part_size);
  expect(opts.shouldUseMultipart).toBe(true);
});

test('createMultipartUpload returns the cached session with NO HTTP call', async () => {
  const opts = await driveSigners();
  const before = requests.length;
  expect(opts.createMultipartUpload()).toEqual({
    uploadId: SESSION.upload_id,
    key: SESSION.key,
  });
  expect(requests.length).toBe(before); // no network round-trip
});

test('signPart POSTs the snake_case { part_number } body to /multipart/sign', async () => {
  const opts = await driveSigners();
  const result = await opts.signPart({}, { partNumber: 1 });

  expect(result).toEqual({ url: 'https://r2.test/signed-part?partNumber=1' });
  const req = requests.find((r) => r.url.endsWith('/multipart/sign'))!;
  expect(req.method).toBe('POST');
  expect(new URL(req.url).pathname).toBe('/v1/media/med_1/multipart/sign');
  expect(await req.json()).toEqual({ part_number: 1 });
});

test('listParts GETs /multipart/parts and maps snake_case → S3 PascalCase', async () => {
  const opts = await driveSigners();
  const parts = await opts.listParts({}, {});

  const req = requests.find((r) => r.url.endsWith('/multipart/parts'))!;
  expect(req.method).toBe('GET');
  expect(parts).toEqual([
    { PartNumber: 1, ETag: '"aaa"', Size: 8_388_608 },
    { PartNumber: 2, ETag: '"bbb"', Size: 4_096 },
  ]);
});

test('completeMultipartUpload maps S3 parts → snake_case body to /multipart/complete', async () => {
  const opts = await driveSigners();
  await opts.completeMultipartUpload(
    {},
    {
      parts: [
        { PartNumber: 1, ETag: '"aaa"', Size: 8_388_608 },
        { PartNumber: 2, ETag: '"bbb"', Size: 4_096 },
      ],
    },
  );

  const req = requests.find((r) => r.url.endsWith('/multipart/complete'))!;
  expect(req.method).toBe('POST');
  expect(await req.json()).toEqual({
    parts: [
      { part_number: 1, etag: '"aaa"' },
      { part_number: 2, etag: '"bbb"' },
    ],
  });
});

test('abortMultipartUpload POSTs /multipart/abort for the bound media id', async () => {
  const opts = await driveSigners();
  await opts.abortMultipartUpload({}, {});

  const req = requests.find((r) => r.url.endsWith('/multipart/abort'))!;
  expect(req.method).toBe('POST');
  expect(new URL(req.url).pathname).toBe('/v1/media/med_1/multipart/abort');
});

test('uploadFile rejects immediately if the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    uploadFile(new File(['x'], 'a.mp4'), {
      mediaId: 'med_1',
      session: SESSION,
      client: client(),
      signal: controller.signal,
    }),
  ).rejects.toThrow(/aborted/i);
});

test('forwards Uppy progress as a 0..1 fraction, and 1 on success', async () => {
  const onProgress = vi.fn();
  await uploadFile(new File(['x'], 'a.mp4', { type: 'video/mp4' }), {
    mediaId: 'med_1',
    session: SESSION,
    client: client(),
    onProgress,
  });
  expect(onProgress).toHaveBeenCalledWith(0.5); // the 50/100 tick
  expect(onProgress).toHaveBeenCalledWith(1); // settled
});

test('a mid-flight abort cancels the Uppy upload and rejects with AbortError', async () => {
  const controller = new AbortController();
  onUploadStart = () => controller.abort(); // abort fires while the upload runs
  const onProgress = vi.fn();

  await expect(
    uploadFile(new File(['x'], 'a.mp4', { type: 'video/mp4' }), {
      mediaId: 'med_1',
      session: SESSION,
      client: client(),
      signal: controller.signal,
      onProgress,
    }),
  ).rejects.toThrow(/abort/i);

  expect(cancelled).toBe(true); // the signal listener called uppy.cancelAll()
  expect(onProgress).not.toHaveBeenCalledWith(1); // never reports success on abort
});

test('uploadFile throws UploadError when a part fails', async () => {
  failWith = new Error('part 2 died');
  await expect(
    uploadFile(new File(['x'], 'a.mp4'), {
      mediaId: 'med_1',
      session: SESSION,
      client: client(),
    }),
  ).rejects.toThrow(/Multipart upload failed/);
});

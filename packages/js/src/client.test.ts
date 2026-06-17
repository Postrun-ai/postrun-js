import { afterEach, expect, test, vi } from 'vitest';

import { createPostrunClient } from './client';
import { postsList, profilesList } from './client/sdk.gen';
import { PostrunError } from './errors';

afterEach(() => vi.unstubAllGlobals());

function recordFetch(status = 200, body: unknown = {}) {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

function client() {
  return createPostrunClient({
    getToken: () => 'tok',
    baseUrl: 'https://api.test/v1',
  });
}

test('throws a typed PostrunError on a failed request (throwOnError + interceptor)', async () => {
  recordFetch(404, {
    type: 'https://docs.postrun.ai/errors/not_found',
    title: 'The requested resource was not found.',
    status: 404,
    code: 'not_found',
    detail: 'No profile with that id.',
  });

  const error = await profilesList({ client: client() }).catch(
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(PostrunError);
  if (error instanceof PostrunError) {
    expect(error.status).toBe(404);
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('No profile with that id.');
  }
});

test('interceptor populates code, request_id and fieldErrors from the problem body', async () => {
  recordFetch(422, {
    type: 'https://docs.postrun.ai/errors/validation_failed',
    title: 'The request body failed validation.',
    status: 422,
    code: 'validation_failed',
    detail: 'One or more fields are invalid.',
    request_id: 'req_xyz789',
    errors: [
      { field: 'limit', code: 'too_big', detail: 'Must be ≤ 100.' },
    ],
  });

  const error = await profilesList({ client: client() }).catch(
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(PostrunError);
  if (error instanceof PostrunError) {
    expect(error.status).toBe(422);
    expect(error.code).toBe('validation_failed');
    expect(error.request_id).toBe('req_xyz789');
    expect(error.fieldErrors).toEqual([
      { field: 'limit', code: 'too_big', detail: 'Must be ≤ 100.' },
    ]);
  }
});

test('serializes an object query param (metadata) as one URL-encoded JSON value', async () => {
  const calls = recordFetch();

  await profilesList({
    client: client(),
    query: { metadata: { tier: 'pro', priority: 3 } },
  });

  const url = new URL(calls[0]!.url);
  // The API parses `metadata` as a JSON string; bracket form (metadata[tier]=pro)
  // would mean the server never sees a `metadata` key and silently drops the filter.
  expect(url.searchParams.get('metadata')).toBe(
    JSON.stringify({ tier: 'pro', priority: 3 }),
  );
  expect(url.search).not.toContain('metadata%5B');
});

test('serializes an array query param (status) as repeated params, not JSON', async () => {
  const calls = recordFetch(200, {
    object: 'list',
    data: [],
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  });

  await postsList({
    client: client(),
    query: { status: ['scheduled', 'failed'] },
  });

  const url = new URL(calls[0]!.url);
  // The API parses `status` as repeated query params (`.in(...)`); a single
  // JSON-encoded value (`status=["scheduled","failed"]`) would fail validation.
  expect(url.searchParams.getAll('status')).toEqual(['scheduled', 'failed']);
  expect(url.search).not.toContain('%5B'); // no `[` — not JSON-encoded
});

test('serializes scalar query params normally', async () => {
  const calls = recordFetch();

  await profilesList({
    client: client(),
    query: { limit: 5, external_id: 'ext_1' },
  });

  const url = new URL(calls[0]!.url);
  expect(url.searchParams.get('limit')).toBe('5');
  expect(url.searchParams.get('external_id')).toBe('ext_1');
});

test('PostrunError extracts the message (detail) and code from the RFC 9457 body', () => {
  // The real wire body per the API's `encodeProblem`: RFC 9457, message in `detail`.
  const error = new PostrunError(404, {
    type: 'https://docs.postrun.ai/errors/not_found',
    title: 'The requested resource was not found.',
    status: 404,
    code: 'not_found',
    detail: 'No profile with that id.',
  });

  expect(error.message).toBe('No profile with that id.');
  expect(error.code).toBe('not_found');
  expect(error.status).toBe(404);
});

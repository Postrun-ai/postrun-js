import { afterEach, expect, test, vi } from 'vitest';

import { createPostrunClient } from './client';
import { profilesList } from './client/sdk.gen';
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

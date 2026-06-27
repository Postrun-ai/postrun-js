import { afterEach, expect, test, vi } from 'vitest';

import { createPostrunClient } from './client';
import { postsCreate, profilesList } from './client/sdk.gen';
import { PostrunError } from './errors';

afterEach(() => vi.unstubAllGlobals());

interface FetchScript {
  /** The status each successive fetch should return, in order. */
  statuses: number[];
  body?: unknown;
}

/** Stub global fetch to return the scripted statuses; record every Request. */
function scriptFetch({ statuses, body = {} }: FetchScript): Request[] {
  const calls: Request[] = [];
  let index = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const status = statuses[Math.min(index, statuses.length - 1)]!;
      index += 1;
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

function clientWith(getToken: () => string | Promise<string>) {
  return createPostrunClient({ getToken, baseUrl: 'https://api.test/v1' });
}

test('200: no retry, getToken resolves the bearer once', async () => {
  const calls = scriptFetch({ statuses: [200] });
  const getToken = vi.fn(() => 'tok-a');

  await profilesList({ client: clientWith(getToken) });

  expect(calls).toHaveLength(1);
  expect(calls[0]!.headers.get('Authorization')).toBe('Bearer tok-a');
  expect(getToken).toHaveBeenCalledTimes(1);
});

test('401 then 200: forces a refresh and retries with the new bearer', async () => {
  const calls = scriptFetch({ statuses: [401, 200] });
  const getToken = vi
    .fn<() => string>()
    .mockReturnValueOnce('stale')
    .mockReturnValueOnce('fresh');

  const result = await profilesList({ client: clientWith(getToken) });

  expect(calls).toHaveLength(2);
  expect(calls[0]!.headers.get('Authorization')).toBe('Bearer stale');
  expect(calls[1]!.headers.get('Authorization')).toBe('Bearer fresh');
  expect(result.response.status).toBe(200);
  expect(getToken).toHaveBeenCalledTimes(2);
});

test('401 retry preserves the original method, body, and other headers', async () => {
  const calls = scriptFetch({ statuses: [401, 200] });
  const getToken = vi
    .fn<() => string>()
    .mockReturnValueOnce('stale')
    .mockReturnValueOnce('fresh');

  await postsCreate({
    client: clientWith(getToken),
    body: { title: 'hello' } as never,
    headers: { 'Idempotency-Key': 'idem_123' },
  });

  expect(calls).toHaveLength(2);
  const retried = calls[1]!;
  expect(retried.method).toBe('POST');
  expect(retried.headers.get('Authorization')).toBe('Bearer fresh');
  expect(retried.headers.get('Idempotency-Key')).toBe('idem_123');
  expect(retried.headers.get('Content-Type')).toContain('application/json');
  expect(await retried.clone().text()).toBe(JSON.stringify({ title: 'hello' }));
});

test('401 then 401: returns the second 401 (no infinite loop)', async () => {
  const calls = scriptFetch({
    statuses: [401, 401],
    body: {
      type: 'https://docs.postrun.ai/errors/unauthorized',
      title: 'Not authorized.',
      status: 401,
      code: 'unauthorized',
      detail: 'Token rejected.',
    },
  });
  const getToken = vi
    .fn<() => string>()
    .mockReturnValueOnce('stale')
    .mockReturnValueOnce('still-bad');

  const error = await profilesList({ client: clientWith(getToken) }).catch(
    (caught: unknown) => caught,
  );

  expect(calls).toHaveLength(2);
  expect(error).toBeInstanceOf(PostrunError);
  if (error instanceof PostrunError) {
    expect(error.status).toBe(401);
  }
  // initial auth + one forceRefresh; never more.
  expect(getToken).toHaveBeenCalledTimes(2);
});

test('403: no retry (a fresh token cannot fix a scope error)', async () => {
  const calls = scriptFetch({
    statuses: [403],
    body: {
      type: 'https://docs.postrun.ai/errors/forbidden',
      title: 'Forbidden.',
      status: 403,
      code: 'forbidden',
      detail: 'Out of scope.',
    },
  });
  const getToken = vi.fn(() => 'tok');

  await profilesList({ client: clientWith(getToken) }).catch(() => undefined);

  expect(calls).toHaveLength(1);
  expect(getToken).toHaveBeenCalledTimes(1);
});

test('404: no retry', async () => {
  const calls = scriptFetch({
    statuses: [404],
    body: {
      type: 'https://docs.postrun.ai/errors/not_found',
      title: 'Not found.',
      status: 404,
      code: 'not_found',
      detail: 'Gone.',
    },
  });
  const getToken = vi.fn(() => 'tok');

  await profilesList({ client: clientWith(getToken) }).catch(() => undefined);

  expect(calls).toHaveLength(1);
  expect(getToken).toHaveBeenCalledTimes(1);
});

test('401 with a failing refresh surfaces the ORIGINAL 401', async () => {
  const calls = scriptFetch({
    statuses: [401],
    body: {
      type: 'https://docs.postrun.ai/errors/unauthorized',
      title: 'Not authorized.',
      status: 401,
      code: 'unauthorized',
      detail: 'Initial token rejected.',
    },
  });
  const getToken = vi
    .fn<() => string | Promise<string>>()
    .mockReturnValueOnce('stale')
    .mockRejectedValueOnce(new Error('mint down'));

  const error = await profilesList({ client: clientWith(getToken) }).catch(
    (caught: unknown) => caught,
  );

  expect(calls).toHaveLength(1);
  expect(error).toBeInstanceOf(PostrunError);
  if (error instanceof PostrunError) {
    expect(error.status).toBe(401);
    expect(error.code).toBe('unauthorized');
  }
});

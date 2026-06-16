import { afterEach, expect, test, vi } from 'vitest';

import { profilesList } from './client/sdk.gen';
import { createPostrunServer } from './server';

afterEach(() => vi.unstubAllGlobals());

const MINTED = { token: 'jwt.header.sig', expires_at: '2026-06-15T12:15:00Z' };

function recordFetch(status = 201, body: unknown = MINTED) {
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

function server() {
  return createPostrunServer({
    secretKey: 'pr_secret_123',
    baseUrl: 'https://api.test/v1',
  });
}

test('mints a token: POSTs /tokens with the secret key as bearer, forwards the body, returns the data', async () => {
  const calls = recordFetch();

  const result = await server().tokens.mint({
    profile_scope: { type: 'external_id', values: ['acme-co'] },
    scopes: ['posts:write', 'media:write'],
    ttl_seconds: 900,
  });

  expect(result).toEqual(MINTED);

  const req = calls[0]!;
  expect(req.method).toBe('POST');
  expect(new URL(req.url).pathname).toMatch(/\/tokens$/);
  expect(req.headers.get('authorization')).toBe('Bearer pr_secret_123');
  expect(await req.json()).toEqual({
    profile_scope: { type: 'external_id', values: ['acme-co'] },
    scopes: ['posts:write', 'media:write'],
    ttl_seconds: 900,
  });
});

test('surfaces an API rejection as a typed PostrunError', async () => {
  recordFetch(401, {
    code: 'unauthorized',
    detail: 'A valid Postrun API key is required.',
    status: 401,
  });
  await expect(
    server().tokens.mint({ profile_scope: { type: 'all' }, scopes: ['posts:read'] }),
  ).rejects.toMatchObject({ name: 'PostrunError', status: 401, code: 'unauthorized' });
});

test('rejects an empty secret key', () => {
  expect(() => createPostrunServer({ secretKey: '' })).toThrow(/secret/i);
});

test('refuses to run in a browser — the secret key must stay server-side', () => {
  vi.stubGlobal('window', { document: {} });
  expect(() => createPostrunServer({ secretKey: 'pr_x' })).toThrow(/server/i);
});

test('exposes a raw secret-authed client for other server-side calls', async () => {
  const calls = recordFetch(200, { object: 'list', data: [], total: 0 });
  await profilesList({ client: server().client });
  expect(calls[0]!.headers.get('authorization')).toBe('Bearer pr_secret_123');
});

test('scopes are typed to the closed union (compile-time)', async () => {
  recordFetch();
  await server().tokens.mint({
    profile_scope: { type: 'all' },
    // @ts-expect-error — 'ads:delete' is not a real scope
    scopes: ['ads:delete'],
  });
});

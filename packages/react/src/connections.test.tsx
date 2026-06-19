import { AuthError } from '@nangohq/frontend';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import {
  useConnect,
  useConnection,
  useConnections,
  useDisconnect,
  useDiscoverableAccounts,
  useSelectAccount,
} from './connections';
import { recordFetch, testWrapper } from './test-utils';

// Mock the Nango frontend popup, but keep the REAL `AuthError` so the machine's
// `instanceof AuthError` checks work. `authMock` is the in-page `nango.auth()`;
// `nangoCtor` captures the `new Nango({ host, connectSessionToken })` args.
const { authMock, nangoCtor } = vi.hoisted(() => {
  const authMock = vi.fn();
  const nangoCtor = vi.fn((_opts: { host: string; connectSessionToken: string }) => ({
    auth: authMock,
  }));
  return { authMock, nangoCtor };
});

vi.mock('@nangohq/frontend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nangohq/frontend')>();
  return { ...actual, default: nangoCtor };
});

/** A connect session with the embedded Nango fields the SDK reads. */
const SESSION = {
  hosted_connect_url: 'https://postrun.ai/connect?session_token=cst_1',
  connect_token: 'eyJ.scoped.token',
  connect_session_token: 'cst_1',
  provider_config_key: 'twitter-v2',
  nango_host: 'https://auth.postrun.ai',
  expires_at: '2026-01-01T00:00:00Z',
};

/** Route-aware fetch stub: pick a response per (method, pathname). */
function stubRoutes(
  route: (
    method: string,
    pathname: string,
    url: URL,
  ) => { body: unknown; status?: number } | undefined,
) {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const url = new URL(request.url);
      const match = route(request.method, url.pathname, url);
      if (!match) throw new Error(`no route for ${request.method} ${url.pathname}`);
      return new Response(JSON.stringify(match.body), {
        status: match.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

const CONNECTION = {
  id: 'conn_1',
  profile_id: 'prof_1',
  platform: 'x',
  external_account_id: null,
  external_account_name: null,
  currency: null,
  created_at: null,
  updated_at: null,
};

const ACTIVE = {
  ...CONNECTION,
  external_account_id: 'acc_1',
  external_account_name: 'Acme',
};

const CONN_LIST = {
  object: 'list',
  data: [CONNECTION],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
};

const ACCOUNTS = {
  object: 'list',
  data: [{ external_account_id: 'acc_1', name: 'Acme', currency: 'USD' }],
};

/** A connections list filtered to the grant's row (the poll's response). */
const listOf = (connection: unknown) => ({
  object: 'list',
  data: [connection],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
});

afterEach(() => {
  vi.unstubAllGlobals();
  authMock.mockReset();
  nangoCtor.mockClear();
});

test('useConnections lists a profile’s connections', async () => {
  const calls = recordFetch(CONN_LIST);
  const { result } = renderHook(() => useConnections('prof_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(CONN_LIST);
  expect(new URL(calls[0]!.url).pathname).toMatch(
    /\/profiles\/prof_1\/connections$/,
  );
});

test('useConnections forwards a kind/status filter (e.g. social-only for the composer)', async () => {
  const calls = recordFetch(CONN_LIST);
  renderHook(
    () => useConnections('prof_1', { kind: 'posting', status: 'active' }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(calls).toHaveLength(1));
  const url = new URL(calls[0]!.url);
  expect(url.pathname).toMatch(/\/profiles\/prof_1\/connections$/);
  expect(url.searchParams.get('kind')).toBe('posting');
  expect(url.searchParams.get('status')).toBe('active');
});

test('useConnection returns a single connection', async () => {
  const calls = recordFetch(CONNECTION);
  const { result } = renderHook(() => useConnection('conn_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(CONNECTION);
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/connections\/conn_1$/);
});

test('useDiscoverableAccounts lists accounts for a pending connection', async () => {
  const calls = recordFetch(ACCOUNTS);
  const { result } = renderHook(() => useDiscoverableAccounts('conn_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(ACCOUNTS);
  expect(new URL(calls[0]!.url).pathname).toMatch(
    /\/connections\/conn_1\/accounts$/,
  );
});

test('useSelectAccount activates the connection by id', async () => {
  const calls = recordFetch(ACTIVE);
  const { result } = renderHook(() => useSelectAccount(), {
    wrapper: testWrapper(),
  });

  let activated: unknown;
  await act(async () => {
    activated = await result.current.mutateAsync({
      id: 'conn_1',
      external_account_id: 'acc_1',
    });
  });

  expect(calls[0]!.method).toBe('PATCH');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/connections\/conn_1$/);
  expect(await calls[0]!.json()).toEqual({ external_account_id: 'acc_1' });
  expect(activated).toEqual(ACTIVE);
});

test('useConnect pre-mints the session on mount (gesture-safe) and becomes idle', async () => {
  const calls = stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x' }),
    { wrapper: testWrapper() },
  );

  // Starts in `preparing` while the session mints…
  expect(result.current.state.phase).toBe('preparing');
  // …then becomes `idle` (session held) once the POST /connect resolves.
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  expect(calls[0]!.method).toBe('POST');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/profiles\/prof_1\/connect$/);
});

test('useConnect: start() opens nango.auth() in-page (no redirect) → single-account active', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    // The poll, filtered by the Nango connection id, returns the active row.
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(ACTIVE) };
    return undefined;
  });

  const onConnected = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onConnected }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() => expect(result.current.state.phase).toBe('active'));
  // Constructed with the pre-minted token + host; auth() called with the key.
  expect(nangoCtor).toHaveBeenCalledWith({
    host: 'https://auth.postrun.ai',
    connectSessionToken: 'cst_1',
  });
  expect(authMock).toHaveBeenCalledWith('twitter-v2', {
    detectClosedAuthWindow: true,
  });
  expect(onConnected).toHaveBeenCalledWith(ACTIVE);
  if (result.current.state.phase === 'active') {
    expect(result.current.state.connection).toEqual(ACTIVE);
  }
});

test('useConnect: multi-account grant exposes the picker, then select() activates', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(CONNECTION) }; // PENDING (no account yet)
    if (method === 'GET' && pathname.endsWith('/accounts'))
      return { body: ACCOUNTS };
    if (method === 'PATCH' && pathname.endsWith('/connections/conn_1'))
      return { body: ACTIVE };
    return undefined;
  });

  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x' }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  // The host gets the discoverable accounts to render its own picker.
  await waitFor(() => expect(result.current.state.phase).toBe('picking'));
  if (result.current.state.phase === 'picking') {
    expect(result.current.state.accounts).toEqual(ACCOUNTS.data);
  }

  act(() => result.current.select('acc_1'));

  await waitFor(() => expect(result.current.state.phase).toBe('active'));
});

test('useConnect: closing the popup resolves to cancelled (not an error)', async () => {
  authMock.mockRejectedValue(new AuthError('closed', 'window_closed'));
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x' }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() => expect(result.current.state.phase).toBe('cancelled'));
});

test('useConnect: a re-entrant start() while a flow is running is a no-op (one popup)', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(CONNECTION) }; // PENDING → parks in `picking`
    if (method === 'GET' && pathname.endsWith('/accounts'))
      return { body: ACCOUNTS };
    return undefined;
  });

  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x' }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());
  await waitFor(() => expect(result.current.state.phase).toBe('picking'));

  // A second click mid-flow must NOT open a second popup or race a 2nd machine.
  act(() => result.current.start());
  expect(authMock).toHaveBeenCalledTimes(1);
});

test('useConnect: reset() during picking unwinds the flow and re-mints to idle', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(CONNECTION) };
    if (method === 'GET' && pathname.endsWith('/accounts'))
      return { body: ACCOUNTS };
    return undefined;
  });

  const onConnected = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onConnected }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());
  await waitFor(() => expect(result.current.state.phase).toBe('picking'));

  // Abandon mid-pick: the parked machine must unwind (its pick is rejected), and
  // a fresh session re-mints back to `idle` — never a hang, never `onConnected`.
  act(() => result.current.reset());
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));
  expect(onConnected).not.toHaveBeenCalled();
});

test('useConnect: unmounting mid-flow fires no onConnected (no setState after unmount)', async () => {
  let resolveAuth: (v: { providerConfigKey: string; connectionId: string }) => void = () => {};
  authMock.mockReturnValue(
    new Promise((resolve) => {
      resolveAuth = resolve;
    }),
  );
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(ACTIVE) };
    return undefined;
  });

  const onConnected = vi.fn();
  const onSuccess = vi.fn();
  const { result, unmount } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', onConnected, onSuccess }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start()); // popup open, grant in-flight (not resolved)
  unmount(); // tear down while connecting → flow abandoned

  // Now let the grant resolve; the abandoned machine completes but must be inert.
  await act(async () => {
    resolveAuth({ providerConfigKey: 'twitter-v2', connectionId: 'nango_1' });
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(onConnected).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled(); // no callback for an abandoned flow
});

test('useConnect: abandoning WHILE connecting (before the picker) never flips to a stale picking', async () => {
  // Park the flow in discovery (after auth + poll, before the picker) via a gate,
  // abandon it (reset), let it re-mint to idle, THEN release discovery. The
  // stale machine must NOT flip the (new) state to `picking` with old accounts.
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  let releaseAccounts: () => void = () => {};
  const accountsGate = new Promise<void>((resolve) => {
    releaseAccounts = resolve;
  });
  const calls: Request[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push(request);
      const { pathname } = new URL(request.url);
      if (request.method === 'POST' && pathname.endsWith('/connect'))
        return json(SESSION, 201);
      if (request.method === 'GET' && pathname.endsWith('/connections'))
        return json(listOf(CONNECTION)); // PENDING → goes to discovery
      if (request.method === 'GET' && pathname.endsWith('/accounts')) {
        await accountsGate; // park here, mid-flow, until released
        return json(ACCOUNTS);
      }
      throw new Error(`no route for ${request.method} ${pathname}`);
    }),
  );

  const onConnected = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onConnected }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());
  // Wait until discovery is in-flight (the /accounts call was made and parked).
  await waitFor(() =>
    expect(calls.some((c) => c.url.endsWith('/accounts'))).toBe(true),
  );

  // Abandon mid-flow, BEFORE the picker is reached, and let it re-mint to idle.
  act(() => result.current.reset());
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  // Now release the stale discovery. The abandoned machine must stay inert.
  await act(async () => {
    releaseAccounts();
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(result.current.state.phase).toBe('idle'); // NOT 'picking'
  expect(onConnected).not.toHaveBeenCalled();
});

test('useConnect: a SYNCHRONOUS Nango/auth throw becomes a typed auth_failed (not an uncaught throw)', async () => {
  // The Nango SDK throws AuthError synchronously for invalid host / missing
  // token — that must convert to a typed outcome, not escape start() and wedge
  // the flow (inFlightRef stuck → no retry).
  authMock.mockImplementation(() => {
    throw new AuthError('Invalid URL provided for the Nango host.', 'invalid_host_url');
  });
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x' }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  // Must NOT throw synchronously out of the click handler.
  act(() => result.current.start());

  await waitFor(() => expect(result.current.state.phase).toBe('error'));
  if (result.current.state.phase === 'error') {
    expect(result.current.state.reason).toBe('auth_failed');
  }
});

test('useConnect: onError fires with the typed reason on failure', async () => {
  authMock.mockImplementation(() => {
    throw new AuthError('bad host', 'invalid_host_url');
  });
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const onError = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onError }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() => expect(onError).toHaveBeenCalledWith('auth_failed'));
});

test('useConnect: onCancelled fires when the user closes the popup', async () => {
  authMock.mockRejectedValue(new AuthError('closed', 'window_closed'));
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const onCancelled = vi.fn();
  const onSuccess = vi.fn();
  const { result } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', onCancelled, onSuccess }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
  expect(onSuccess).not.toHaveBeenCalled(); // cancel is not a success
});

test('useConnect: a successful connect auto-refetches useConnections', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  const listCalls: string[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      const { pathname } = url;
      if (request.method === 'POST' && pathname.endsWith('/connect'))
        return json(SESSION, 201);
      if (request.method === 'GET' && pathname.endsWith('/connections')) {
        // The flow's correlation poll (filtered) vs the `useConnections` query.
        if (url.searchParams.get('nango_connection_id') === 'nango_1')
          return json(listOf(ACTIVE));
        listCalls.push(pathname);
        return json(CONN_LIST);
      }
      throw new Error(`no route for ${request.method} ${pathname}`);
    }),
  );

  const { result } = renderHook(
    () => ({
      list: useConnections('prof_1'),
      connect: useConnect({ profileId: 'prof_1', platform: 'x' }),
    }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
  await waitFor(() => expect(result.current.connect.state.phase).toBe('idle'));
  expect(listCalls).toHaveLength(1); // initial useConnections fetch

  act(() => result.current.connect.start());
  await waitFor(() =>
    expect(result.current.connect.state.phase).toBe('active'),
  );

  // The auto-invalidate refetched the connections list — no manual refetch.
  await waitFor(() => expect(listCalls).toHaveLength(2));
});

test('useConnect: prepareOnMount=false defers minting until prepare()', async () => {
  const calls = stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', prepareOnMount: false }),
    { wrapper: testWrapper() },
  );

  // No mint on mount — it sits in `preparing` with zero network calls…
  await waitFor(() => expect(result.current.state.phase).toBe('preparing'));
  expect(calls).toHaveLength(0);

  // …until the host calls prepare() (the picker-on-intent path).
  act(() => result.current.prepare());
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));
  expect(calls).toHaveLength(1);
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/profiles\/prof_1\/connect$/);
});

test('useConnect: start() before a session is held kicks prepare() (no popup yet)', async () => {
  const calls = stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', prepareOnMount: false }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('preparing'));

  // A click with no prior intent must NOT open a popup, but it kicks a mint so
  // the next click works.
  act(() => result.current.start());
  expect(authMock).not.toHaveBeenCalled();
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));
  expect(calls).toHaveLength(1);
});

test('useConnect: a session-mint failure fires onError(prepare_failed), not auth_failed', async () => {
  // POST /connect fails — we couldn't even mint a session (vs a Nango grant
  // failure). These are different origins and must carry different reasons.
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: { code: 'internal_error', status: 500 }, status: 500 }
      : undefined,
  );

  const onError = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onError }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(result.current.state.phase).toBe('error'));
  if (result.current.state.phase === 'error') {
    expect(result.current.state.reason).toBe('prepare_failed');
  }
  expect(onError).toHaveBeenCalledWith('prepare_failed');
});

test('useConnect: a 2xx connect with no body surfaces a typed error (no silent hang)', async () => {
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: null, status: 201 }
      : undefined,
  );

  const onError = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onError }),
    { wrapper: testWrapper() },
  );

  await waitFor(() => expect(result.current.state.phase).toBe('error'));
  expect(onError).toHaveBeenCalledWith('prepare_failed');
});

test('useConnect: prepare() is idempotent — rapid calls mint exactly once', async () => {
  const calls = stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const { result } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', prepareOnMount: false }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('preparing'));

  act(() => {
    result.current.prepare();
    result.current.prepare();
    result.current.prepare();
  });

  await waitFor(() => expect(result.current.state.phase).toBe('idle'));
  expect(calls).toHaveLength(1);
});

test('useConnect: onError does not fire for a flow abandoned before it settles', async () => {
  let rejectAuth: (reason: Error) => void = () => {};
  authMock.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectAuth = reject;
    }),
  );
  stubRoutes((method, pathname) =>
    method === 'POST' && pathname.endsWith('/connect')
      ? { body: SESSION, status: 201 }
      : undefined,
  );

  const onError = vi.fn();
  const { result, unmount } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onError }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start()); // grant in-flight (not settled)
  unmount(); // abandon while connecting

  await act(async () => {
    rejectAuth(new AuthError('boom', 'unknown_error'));
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(onError).not.toHaveBeenCalled(); // stale flow → no callback
});

test('useConnect: onSuccess fires on a single-account active connect', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(ACTIVE) };
    return undefined;
  });

  const onSuccess = vi.fn();
  const { result } = renderHook(
    () => useConnect({ profileId: 'prof_1', platform: 'x', onSuccess }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() => expect(result.current.state.phase).toBe('active'));
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

test('useConnect: onSuccess ALSO fires on connected_pending (grant landed, binds out-of-band)', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  stubRoutes((method, pathname, url) => {
    if (method === 'POST' && pathname.endsWith('/connect'))
      return { body: SESSION, status: 201 };
    if (
      method === 'GET' &&
      pathname.endsWith('/connections') &&
      url.searchParams.get('nango_connection_id') === 'nango_1'
    )
      return { body: listOf(CONNECTION) }; // PENDING (no account)
    // Discovery not supported → connected_pending (fast — no poll timeout).
    if (method === 'GET' && pathname.endsWith('/accounts'))
      return { body: { code: 'not_implemented', status: 501 }, status: 501 };
    return undefined;
  });

  const onSuccess = vi.fn();
  const onConnected = vi.fn();
  const { result } = renderHook(
    () =>
      useConnect({ profileId: 'prof_1', platform: 'x', onSuccess, onConnected }),
    { wrapper: testWrapper() },
  );
  await waitFor(() => expect(result.current.state.phase).toBe('idle'));

  act(() => result.current.start());

  await waitFor(() =>
    expect(result.current.state.phase).toBe('connected_pending'),
  );
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(onConnected).not.toHaveBeenCalled(); // no bound connection on pending
});

test('useDisconnect deletes a connection by id', async () => {
  const calls = recordFetch({
    id: 'conn_1',
    object: 'connection',
    deleted: true,
  });
  const { result } = renderHook(() => useDisconnect(), {
    wrapper: testWrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync('conn_1');
  });

  expect(calls[0]!.method).toBe('DELETE');
  expect(new URL(calls[0]!.url).pathname).toMatch(/\/connections\/conn_1$/);
});

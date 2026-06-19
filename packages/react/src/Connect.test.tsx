import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { Connect } from './Connect';
import { testWrapper } from './test-utils';

// Mock the Nango popup; `authMock` is the in-page `nango.auth()`.
const { authMock, nangoCtor } = vi.hoisted(() => {
  const authMock = vi.fn();
  const nangoCtor = vi.fn(
    (_opts: { host: string; connectSessionToken: string }) => ({
      auth: authMock,
    }),
  );
  return { authMock, nangoCtor };
});

vi.mock('@nangohq/frontend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nangohq/frontend')>();
  return { ...actual, default: nangoCtor };
});

const SESSION = {
  hosted_connect_url: 'https://postrun.ai/connect?session_token=cst_1',
  connect_token: 'eyJ.scoped.token',
  connect_session_token: 'cst_1',
  provider_config_key: 'twitter-v2',
  nango_host: 'https://auth.postrun.ai',
  expires_at: '2026-01-01T00:00:00Z',
};

const ACTIVE = {
  id: 'conn_1',
  profile_id: 'prof_1',
  platform: 'x',
  kind: 'posting',
  status: 'active',
  external_account_id: 'acc_1',
  external_account_name: 'Acme',
  username: null,
  avatar_url: null,
  profile_url: null,
  reauth_at: null,
  currency: null,
  created_at: null,
  updated_at: null,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  authMock.mockReset();
  nangoCtor.mockClear();
});

test('<Connect> render-prop drives a single-account connect → onConnected', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (request.method === 'POST' && pathname.endsWith('/connect'))
        return json(SESSION, 201);
      if (request.method === 'GET' && pathname.endsWith('/connections'))
        return json({
          object: 'list',
          data: [ACTIVE],
          total: 1,
          limit: 20,
          offset: 0,
          has_more: false,
        });
      throw new Error(`no route for ${request.method} ${pathname}`);
    }),
  );

  const onConnected = vi.fn();
  const Wrapper = testWrapper();

  render(
    <Wrapper>
      <Connect profileId="prof_1" platform="x" onConnected={onConnected}>
        {({ state, start }) => (
          <button onClick={start} disabled={state.phase !== 'idle'}>
            {state.phase === 'active' ? 'Connected' : `Connect (${state.phase})`}
          </button>
        )}
      </Connect>
    </Wrapper>,
  );

  // The render-prop reflects the flow state: preparing → idle once minted.
  await waitFor(() =>
    expect(screen.getByRole('button').textContent).toBe('Connect (idle)'),
  );

  act(() => screen.getByRole('button').click());

  await waitFor(() =>
    expect(screen.getByRole('button').textContent).toBe('Connected'),
  );
  expect(authMock).toHaveBeenCalledWith('twitter-v2', {
    detectClosedAuthWindow: true,
  });
  expect(onConnected).toHaveBeenCalledWith(ACTIVE);
});

test('<Connect> exposes the account picker, and select() activates', async () => {
  authMock.mockResolvedValue({
    providerConfigKey: 'twitter-v2',
    connectionId: 'nango_1',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (request.method === 'POST' && pathname.endsWith('/connect'))
        return json(SESSION, 201);
      if (request.method === 'GET' && pathname.endsWith('/connections'))
        return json({
          object: 'list',
          data: [{ ...ACTIVE, status: 'pending', external_account_id: null }],
          total: 1,
          limit: 20,
          offset: 0,
          has_more: false,
        });
      if (request.method === 'GET' && pathname.endsWith('/accounts'))
        return json({
          object: 'list',
          data: [{ external_account_id: 'acc_1', name: 'Acme', currency: 'USD' }],
        });
      if (request.method === 'PATCH' && pathname.endsWith('/connections/conn_1'))
        return json(ACTIVE);
      throw new Error(`no route for ${request.method} ${pathname}`);
    }),
  );

  const Wrapper = testWrapper();

  render(
    <Wrapper>
      <Connect profileId="prof_1" platform="x">
        {({ state, start, select }) => {
          if (state.phase === 'picking') {
            return (
              <ul>
                {state.accounts.map((a) => (
                  <li key={a.external_account_id}>
                    <button onClick={() => select(a.external_account_id)}>
                      {a.name ?? a.external_account_id}
                    </button>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <button onClick={start} disabled={state.phase !== 'idle'}>
              {state.phase === 'active' ? 'Connected' : 'Connect'}
            </button>
          );
        }}
      </Connect>
    </Wrapper>,
  );

  await waitFor(() =>
    expect(screen.getByRole('button').textContent).toBe('Connect'),
  );
  act(() => screen.getByRole('button').click());

  // The render-prop receives the discoverable accounts to draw its own picker.
  await waitFor(() => expect(screen.getByText('Acme')).toBeDefined());

  act(() => screen.getByText('Acme').click());

  await waitFor(() =>
    expect(screen.getByRole('button').textContent).toBe('Connected'),
  );
});

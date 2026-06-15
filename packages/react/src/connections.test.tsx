import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import {
  useConnection,
  useConnections,
  useDisconnect,
  useDiscoverableAccounts,
  useSelectAccount,
} from './connections';
import { recordFetch, testWrapper } from './test-utils';

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

afterEach(() => vi.unstubAllGlobals());

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

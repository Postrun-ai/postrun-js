import { AuthError } from '@nangohq/frontend';
import { expect, test, vi } from 'vitest';

import { PostrunError } from '@postrun/js';
import type { Connection } from '@postrun/js';

import {
  type ConnectMachineDeps,
  type DiscoverableAccount,
  runEmbeddedConnect,
} from './connect-machine';

const PENDING_CONN: Connection = {
  id: 'conn_1',
  profile_id: 'prof_1',
  platform: 'x',
  kind: 'posting',
  status: 'pending',
  external_account_id: null,
  external_account_name: null,
  username: null,
  avatar_url: null,
  profile_url: null,
  reauth_at: null,
  currency: null,
  created_at: null,
  updated_at: null,
};

const ACTIVE_CONN: Connection = {
  ...PENDING_CONN,
  status: 'active',
  external_account_id: 'acc_1',
  external_account_name: 'Acme',
};

const ACCOUNT: DiscoverableAccount = {
  external_account_id: 'acc_1',
  name: 'Acme',
  currency: 'USD',
};

/** Default deps = the happy single-account path; override per test. */
function makeDeps(over: Partial<ConnectMachineDeps> = {}): ConnectMachineDeps {
  return {
    authorize: async () => 'nango_conn_1',
    chooseAccount: async () => 'acc_1',
    listByNangoConnectionId: async () => [ACTIVE_CONN],
    discoverAccounts: async () => [ACCOUNT],
    selectAccount: async () => ACTIVE_CONN,
    pollIntervalMs: 1,
    pollTimeoutMs: 50,
    ...over,
  };
}

const postrunError = (status: number, code: string) =>
  new PostrunError(status, { status, code, title: code, type: code });

test('single-account: the grant polls back an already-active connection', async () => {
  const outcome = await runEmbeddedConnect(makeDeps());
  expect(outcome).toEqual({ status: 'active', connection: ACTIVE_CONN });
});

test('multi-account: discover → pick → select activates the connection', async () => {
  const chooseAccount = vi.fn(async () => 'acc_1');
  const selectAccount = vi.fn(async () => ACTIVE_CONN);
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => [PENDING_CONN],
      discoverAccounts: async () => [ACCOUNT],
      chooseAccount,
      selectAccount,
    }),
  );

  expect(chooseAccount).toHaveBeenCalledWith([ACCOUNT]);
  expect(selectAccount).toHaveBeenCalledWith('conn_1', 'acc_1');
  expect(outcome).toEqual({ status: 'active', connection: ACTIVE_CONN });
});

test('closing the popup is cancelled, not an error', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      authorize: async () => {
        throw new AuthError('closed', 'window_closed');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'cancelled' });
});

test('a blocked popup surfaces popup_blocked', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      authorize: async () => {
        throw new AuthError('blocked', 'blocked_by_browser');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'popup_blocked' });
});

test('any other AuthError is auth_failed', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      authorize: async () => {
        throw new AuthError('boom', 'unknown_error');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'auth_failed' });
});

test('a non-AuthError grant rejection is still a typed auth_failed (never thrown)', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      authorize: async () => {
        throw new Error('network down');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'auth_failed' });
});

test('a slow webhook (row never appears) resolves to connected_pending', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({ listByNangoConnectionId: async () => [] }),
  );
  expect(outcome).toEqual({ status: 'connected_pending' });
});

test('discovery not_implemented (out-of-band binding) is connected_pending', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => [PENDING_CONN],
      discoverAccounts: async () => {
        throw postrunError(501, 'not_implemented');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'connected_pending' });
});

test('no reachable accounts leaves the connection pending', async () => {
  const chooseAccount = vi.fn(async () => 'acc_1');
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => [PENDING_CONN],
      discoverAccounts: async () => [],
      chooseAccount,
    }),
  );
  expect(chooseAccount).not.toHaveBeenCalled();
  expect(outcome).toEqual({ status: 'connected_pending' });
});

test('a reauth-required select surfaces reauth_required', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => [PENDING_CONN],
      selectAccount: async () => {
        throw postrunError(409, 'connection_reauth_required');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'reauth_required' });
});

test('any other select failure is select_failed', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => [PENDING_CONN],
      selectAccount: async () => {
        throw postrunError(422, 'account_not_available');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'select_failed' });
});

test('a polling READ error (not a timeout) is connection_not_found', async () => {
  const outcome = await runEmbeddedConnect(
    makeDeps({
      listByNangoConnectionId: async () => {
        throw new Error('500 from gateway');
      },
    }),
  );
  expect(outcome).toEqual({ status: 'error', reason: 'connection_not_found' });
});

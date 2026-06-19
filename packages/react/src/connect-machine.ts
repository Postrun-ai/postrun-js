import { AuthError } from '@nangohq/frontend';
import pWaitFor, { TimeoutError } from 'p-wait-for';

import { PostrunError } from '@postrun/js';
import type { Connection, DiscoverableAccountList } from '@postrun/js';

/**
 * The pure orchestration behind the embedded (no-redirect) connect flow. It is
 * the in-app twin of the hosted `/connect` runner's machine, sharing its exact
 * shape — grant → correlate by the Nango `connectionId` → discover → pick →
 * select — and its two invariants:
 *
 *   1. It NEVER throws: every path resolves to one typed `ConnectOutcome`, so the
 *      hook can map it straight to a UI state and a seam can't crash a host app.
 *   2. Correlation is EXACT: `nango.auth()` resolves with the Nango `connectionId`,
 *      the SAME value the auth webhook stores as `nango_connection_id`. We poll the
 *      connections list filtered by that id, so the row this grant produced is found
 *      unambiguously — a concurrent connect on the same profile can't be mis-picked.
 *
 * All seams (the Nango grant, the host's account picker, the four API calls) are
 * INJECTED, so the whole machine unit-tests without a DOM, a network, or a real
 * `nango.auth()`. The hook (`useConnect`) wires the real seams onto it.
 */

/** One account offered for selection — the element type of the accounts list. */
export type DiscoverableAccount = DiscoverableAccountList['data'][number];

/** Why a connect attempt ended in `error` — actionable reasons for the host. */
export type ConnectErrorReason =
  | 'popup_blocked' // the browser blocked the OAuth popup
  | 'auth_failed' // the Nango grant failed (bad token, validation, unknown)
  | 'connection_not_found' // we couldn't read back the connection the grant made
  | 'select_failed' // discovery/selection failed (and isn't reauth)
  | 'reauth_required'; // the grant must be reconnected before an account binds

/**
 * The single outcome of a connect attempt. `active` carries the activated
 * connection (so the host can call `onConnected`); `connected_pending` means the
 * grant succeeded but no account is bound yet (slow webhook, out-of-band binding,
 * or no reachable accounts) — the host refetches its list, it is NOT an error.
 */
export type ConnectOutcome =
  | { status: 'active'; connection: Connection }
  | { status: 'connected_pending' }
  | { status: 'cancelled' }
  | { status: 'error'; reason: ConnectErrorReason };

export interface ConnectMachineDeps {
  /** Run the Nango OAuth grant; resolves the Nango `connectionId`, or rejects
   * with a typed `AuthError`. The hook fires `nango.auth()` synchronously in the
   * click and hands the in-flight promise here. */
  readonly authorize: () => Promise<string>;
  /** Resolve the user's chosen external account id — the host app's picker. */
  readonly chooseAccount: (accounts: DiscoverableAccount[]) => Promise<string>;
  /** List this profile's connections filtered by the Nango `connectionId`. */
  readonly listByNangoConnectionId: (
    nangoConnectionId: string,
  ) => Promise<Connection[]>;
  /** Discover the accounts reachable through a pending connection's grant. */
  readonly discoverAccounts: (
    connectionId: string,
  ) => Promise<DiscoverableAccount[]>;
  /** Activate a pending connection with the chosen account; resolves the row. */
  readonly selectAccount: (
    connectionId: string,
    externalAccountId: string,
  ) => Promise<Connection>;
  readonly pollIntervalMs: number;
  readonly pollTimeoutMs: number;
}

const PENDING: ConnectOutcome = { status: 'connected_pending' };
const CANCELLED: ConnectOutcome = { status: 'cancelled' };
const active = (connection: Connection): ConnectOutcome => ({
  status: 'active',
  connection,
});
const failed = (reason: ConnectErrorReason): ConnectOutcome => ({
  status: 'error',
  reason,
});

/** Map a Nango `AuthError` onto the typed outcome. Exhaustive (no `default`), so
 * a new `AuthErrorType` in a future Nango release is a compile error here, not a
 * silently-swallowed failure. */
function outcomeForAuthError(error: AuthError): ConnectOutcome {
  switch (error.type) {
    case 'window_closed':
      return CANCELLED;
    case 'blocked_by_browser':
      return failed('popup_blocked');
    case 'missing_auth_token':
    case 'invalid_host_url':
    case 'missing_credentials':
    case 'connection_test_failed':
    case 'missing_connect_session_token':
    case 'connection_validation_failed':
    case 'resource_capped':
    case 'unknown_error':
      return failed('auth_failed');
  }
}

/** The Nango grant step. Resolves the `connectionId` (our correlation key), or
 * the typed outcome to surface when the grant did not complete. Never throws —
 * an `AuthError` maps to its outcome, any other rejection to `auth_failed`. */
async function grant(
  authorize: () => Promise<string>,
): Promise<
  { ok: true; connectionId: string } | { ok: false; outcome: ConnectOutcome }
> {
  try {
    return { ok: true, connectionId: await authorize() };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, outcome: outcomeForAuthError(error) };
    }

    return { ok: false, outcome: failed('auth_failed') };
  }
}

/** Poll (bounded) for the connection THIS grant created — the list is filtered
 * server-side by the Nango `connectionId`, so any returned row is the grant's
 * row. Resolves the row, or `null` if it never appears within the timeout (a
 * slow webhook, not an error). */
async function awaitGrantedConnection(
  deps: ConnectMachineDeps,
  nangoConnectionId: string,
): Promise<Connection | null> {
  try {
    return await pWaitFor<Connection>(
      async () => {
        const rows = await deps.listByNangoConnectionId(nangoConnectionId);
        const match = rows[0];

        return match ? pWaitFor.resolveWith(match) : false;
      },
      { interval: deps.pollIntervalMs, timeout: deps.pollTimeoutMs },
    );
  } catch (error) {
    if (error instanceof TimeoutError) {
      return null;
    }

    throw error;
  }
}

/** Bind a granted PENDING connection: discover → pick → select. Discovery
 * `not_implemented` (the platform binds out-of-band) or no reachable accounts →
 * `connected_pending`; a reauth-required select → `reauth_required`; any other
 * select failure → `select_failed`. Never throws a `PostrunError`. */
async function bindPendingConnection(
  deps: ConnectMachineDeps,
  connection: Connection,
): Promise<ConnectOutcome> {
  let accounts: DiscoverableAccount[];

  try {
    accounts = await deps.discoverAccounts(connection.id);
  } catch (error) {
    if (error instanceof PostrunError && error.code === 'not_implemented') {
      return PENDING;
    }

    throw error;
  }

  // Nothing to pick or select: the grant landed but the connection stays PENDING
  // (the user must fix their platform access and reconnect), so don't hand `[]`
  // to the picker.
  if (accounts.length === 0) {
    return PENDING;
  }

  const chosen = await deps.chooseAccount(accounts);

  try {
    return active(await deps.selectAccount(connection.id, chosen));
  } catch (error) {
    if (error instanceof PostrunError) {
      return error.code === 'connection_reauth_required'
        ? failed('reauth_required')
        : failed('select_failed');
    }

    throw error;
  }
}

/**
 * Run the embedded connect flow to a single typed outcome. Never throws.
 */
export async function runEmbeddedConnect(
  deps: ConnectMachineDeps,
): Promise<ConnectOutcome> {
  const granted = await grant(deps.authorize);

  if (!granted.ok) {
    return granted.outcome;
  }

  let connection: Connection | null;

  try {
    connection = await awaitGrantedConnection(deps, granted.connectionId);
  } catch {
    // A polling READ error (not a timeout) means we can't confirm the row landed.
    return failed('connection_not_found');
  }

  // Slow webhook: the grant succeeded but the row isn't visible yet. The host
  // refetches its list, so this is `connected_pending`, not an error.
  if (connection === null) {
    return PENDING;
  }

  // Single-account platforms (and an already-resolved race) land ACTIVE already.
  if (connection.external_account_id !== null) {
    return active(connection);
  }

  try {
    return await bindPendingConnection(deps, connection);
  } catch {
    // A non-`PostrunError` throw mid-bind (e.g. an unexpected network error) is
    // surfaced as a typed failure, never swallowed.
    return failed('select_failed');
  }
}

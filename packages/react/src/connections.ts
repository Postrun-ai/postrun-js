import Nango from '@nangohq/frontend';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  connectionsConnect,
  connectionsDelete,
  connectionsGet,
  connectionsListAccounts,
  connectionsListByProfile,
  connectionsSelect,
} from '@postrun/js';
import type {
  ConnectablePlatform,
  Connection,
  SelectAccountInput,
} from '@postrun/js';

import {
  type ConnectErrorReason,
  type ConnectOutcome,
  type DiscoverableAccount,
  runEmbeddedConnect,
} from './connect-machine';
import { usePostrun } from './context';
import { connectionKeys } from './keys';
import type { ConnectionsFilter } from './keys';

/** Poll cadence for reading back the connection a grant created (the row is
 * written out-of-band by the Nango auth webhook). Mirrors the hosted runner. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15_000;

export interface UseConnectParams {
  /** The profile to attach the new connection to. */
  profileId: string;
  /** The platform to connect (X, LinkedIn, Meta, …). */
  platform: ConnectablePlatform;
  /** Called once a connection is fully ACTIVE (an account is bound). The
   * connections list is auto-refetched too, so you rarely need to act here. */
  onConnected?: (connection: Connection) => void;
  /** Called when the connect SUCCEEDS — `active` OR `connected_pending` (the
   * grant landed but the account binds out-of-band / via a slow webhook). Use
   * this to close your UI and let the auto-refetched list show the result;
   * `onConnected` additionally hands you the bound connection on `active`. */
  onSuccess?: () => void;
  /** Called when the attempt fails, with the typed reason. */
  onError?: (reason: ConnectErrorReason) => void;
  /** Called when the user closes the OAuth popup without finishing. The hook
   * stays in the `cancelled` phase; call `reset()` to re-arm for another try. */
  onCancelled?: () => void;
  /**
   * Pre-mint the Nango session on mount (default `true`). Keep it `true` for a
   * dedicated "Connect X" button. Set it `false` for a MULTI-platform picker —
   * then call `prepare()` on the platform button's `onPointerEnter`/`onFocus` so
   * only the platform the user is about to click mints a session (not all of
   * them on open). The popup still needs a pre-minted session, so prepare on
   * intent, not on click.
   */
  prepareOnMount?: boolean;
}

/**
 * The connect flow's UI state. `connected_pending` is a TERMINAL success state —
 * the grant landed but no account is bound yet (a slow webhook, an out-of-band
 * binding, or no reachable accounts); the host shows "almost there" and refetches
 * its connections list. It is NOT an error and must not hang in `connecting`.
 */
export type ConnectState =
  | { phase: 'preparing' } // no session held yet — minting, or awaiting `prepare()`
  | { phase: 'idle' } // session held; ready to start on a click
  | { phase: 'connecting' } // popup open / polling / binding
  | { phase: 'picking'; accounts: DiscoverableAccount[] } // host renders a picker
  | { phase: 'active'; connection: Connection }
  | { phase: 'connected_pending' }
  | { phase: 'cancelled' }
  | { phase: 'error'; reason: ConnectErrorReason };

export interface UseConnectResult {
  /** The current flow state — drive your button + picker + status off `phase`. */
  state: ConnectState;
  /**
   * Start the OAuth flow. MUST be called directly in the user's click handler
   * (no `await` before it): it opens the OAuth popup synchronously, so the
   * browser keeps it inside the user gesture. If the session isn't ready yet
   * (`phase` !== `idle`) it kicks `prepare()` and no-ops the popup, so the next
   * click works — prepare on intent (hover/focus) to make the first click open.
   */
  start: () => void;
  /**
   * Mint the Nango session ahead of the click. Idempotent (a no-op if a session
   * is already held or a mint is in flight). Only needed with
   * `prepareOnMount: false` — call it on the button's `onPointerEnter`/`onFocus`.
   */
  prepare: () => void;
  /** When `phase` is `picking`, activate the connection with the chosen account. */
  select: (externalAccountId: string) => void;
  /** Return to a fresh, ready state (re-mints the session) — e.g. a "try again". */
  reset: () => void;
}

interface HeldSession {
  readonly token: string;
  readonly providerConfigKey: string;
  readonly host: string;
}

/**
 * Embedded one-click connect — the customer's OWN button drives the whole OAuth
 * flow IN-APP (no redirect to our hosted page). `nango.auth()` opens a popup that
 * resolves in-page, then the account picker (for multi-account platforms) renders
 * inside the host app via `state.accounts` + `select()`. White-label, one click.
 *
 * The Plaid pattern: the Nango session is PRE-MINTED on mount (and on `reset`),
 * because `nango.auth()` opens its popup synchronously — minting in the click
 * would push `window.open` out of the user gesture and the browser would block
 * the popup. `start()` therefore fires `nango.auth()` with the already-held token
 * and zero `await` before it.
 *
 * The hosted `/connect` page remains the fallback for callers NOT using this SDK
 * (a plain link to `hosted_connect_url`); this hook never redirects.
 */
export function useConnect({
  profileId,
  platform,
  onConnected,
  onSuccess,
  onError,
  onCancelled,
  prepareOnMount = true,
}: UseConnectParams): UseConnectResult {
  const { client, queryClient } = usePostrun();
  const [state, setState] = useState<ConnectState>({ phase: 'preparing' });
  const [remintNonce, setRemintNonce] = useState(0);

  const sessionRef = useRef<HeldSession | null>(null);
  // The pending account pick — BOTH halves: `resolve` is called by `select()`,
  // `reject` by `abandonFlow()` so a machine awaiting the picker UNWINDS to a
  // typed outcome (never hangs/leaks) if the flow is torn down mid-pick.
  const pickRef = useRef<{
    resolve: (externalAccountId: string) => void;
    reject: (reason: Error) => void;
  } | null>(null);
  // One flow at a time. `inFlight` no-ops a re-entrant `start()` (a double click
  // must never open a second popup or race a second machine). `flowGen` is bumped
  // whenever a flow is abandoned, so a stale machine's terminal `.then` is
  // suppressed — no `setState`/`onConnected` after unmount or a profile switch.
  const inFlightRef = useRef(false);
  const flowGenRef = useRef(0);
  // A mint in flight (so `prepare()` is idempotent), and a generation bumped when
  // the held session goes stale (profile/platform/reset/unmount) so a late mint
  // can't apply its result onto a newer session.
  const preparingRef = useRef(false);
  const prepareGenRef = useRef(0);

  // Latest callbacks in refs so the memoised `start`/`prepare` needn't depend on
  // them (and re-create) when callers pass fresh arrows each render.
  const onConnectedRef = useRef(onConnected);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onCancelledRef = useRef(onCancelled);
  useEffect(() => {
    onConnectedRef.current = onConnected;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onCancelledRef.current = onCancelled;
  });

  // Tear down any in-flight flow: bump the generation (its terminal `.then` is
  // ignored) and REJECT a pending pick (a machine awaiting the picker unwinds
  // instead of leaking). Stable — touches refs only.
  const abandonFlow = useCallback(() => {
    flowGenRef.current += 1;
    inFlightRef.current = false;
    const pick = pickRef.current;
    pickRef.current = null;
    pick?.reject(new Error('connect flow abandoned'));
  }, []);

  // Mint the Nango session ahead of the click — `nango.auth()` opens its popup
  // synchronously, so an async mint in the click would break the gesture.
  // Idempotent: a held session or an in-flight mint short-circuits.
  const prepare = useCallback(() => {
    if (sessionRef.current || preparingRef.current) return;
    preparingRef.current = true;
    const gen = prepareGenRef.current;
    setState({ phase: 'preparing' });

    // A mint failure (request rejected, OR a 2xx with no body) — clear the
    // in-flight flag (so a retry is possible, never a stuck `preparing`) and
    // surface a typed `prepare_failed`. Distinct from `auth_failed`: the OAuth
    // popup never opened; we couldn't even get a session.
    const failPrepare = () => {
      preparingRef.current = false;
      setState({ phase: 'error', reason: 'prepare_failed' });
      onErrorRef.current?.('prepare_failed');
    };

    connectionsConnect({ client, path: { id: profileId }, body: { platform } })
      .then(({ data }) => {
        if (prepareGenRef.current !== gen) return;
        if (!data) {
          failPrepare();
          return;
        }
        preparingRef.current = false;
        sessionRef.current = {
          token: data.connect_session_token,
          providerConfigKey: data.provider_config_key,
          host: data.nango_host,
        };
        setState({ phase: 'idle' });
      })
      .catch(() => {
        if (prepareGenRef.current !== gen) return;
        failPrepare();
      });
  }, [client, profileId, platform]);

  // On mount and on every profile/platform/reset change: invalidate the held
  // session + any in-flight mint + any running flow, then (when `prepareOnMount`)
  // mint eagerly. With `prepareOnMount: false` we sit in `preparing` until the
  // host calls `prepare()` — the picker-on-intent path.
  useEffect(() => {
    prepareGenRef.current += 1;
    preparingRef.current = false;
    sessionRef.current = null;
    setState({ phase: 'preparing' });

    if (prepareOnMount) prepare();

    return () => {
      prepareGenRef.current += 1; // a late mint must not apply after teardown
      abandonFlow();
    };
  }, [profileId, platform, remintNonce, prepareOnMount, prepare, abandonFlow]);

  const start = useCallback(() => {
    const session = sessionRef.current;
    // Not minted yet (no prior intent): kick a mint so the NEXT click works. We
    // can't open the popup now (no token) and an async mint would break the
    // gesture — prepare on intent (hover/focus) to make the FIRST click open.
    if (!session) {
      prepare();
      return;
    }
    // A flow is already running — a re-entrant click must not open a 2nd popup.
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const gen = flowGenRef.current;
    const isCurrent = () => flowGenRef.current === gen;

    setState({ phase: 'connecting' });

    void runEmbeddedConnect({
      // Nango lives INSIDE `authorize` so a SYNCHRONOUS throw (invalid host /
      // missing token — the Nango SDK throws `AuthError` synchronously) becomes a
      // promise rejection that `grant()` maps to `auth_failed`, never an uncaught
      // throw escaping the click and wedging `inFlightRef`. Gesture timing still
      // holds: `authorize()` is invoked SYNCHRONOUSLY down the
      // start → runEmbeddedConnect → grant chain (each `await`'s operand is
      // evaluated before it suspends), so `nango.auth()`'s `window.open` fires
      // inside the user gesture, with no `await` before it.
      authorize: async () => {
        const nango = new Nango({
          host: session.host,
          connectSessionToken: session.token,
        });
        const result = await nango.auth(session.providerConfigKey, {
          detectClosedAuthWindow: true,
        });
        return result.connectionId;
      },
      chooseAccount: (accounts) =>
        new Promise<string>((resolve, reject) => {
          // Abandoned before reaching the picker (reset / unmount / profile
          // change while still connecting): reject so the machine unwinds, and
          // DON'T touch `pickRef`/state — a newer flow owns them now.
          if (!isCurrent()) {
            reject(new Error('connect flow abandoned'));
            return;
          }
          pickRef.current = { resolve, reject };
          setState({ phase: 'picking', accounts });
        }),
      listByNangoConnectionId: async (nangoConnectionId) => {
        const { data } = await connectionsListByProfile({
          client,
          path: { id: profileId },
          query: { nango_connection_id: nangoConnectionId },
        });
        return data?.data ?? [];
      },
      discoverAccounts: async (connectionId) => {
        const { data } = await connectionsListAccounts({
          client,
          path: { id: connectionId },
        });
        return data?.data ?? [];
      },
      selectAccount: async (connectionId, externalAccountId) => {
        const { data } = await connectionsSelect({
          client,
          path: { id: connectionId },
          body: { external_account_id: externalAccountId },
        });
        // A 2xx with no body shouldn't happen; treat it as a select failure
        // (the machine maps the throw to `select_failed`) rather than cast.
        if (!data) throw new Error('select returned no connection');
        return data;
      },
      pollIntervalMs: POLL_INTERVAL_MS,
      pollTimeoutMs: POLL_TIMEOUT_MS,
    }).then((outcome: ConnectOutcome) => {
      // Abandoned (reset / unmount / profile switch): a newer flow owns the
      // state and `pickRef` — leave both untouched and fire nothing.
      if (!isCurrent()) return;

      inFlightRef.current = false;
      pickRef.current = null;

      switch (outcome.status) {
        case 'active':
          setState({ phase: 'active', connection: outcome.connection });
          // The new connection exists — refetch any connections list so the host
          // sees it without wiring its own refetch.
          void queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
          onConnectedRef.current?.(outcome.connection);
          onSuccessRef.current?.();
          return;
        case 'connected_pending':
          setState({ phase: 'connected_pending' });
          // The grant landed; the row is written by the webhook (maybe not yet).
          // Refetch the list ONCE so it shows as soon as it's there; the host can
          // refetch again from its own layer if it's still pending.
          void queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
          onSuccessRef.current?.();
          return;
        case 'cancelled':
          setState({ phase: 'cancelled' });
          onCancelledRef.current?.();
          return;
        case 'error':
          setState({ phase: 'error', reason: outcome.reason });
          onErrorRef.current?.(outcome.reason);
          return;
      }
    });
  }, [client, profileId, prepare, queryClient]);

  const select = useCallback((externalAccountId: string) => {
    const pick = pickRef.current;
    if (!pick) return; // not in the picking phase

    pickRef.current = null;
    setState({ phase: 'connecting' }); // working again while the account binds
    pick.resolve(externalAccountId);
  }, []);

  const reset = useCallback(() => {
    // Bump the nonce → the prepare effect re-runs; its cleanup abandons any flow
    // and a fresh session is minted (or awaits `prepare()` if not on-mount).
    setRemintNonce((n) => n + 1);
  }, []);

  return { state, start, prepare, select, reset };
}

/**
 * List a profile's connected accounts. Pass a `filter` to narrow by `kind`
 * (`posting` = social, `ads`) or `status` — e.g. a composer fetches
 * `{ kind: 'posting' }` to show only the social accounts it can publish to.
 */
export function useConnections(profileId: string, filter?: ConnectionsFilter) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: connectionKeys.list(profileId, filter),
      queryFn: async () =>
        (
          await connectionsListByProfile({
            client,
            path: { id: profileId },
            query: filter,
          })
        ).data,
      enabled: Boolean(profileId),
    },
    queryClient,
  );
}

/** Retrieve a single connection by id. */
export function useConnection(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: connectionKeys.detail(id),
      queryFn: async () =>
        (await connectionsGet({ client, path: { id } })).data,
      enabled: Boolean(id),
    },
    queryClient,
  );
}

/** List the accounts discoverable on a pending connection (for selection). */
export function useDiscoverableAccounts(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: connectionKeys.accounts(id),
      queryFn: async () =>
        (await connectionsListAccounts({ client, path: { id } })).data,
      enabled: Boolean(id),
    },
    queryClient,
  );
}

/** Select an account on a pending connection, activating it. */
export function useSelectAccount() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async ({ id, ...body }: { id: string } & SelectAccountInput) =>
        (await connectionsSelect({ client, path: { id }, body })).data,
      onSuccess: (_result, { id }) => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
        queryClient.invalidateQueries({ queryKey: connectionKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: connectionKeys.accounts(id) });
      },
    },
    queryClient,
  );
}

/** Disconnect (delete) a connection by id. */
export function useDisconnect() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (id: string) =>
        (await connectionsDelete({ client, path: { id } })).data,
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
        queryClient.removeQueries({ queryKey: connectionKeys.detail(id) });
      },
    },
    queryClient,
  );
}

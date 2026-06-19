'use client';

import type { ReactNode } from 'react';

import type { ConnectablePlatform, Connection } from '@postrun/js';

import type { ConnectErrorReason } from './connect-machine';
import type { ConnectState, UseConnectParams } from './connections';
import { useConnect } from './connections';

/** The flow state + actions handed to your render-prop. */
export interface ConnectRenderApi {
  /** The current flow state — switch on `state.phase` to render your UI. */
  state: ConnectState;
  /**
   * Begin connecting. Call this DIRECTLY from your button's `onClick` — it opens
   * the OAuth popup synchronously, so don't `await` anything before it.
   */
  start: () => void;
  /**
   * Mint the session ahead of the click — only needed with
   * `prepareOnMount={false}` (a multi-platform picker): call it on the button's
   * `onPointerEnter`/`onFocus`.
   */
  prepare: () => void;
  /** When `state.phase === 'picking'`, activate with the chosen account id. */
  select: (externalAccountId: string) => void;
  /** Reset to a fresh, ready state (e.g. a "try again" after an error/cancel). */
  reset: () => void;
}

export interface ConnectProps {
  /** The profile to attach the new connection to. */
  profileId: string;
  /** The platform to connect (X, LinkedIn, Meta, …). */
  platform: ConnectablePlatform;
  /** Called once a connection is fully ACTIVE (an account is bound). */
  onConnected?: (connection: Connection) => void;
  /** Called when the attempt fails, with the typed reason. */
  onError?: (reason: ConnectErrorReason) => void;
  /** Called when the user closes the OAuth popup without finishing. */
  onCancelled?: () => void;
  /** Pre-mint on mount (default `true`). Set `false` for a multi-platform picker
   * and call `prepare()` on intent — see {@link UseConnectParams.prepareOnMount}. */
  prepareOnMount?: boolean;
  /** Render your own button + picker + status from the flow state. */
  children: (api: ConnectRenderApi) => ReactNode;
}

/**
 * Headless one-click connect. Wraps `useConnect` and hands you the flow state +
 * actions via a render-prop, so you own EVERY pixel (your button, your account
 * picker, your brand marks, your styling) while the SDK runs the embedded OAuth
 * popup + account binding — no redirect, no second click.
 *
 * ```tsx
 * <Connect profileId={id} platform="x" onConnected={refetch}>
 *   {({ state, start, select }) =>
 *     state.phase === 'picking' ? (
 *       <ul>
 *         {state.accounts.map((a) => (
 *           <li key={a.external_account_id}>
 *             <button onClick={() => select(a.external_account_id)}>
 *               {a.name ?? a.external_account_id}
 *             </button>
 *           </li>
 *         ))}
 *       </ul>
 *     ) : (
 *       <button onClick={start} disabled={state.phase !== 'idle'}>
 *         Connect X
 *       </button>
 *     )
 *   }
 * </Connect>
 * ```
 *
 * The trigger MUST call `start()` directly in the click (it opens the popup
 * synchronously). Mount `<Connect>` inside a `<PostrunProvider>`.
 */
export function Connect({
  profileId,
  platform,
  onConnected,
  onError,
  onCancelled,
  prepareOnMount,
  children,
}: ConnectProps): ReactNode {
  const api = useConnect({
    profileId,
    platform,
    onConnected,
    onError,
    onCancelled,
    prepareOnMount,
  });
  return children(api);
}

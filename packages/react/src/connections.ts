import { useMutation, useQuery } from '@tanstack/react-query';

import {
  connectionsConnect,
  connectionsDelete,
  connectionsGet,
  connectionsListAccounts,
  connectionsListByProfile,
  connectionsSelect,
  unwrap,
} from '@postrun/js';
import type { ConnectablePlatform, SelectAccountInput } from '@postrun/js';

import { usePostrun } from './context';
import { connectionKeys } from './keys';
import { navigate } from './navigate';

export interface ConnectParams {
  /** The profile to attach the new connection to. */
  profileId: string;
  /** The platform to connect (X, LinkedIn, Meta, …). */
  platform: ConnectablePlatform;
}

/**
 * Start a connect flow: mint a session and redirect the browser to the hosted
 * connect URL on postrun.ai, where the full white-labeled OAuth journey runs and
 * the user is returned to the host app. Bare-bones by design — the OAuth UI is
 * ours and hosted, so the host app just calls `mutate({ profileId, platform })`.
 * On return, the new connection appears via `useConnections`.
 */
export function useConnect() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async ({ profileId, platform }: ConnectParams) => {
        const session = unwrap(
          await connectionsConnect({
            client,
            path: { id: profileId },
            body: { platform },
          }),
        );
        navigate(session.connect_url);
        return session;
      },
    },
    queryClient,
  );
}

/** List a profile's connected accounts. */
export function useConnections(profileId: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: connectionKeys.list(profileId),
      queryFn: async () =>
        unwrap(
          await connectionsListByProfile({ client, path: { id: profileId } }),
        ),
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
        unwrap(await connectionsGet({ client, path: { id } })),
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
        unwrap(await connectionsListAccounts({ client, path: { id } })),
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
        unwrap(await connectionsSelect({ client, path: { id }, body })),
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
        unwrap(await connectionsDelete({ client, path: { id } })),
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
        queryClient.removeQueries({ queryKey: connectionKeys.detail(id) });
      },
    },
    queryClient,
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';

import { unwrap } from '@postrun/js';
import type { SelectAccountInput } from '@postrun/js';

import { usePostrun } from './context';
import { connectionKeys } from './keys';

/** List a profile's connected accounts. */
export function useConnections(profileId: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: connectionKeys.list(profileId),
      queryFn: async () =>
        unwrap(
          await client.GET('/profiles/{id}/connections', {
            params: { path: { id: profileId } },
          }),
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
        unwrap(
          await client.GET('/connections/{id}', { params: { path: { id } } }),
        ),
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
        unwrap(
          await client.GET('/connections/{id}/accounts', {
            params: { path: { id } },
          }),
        ),
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
        unwrap(
          await client.PATCH('/connections/{id}', {
            params: { path: { id } },
            body,
          }),
        ),
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
        unwrap(
          await client.DELETE('/connections/{id}', {
            params: { path: { id } },
          }),
        ),
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
        queryClient.removeQueries({ queryKey: connectionKeys.detail(id) });
      },
    },
    queryClient,
  );
}

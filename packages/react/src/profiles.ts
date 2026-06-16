import { useMutation, useQuery } from '@tanstack/react-query';

import {
  profilesCreate,
  profilesDelete,
  profilesGet,
  profilesList,
  profilesUpdate,
  unwrap,
} from '@postrun/js';
import type {
  CreateProfileInput,
  ListProfilesQuery,
  UpdateProfileInput,
} from '@postrun/js';

import { usePostrun } from './context';
import { profileKeys } from './keys';

/**
 * List the account's profiles (client/brand workspaces), filtered and paginated.
 * `data` is the typed `ProfileList` envelope — inferred straight from the SDK
 * call, never hand-typed. Caching, dedup, and revalidation come from the
 * provider's private QueryClient.
 */
export function useProfiles(query?: ListProfilesQuery) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: profileKeys.list(query),
      queryFn: async () =>
        unwrap(await profilesList({ client, query })),
    },
    queryClient,
  );
}

/** Retrieve a single profile by id. Disabled until an id is provided. */
export function useProfile(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: profileKeys.detail(id),
      queryFn: async () =>
        unwrap(await profilesGet({ client, path: { id } })),
      enabled: Boolean(id),
    },
    queryClient,
  );
}

/** Create a profile; on success the profile lists are refetched. */
export function useCreateProfile() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (body: CreateProfileInput) =>
        unwrap(await profilesCreate({ client, body })),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: profileKeys.lists() }),
    },
    queryClient,
  );
}

/** Update a profile by id; on success the lists and that profile are refreshed. */
export function useUpdateProfile() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async ({ id, ...body }: { id: string } & UpdateProfileInput) =>
        unwrap(await profilesUpdate({ client, path: { id }, body })),
      onSuccess: (_result, { id }) => {
        queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
      },
    },
    queryClient,
  );
}

/** Delete a profile by id; on success the lists refresh and its detail is dropped. */
export function useDeleteProfile() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (id: string) =>
        unwrap(await profilesDelete({ client, path: { id } })),
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
        queryClient.removeQueries({ queryKey: profileKeys.detail(id) });
      },
    },
    queryClient,
  );
}

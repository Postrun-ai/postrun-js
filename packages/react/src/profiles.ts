import { useMutation, useQuery } from '@tanstack/react-query';

import {
  profilesCreate,
  profilesDelete,
  profilesGet,
  profilesList,
  profilesUpdate,
} from '@postrun/js';
import type {
  CreateProfileInput,
  ListProfilesQuery,
  Profile,
  UpdateProfileInput,
} from '@postrun/js';

import { usePostrun } from './context';
import { useInfiniteList } from './infinite-list';
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
        (await profilesList({ client, query })).data,
    },
    queryClient,
  );
}

/**
 * List profiles with append-style ("load more") pagination. Returns
 * `{ items, loadMore, hasMore, isLoading, isLoadingMore, total }`: render
 * `items`, call `loadMore()` while `hasMore`. `pageSize` defaults to 20. Filters
 * match `useProfiles` minus paging, which the hook owns. Shares list-cache
 * invalidation with the other profile hooks.
 */
export function useProfilesInfinite(
  filters?: Omit<ListProfilesQuery, 'limit' | 'offset'>,
  options?: { pageSize?: number },
) {
  const { client } = usePostrun();
  return useInfiniteList<Profile>({
    queryKey: profileKeys.infinite(filters),
    limit: options?.pageSize,
    fetchPage: async ({ limit, offset }) =>
      (await profilesList({ client, query: { ...filters, limit, offset } }))
        .data,
  });
}

/** Retrieve a single profile by id. Disabled until an id is provided. */
export function useProfile(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: profileKeys.detail(id),
      queryFn: async () =>
        (await profilesGet({ client, path: { id } })).data,
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
        (await profilesCreate({ client, body })).data,
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
        (await profilesUpdate({ client, path: { id }, body })).data,
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
        (await profilesDelete({ client, path: { id } })).data,
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
        queryClient.removeQueries({ queryKey: profileKeys.detail(id) });
      },
    },
    queryClient,
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';

import { buildCreatePost, isPostPlatform, unwrap } from '@postrun/js';
import type {
  ComposePostInput,
  ListPostsQuery,
  UpdatePostInput,
} from '@postrun/js';

import { useConnections } from './connections';
import { usePostrun } from './context';
import { postKeys } from './keys';

/**
 * List posts — the calendar/queue data, filtered (profile_id / external_id /
 * metadata) and paginated. `data` is the typed `PostList` envelope, with each
 * post's derived status (draft / scheduled / publishing / published / failed).
 *
 * Reads only for now: `useCreatePost` / `useUpdatePost` land once the compose
 * (variant) write contract is finalized.
 */
export function usePosts(query?: ListPostsQuery) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: postKeys.list(query),
      queryFn: async () =>
        unwrap(await client.GET('/posts', { params: { query } })),
    },
    queryClient,
  );
}

/** Retrieve a single post by id (its variants, schedule, and live status). */
export function usePost(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: postKeys.detail(id),
      queryFn: async () =>
        unwrap(await client.GET('/posts/{id}', { params: { path: { id } } })),
      enabled: Boolean(id),
    },
    queryClient,
  );
}

/**
 * Compose and create a post. Resolves the profile's connections, builds the full
 * variant set from `{ content, channels }` (per the `buildCreatePost` rules), and
 * sends it — the customer never assembles variants or passes a `connection_id`.
 * `connectedChannels` is the set of posting platforms this profile can reach.
 */
export function useCreatePost(profileId: string) {
  const { client, queryClient } = usePostrun();
  const connections = useConnections(profileId);
  const connected = connections.data?.data ?? [];

  const mutation = useMutation(
    {
      mutationFn: async (input: Omit<ComposePostInput, 'profileId'>) =>
        unwrap(
          await client.POST('/posts', {
            body: buildCreatePost({ ...input, profileId }, connected),
          }),
        ),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: postKeys.lists() }),
    },
    queryClient,
  );

  return {
    create: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
    connectedChannels: connected
      .map((connection) => connection.platform)
      .filter(isPostPlatform),
  };
}

/**
 * Update a post by id. Pass a light edit directly (`{ schedule_at }`,
 * `{ tags }`, …) or a rebuilt body from `buildUpdatePost(input, connections)`
 * for content edits (the API's PATCH replaces the variant set).
 */
export function useUpdatePost(postId: string) {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (body: UpdatePostInput) =>
        unwrap(
          await client.PATCH('/posts/{id}', {
            params: { path: { id: postId } },
            body,
          }),
        ),
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        queryClient.setQueryData(postKeys.detail(postId), result);
      },
    },
    queryClient,
  );
}

/** Delete a post by id; on success the lists refresh and its detail is dropped. */
export function useDeletePost() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (id: string) =>
        unwrap(await client.DELETE('/posts/{id}', { params: { path: { id } } })),
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      },
    },
    queryClient,
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';

import { unwrap } from '@postrun/js';
import type { ListPostsQuery } from '@postrun/js';

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

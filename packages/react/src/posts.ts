import { useMutation, useQuery } from '@tanstack/react-query';

import {
  buildCreatePost,
  isPostPlatform,
  postsCreate,
  postsDelete,
  postsGet,
  postsList,
  postsUpdate,
} from '@postrun/js';
import type {
  ComposePostInput,
  ListPostsQuery,
  Post,
  UpdatePostInput,
} from '@postrun/js';

/**
 * The calendar/queue filter surface — a date window over `schedule_at` plus a
 * derived-status multi-select, scoped to an optional profile. Picked straight
 * from the generated `ListPostsQuery` contract (no hand-typed shapes), so it
 * can never drift from the API. Pagination still rides through via `usePosts`.
 */
export type CalendarFilters = Pick<
  ListPostsQuery,
  'profile_id' | 'scheduled_after' | 'scheduled_before' | 'status'
>;

import { useConnections } from './connections';
import { usePostrun } from './context';
import { useInfiniteList } from './infinite-list';
import { postKeys } from './keys';

/**
 * A post's status as it appears on the RESPONSE (not the list `status` filter) —
 * the value a live poll actually inspects. Sourced from `Post['status']` so the
 * predicate below is type-correct against `query.state.data?.status`, and a
 * future contract change to the status set surfaces at compile time here.
 */
type PostResponseStatus = Post['status'];

/**
 * Statuses that are still moving on their own and warrant polling: `scheduled`
 * (fires at its time with no user action → must be caught transitioning) and
 * `publishing` (mid-flight by definition). Everything else is terminal and stops
 * the poll: `published` / `failed` (end states), `partially_published` (no
 * further automatic movement), and `draft` (only an explicit update — which
 * already invalidates lists — moves it). Modelling in-flight as the small set
 * means any future status defaults to "terminal/stop" — the safe, no-runaway
 * default.
 */
const IN_FLIGHT: ReadonlySet<PostResponseStatus> = new Set([
  'scheduled',
  'publishing',
]);

const isLivePostStatus = (status: PostResponseStatus): boolean =>
  IN_FLIGHT.has(status);

/** Per-hook live-poll control: live is on by default; `{ live: false }` opts out. */
export interface LiveOptions {
  /** Auto-poll while a post is in-flight (default `true`). Set `false` for one-shot. */
  live?: boolean;
}

/**
 * List posts — the calendar/queue data, filtered (profile_id / external_id /
 * metadata) and paginated. `data` is the typed `PostList` envelope, with each
 * post's derived status (draft / scheduled / publishing / published / failed).
 */
export function usePosts(query?: ListPostsQuery) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: postKeys.list(query),
      queryFn: async () =>
        (await postsList({ client, query })).data,
    },
    queryClient,
  );
}

/**
 * List posts with append-style ("load more") pagination — the calendar/queue
 * feed. Returns `{ items, loadMore, hasMore, isLoading, isLoadingMore, total }`:
 * render `items`, call `loadMore()` (on a button or scroll end) while `hasMore`.
 * `pageSize` defaults to 20. Filters are the same as `usePosts` minus paging,
 * which the hook owns. Shares list-cache invalidation with the other post hooks,
 * so a create/update/delete refreshes it automatically.
 */
export function usePostsInfinite(
  filters?: Omit<ListPostsQuery, 'limit' | 'offset'>,
  options?: { pageSize?: number },
) {
  const { client } = usePostrun();
  return useInfiniteList<Post>({
    queryKey: postKeys.infinite(filters),
    limit: options?.pageSize,
    fetchPage: async ({ limit, offset }) =>
      (await postsList({ client, query: { ...filters, limit, offset } })).data,
  });
}

/**
 * Calendar/queue view — list posts in a `schedule_at` date window, optionally
 * narrowed to a profile and to one or more derived statuses (e.g. only
 * `scheduled` + `failed`). Forwards the date-range + multi-status filters (and
 * any `limit`/`offset`) to the generated `postsList` and returns the same typed
 * `PostList` envelope. It shares the `postKeys.list(filters)` cache identity with
 * `usePosts` but owns its own self-terminating poll: while ANY post in the
 * window is in-flight it refetches (5s — a list is heavier than one detail), and
 * stops once every item is terminal (or the window is empty). `live` is a
 * separate option, never mixed into the API filter object; default-on, opt out
 * with `{ live: false }`.
 */
export function useCalendar(
  filters?: CalendarFilters & Pick<ListPostsQuery, 'limit' | 'offset'>,
  options?: LiveOptions,
) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: postKeys.list(filters),
      queryFn: async () => (await postsList({ client, query: filters })).data,
      refetchInterval: (query) => {
        if (options?.live === false) return false;
        const posts = query.state.data?.data ?? [];
        return posts.some((post) => isLivePostStatus(post.status)) ? 5000 : false;
      },
    },
    queryClient,
  );
}

/**
 * Retrieve a single post by id (its variants, schedule, and derived status).
 * Auto-polls (2s) while the post is in-flight (`scheduled` / `publishing`) and
 * stops once it reaches a terminal status — so a scheduled post visibly
 * transitions with no manual refetch. `live` is on by default; pass
 * `{ live: false }` to force a one-shot.
 */
export function usePost(id: string, options?: LiveOptions) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: postKeys.detail(id),
      queryFn: async () =>
        (await postsGet({ client, path: { id } })).data,
      enabled: Boolean(id),
      refetchInterval: (query) => {
        if (options?.live === false) return false;
        const status = query.state.data?.status;
        return status && isLivePostStatus(status) ? 2000 : false;
      },
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
        (
          await postsCreate({
            client,
            body: buildCreatePost({ ...input, profileId }, connected),
          })
        ).data,
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
    // The profile's connections must load before `create` can resolve a channel;
    // gate on this so a call during loading isn't mislabeled "not connected".
    isReady: connections.isSuccess,
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
        (await postsUpdate({ client, path: { id: postId }, body })).data,
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
        (await postsDelete({ client, path: { id } })).data,
      onSuccess: (_result, id) => {
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      },
    },
    queryClient,
  );
}

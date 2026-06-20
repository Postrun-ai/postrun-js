import type {
  ConnectionKind,
  ConnectionStatus,
  ListMediaQuery,
  ListPostsQuery,
  ListProfilesQuery,
} from '@postrun/js';

/** The connection-list filter that keys the cache (social/ads + lifecycle). */
export interface ConnectionsFilter {
  kind?: ConnectionKind;
  status?: ConnectionStatus;
}

/** Root namespace so our cache never collides with the host app's own queries. */
const ROOT = 'postrun';

/**
 * Query-key factory for profiles. Hierarchical so a mutation can invalidate at
 * the right granularity: `lists()` after a create, `detail(id)` after an update.
 */
export const profileKeys = {
  all: [ROOT, 'profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (query?: ListProfilesQuery) =>
    [...profileKeys.lists(), query ?? {}] as const,
  // Nested under lists() so a create/update/delete invalidating lists() also
  // refreshes the infinite cache; distinct tail so the two cache shapes (a
  // single Page vs accumulated pages) never collide on one key. The filter omits
  // limit/offset — the infinite hook owns pagination, so they never key the cache.
  infinite: (query?: Omit<ListProfilesQuery, 'limit' | 'offset'>) =>
    [...profileKeys.lists(), 'infinite', query ?? {}] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
};

/** Query-key factory for posts (list filtered by query; detail by id). */
export const postKeys = {
  all: [ROOT, 'posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (query?: ListPostsQuery) => [...postKeys.lists(), query ?? {}] as const,
  // Nested under lists() so a create/update/delete invalidating lists() also
  // refreshes the infinite cache; distinct tail so the two cache shapes (a
  // single Page vs accumulated pages) never collide on one key. The filter omits
  // limit/offset — the infinite hook owns pagination, so they never key the cache.
  infinite: (query?: Omit<ListPostsQuery, 'limit' | 'offset'>) =>
    [...postKeys.lists(), 'infinite', query ?? {}] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

/** Query-key factory for media assets (list filtered by query; detail by id). */
export const mediaKeys = {
  all: [ROOT, 'media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (query?: ListMediaQuery) => [...mediaKeys.lists(), query ?? {}] as const,
  // Nested under lists() so an upload/update/delete invalidating lists() also
  // refreshes the infinite cache; distinct tail so the two cache shapes (a
  // single Page vs accumulated pages) never collide on one key. The filter omits
  // limit/offset — the infinite hook owns pagination, so they never key the cache.
  infinite: (query?: Omit<ListMediaQuery, 'limit' | 'offset'>) =>
    [...mediaKeys.lists(), 'infinite', query ?? {}] as const,
  details: () => [...mediaKeys.all, 'detail'] as const,
  detail: (id: string) => [...mediaKeys.details(), id] as const,
};

/** Query-key factory for connections (lists keyed by owning profile). */
export const connectionKeys = {
  all: [ROOT, 'connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (profileId: string, filter?: ConnectionsFilter) =>
    [...connectionKeys.lists(), profileId, filter ?? {}] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...connectionKeys.details(), id] as const,
  accounts: (id: string) => [...connectionKeys.all, 'accounts', id] as const,
};

/** Query-key factory for TikTok reads (creator info keyed by connection id). */
export const tiktokKeys = {
  all: [ROOT, 'tiktok'] as const,
  creatorInfo: (connectionId: string) =>
    [...tiktokKeys.all, 'creator-info', connectionId] as const,
};

import type { ListProfilesQuery } from '@postrun/js';

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
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
};

/** Query-key factory for connections (lists keyed by owning profile). */
export const connectionKeys = {
  all: [ROOT, 'connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (profileId: string) => [...connectionKeys.lists(), profileId] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...connectionKeys.details(), id] as const,
  accounts: (id: string) => [...connectionKeys.all, 'accounts', id] as const,
};

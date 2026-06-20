import { useQuery } from '@tanstack/react-query';

import { tiktokCreatorInfo } from '@postrun/js';
import type { TikTokCreatorInfo } from '@postrun/js';

import { usePostrun } from './context';
import { tiktokKeys } from './keys';

export type { TikTokCreatorInfo };

/**
 * Fetch a TikTok connection's live creator info — the data TikTok's Content
 * Posting policy REQUIRES the publishing UI to render before a post: the
 * `creator` (nickname + avatar), the `privacy_options` to offer (with NO default
 * selected — render each with `tiktokPrivacyLabel`), the positive `interaction`
 * (allowed) flags for the Comment/Duet/Stitch toggles, and the per-account video
 * length cap (`max_video_duration_sec`).
 *
 * Pass the id of the TikTok connection the composer is posting through, or `null`
 * when none is selected yet — the query is DISABLED while `connectionId` is null
 * (no request fires). The host knows which connection is TikTok (it picked it), so
 * only call this for a TikTok connection; a non-TikTok id surfaces a 404 as
 * `error` (the API never leaks the platform). Returns the standard react-query
 * result — read `data` (the creator info), `isLoading`, and `error`.
 */
export function useTikTokCreatorInfo(connectionId: string | null) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      // `connectionId ?? ''` only ever keys the cache when the query is enabled
      // (a non-null id), so the empty fallback is never used to fetch.
      queryKey: tiktokKeys.creatorInfo(connectionId ?? ''),
      queryFn: async () =>
        (await tiktokCreatorInfo({ client, path: { id: connectionId ?? '' } }))
          .data,
      enabled: connectionId !== null,
    },
    queryClient,
  );
}

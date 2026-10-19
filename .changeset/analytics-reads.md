---
"@postrun/js": minor
---

Add post and account analytics reads (TikTok post metrics and account metrics).

- `postsGetAnalytics({ client, path: { id } })` → `GET /v1/posts/{id}/analytics` returns `PostAnalytics`: one `PostVariantAnalytics` per variant, read live from the platform (`TikTokPostMetrics` for TikTok variants; otherwise an `error` of `analytics_not_supported` or `analytics_no_data`).
- `connectionsGetAnalytics({ client, path: { id } })` → `GET /v1/connections/{id}/analytics` returns `ConnectionAnalytics`: account totals plus up to 60 daily `TikTokAccountDay` rows (`TikTokAccountMetrics`).
- TanStack Query options `postsGetAnalyticsOptions` / `connectionsGetAnalyticsOptions` on `@postrun/js/query` (and via `usePostrunQuery` in `@postrun/react`).
- New `PostrunErrorCode` members: `tiktok_analytics_unavailable`, `analytics_not_supported`, `analytics_no_data`.

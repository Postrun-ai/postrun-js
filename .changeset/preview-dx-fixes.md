---
'@postrun/react': minor
---

Composable post previews. Every preview is now a `Root` plus parts you can
reorder, drop, or replace: `XPreviewRoot` / `LinkedInPreviewRoot` /
`InstagramPreviewRoot` / `TikTokPreviewRoot`, their `Header` / `Body` / `Content` /
`Actions` parts, and a data hook per network (`useXPreview()`, …) so your own parts
render from the same data. `<XPostPreview>` and the other ready-made previews keep
their props and output; each is now its Root composing the default parts.

Fixes. `XPostPreview` no longer crashes the page when a media URL is
relative (react-tweet parsed every src with `new URL()`). The Instagram feed card
shows Instagram's loading grey instead of a black flash while media loads.
`MediaResource` is now exported from `@postrun/react` for typing a preview's
`media` prop. A preview's `variant` now needs only what the preview reads
(`platform`, `body`, `media`, and optional `settings`), so you no longer pass
`connection_id` or LinkedIn's `visibility`, and you can spread new draft media
into a fetched variant. The README documents the post previews and how
`theme="auto"` behaves.
Caption folds on Instagram, TikTok, and LinkedIn now cut at a whole word with
"… more" inline at the end of the last line (LinkedIn at three lines, the others
at two), so a caption cut after a full stop no longer shows "order.…".

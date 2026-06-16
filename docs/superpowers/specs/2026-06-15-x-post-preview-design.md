# `<XPostPreview>` — design spec

**Date:** 2026-06-15
**Package:** `@postrun/react`
**Status:** Approved for planning

## Goal

Ship a React component that turns a Postrun **X (Twitter) post variant** into a
faithful, pixel-accurate preview of what the end-user will see on X — so a
customer building a Hootsuite/Postiz-style app gets the preview **for free** and
spends their time on their own product, not on reverse-engineering X's card.

The promise: **the customer passes our schema, untouched, and gets the preview.**
The only inputs beyond the schema are the two things the schema genuinely cannot
contain (see §3).

## Principle: buy, don't build

Per the repo's LOCKED DX rule (`AGENTS.md` — "reach for a battle-tested package
when it makes the SDK nicer to use"), we do **not** hand-write the X card. We
render with **[`react-tweet`](https://github.com/vercel/react-tweet)** (Vercel,
**MIT** — verified against the repo `LICENSE`, compatible with our Apache-2.0
SDK). It provides the pixel-accurate Twitter card, the verified badge, media
grids, quoted cards, and **light/dark theming via CSS variables** out of the box.

We own exactly one thing: a **pure mapper** from our post schema to
`react-tweet`'s view model. Text entity extraction (links/hashtags/mentions)
reuses **`twitter-text`** — the same library the API already uses for X weighting
— so no hand-rolled regex.

## 1. Component API

```tsx
import { XPostPreview } from '@postrun/react'

<XPostPreview
  variant={post.variants[0]}     // our XVariant — the ONLY schema input, no wiring
  author={{                       // identity X doesn't store on our connection
    name: 'Acme Studio',
    handle: 'acmestudio',         // without the leading '@'
    avatarUrl: '/acme.png',       // optional — falls back to react-tweet default
    verified: true,               // optional, default false
  }}
  media={resolved}                // resolved pixels; see XPreviewMedia below
  quotedTweet={quoted}            // optional; only when settings.quote_tweet_id is set
  theme="auto"                    // 'light' | 'dark' | 'auto'  (default 'auto')
  className={undefined}           // optional passthrough on the theme wrapper
/>
```

### Input types (hand-authored — these describe customer data, not API shapes)

> Note on the "no hand-written request/response shapes" rule: that rule governs
> shapes **sourced from our OpenAPI contract**. `author`/`media`/`quotedTweet`
> are NOT contract shapes — they are customer-supplied presentation data the API
> never returns. `variant` IS a contract shape and is derived from the generated
> discriminated union (`PostVariantResource`/`CreatePostVariant`, narrowed to X).

```ts
// packages/react/src/preview/types.ts  (shared across future platforms)
export interface XPreviewAuthor {
  name: string
  handle: string            // no leading '@'
  avatarUrl?: string
  verified?: boolean        // default false
}

export interface XPreviewMedia {
  kind: 'image' | 'video' | 'gif'
  url?: string              // processed MediaResource.per_platform.x.url
  file?: File               // compose-time blob (pre-upload); we make an object URL
  width?: number
  height?: number
  alt?: string              // falls back to the variant media's alt_text_override
  posterUrl?: string        // video poster frame (optional)
}

export interface XPreviewQuotedTweet {
  author: XPreviewAuthor
  body?: string
  media?: XPreviewMedia[]
}
```

`media` order is the variant's `media[]` order (the carousel/grid order). Each
entry resolves to a URL: `url` when present, else `URL.createObjectURL(file)`
(revoked on unmount). At least one of `url`/`file` must be set per entry to
render pixels; an entry with neither is skipped (no throw).

## 2. Variant input

`variant` is the X member of our post-variant union, narrowed to
`platform: 'x'`. It carries everything the preview needs from our side:

- `body` → tweet text (entity-highlighted)
- `post_type` (`text` | `single_image` | `multi_image` | `video`) → media layout
- `media[]` (`med_…` refs + `alt_text_override`) → paired positionally with the
  `media` prop's resolved pixels
- `settings.quote_tweet_id` → render a quoted card (filled from `quotedTweet`, see §4)
- `settings.reply.in_reply_to_tweet_id` → render the "Replying to …" context line

Fields with no visual surface in a preview (e.g. `reply_settings`, `geo`,
`for_super_followers_only`, `community_id`, `card_uri`) are accepted and ignored
by the preview — they don't change what the card looks like.

## 3. Why `author` and `media` are separate props

Verified while exploring the API:

- **Author identity is not in our schema.** The connection resource
  (`@kit/profiles` `ConnectionResource`) exposes only `external_account_name` (a
  cached display name) — **no avatar, no `@handle`, no verified flag.** A faithful
  X header needs all of those, so the customer (who has them from their own
  account management) passes them.
- **Pixels are not in the variant.** The variant holds `med_…` ids. Real pixels
  live on the processed `MediaResource.per_platform.x.url`, and at compose time —
  before upload — the customer only has a local `File`. So `media` carries the
  resolved URL or the `File`.

This keeps the component **zero-fetch and zero-crash**: it renders purely from
props and never makes a network call.

## 4. Quoted tweet handling

`settings.quote_tweet_id` is an opaque id — our schema has no quoted text/author.
v1 behavior:

- If `quotedTweet` prop is provided → render the nested quoted card from it
  (reusing `react-tweet`'s `QuotedTweet`).
- If `quote_tweet_id` is set but `quotedTweet` is absent → render a minimal
  "Quoted post" placeholder card (honest, no fetch).
- If neither → no quoted card.

## 5. Architecture

```
packages/react/src/preview/
  types.ts              XPreviewAuthor, XPreviewMedia, XPreviewQuotedTweet
  x/
    to-tweet.ts         (variant, author, media, quoted?) → react-tweet `Tweet`   [pure]
    entities.ts         body → TweetEntities via twitter-text                      [pure]
    XPostPreview.tsx     'use client'; assembles tweet, renders react-tweet + theme
    index.ts            re-exports
```

- **`to-tweet.ts`** is the brain. It builds a **complete `Tweet` object literal**
  with honest defaults for the fields the components read but a draft has no value
  for (`favorite_count: 0`, `conversation_count: 0`, `isEdited: false`,
  `created_at` = a fixed/empty value not shown by our chrome, etc.). **No casts** —
  every required field is filled with a real value. Maps:
  - `post_type` + resolved `media` → `mediaDetails[]` (+ `photos`/`video`)
  - `body` → `text` + `entities` (from `entities.ts`)
  - `quote_tweet_id`/`quotedTweet` → `quoted_tweet`
  - `settings.reply` → `in_reply_to_screen_name`
- **`entities.ts`** runs `twitter-text` to produce hashtag/mention/url entities
  with correct character indices, so links highlight exactly as on X.
- **`XPostPreview.tsx`** renders, composing `react-tweet`'s theme components:
  `TweetContainer → TweetHeader → TweetInReplyTo? → TweetBody → TweetMedia? →
  QuotedTweet?` plus an **authentic static footer** (action icons, **no counts,
  no fake date**). Wrapped in a `<div data-theme={...}>` for light/dark. The
  footer is rendered without fabricated metrics; if `react-tweet`'s `TweetActions`
  renders cleanly with no numbers it is reused, otherwise a 4-icon row reusing
  `react-tweet`'s CSS variables is used (decided at build against the real
  component — an implementation detail, not a design fork).

## 6. Theming (light / dark)

Free from `react-tweet`: it themes via `data-theme="light|dark"` on a parent and
CSS variables on `.react-tweet-theme`. The `theme` prop:

- `'light'` / `'dark'` → set `data-theme` explicitly.
- `'auto'` (default) → no `data-theme`; inherits the host's `prefers-color-scheme`
  / ancestor `data-theme`, matching how `react-tweet` behaves by default.

## 7. Scope

**In v1:** text · single image · multi-image grid · video (poster + play
affordance) · links/hashtags/mentions · **quote tweet** · **reply context** ·
authentic static footer (no numbers) · light + dark.

**Deferred:** poll rendering (custom block), Premium long-form visual treatment,
and the other platforms (LinkedIn / Facebook Page / Instagram) — each gets its
own spec, reusing `preview/types.ts`.

## 8. Errors & empty states

Pure render, no network, **never throws** (a preview must not crash a compose
screen):

- Missing `avatarUrl` → `react-tweet` default avatar.
- Empty `body` with media → media-only card.
- Empty `body` and no media → header + empty body (valid draft state).
- `media` entry with neither `url` nor `file` → skipped.
- `quote_tweet_id` set, no `quotedTweet` → placeholder quoted card.

## 9. Dependencies

Add to `@postrun/react`:

- `react-tweet` (MIT) — the card renderer.
- `twitter-text` (Apache-2.0) — entity extraction (already trusted by the API).

Verify `react-tweet`'s CSS delivery at build (auto-injected by its components vs.
a stylesheet we must import/re-export); if an import is required, re-export it
from the package entry and document the one line. Confirm `'use client'` + SSR
behavior (the component uses `URL.createObjectURL` only in an effect/browser
guard so SSR is safe).

## 10. Testing (TDD, red → green → refactor)

- **`to-tweet.test.ts`** (load-bearing, DB-free, exhaustive):
  - each `post_type` → correct media layout / counts
  - `body` → entities (link, hashtag, mention indices)
  - `quote_tweet_id` + `quotedTweet` → `quoted_tweet`; id without prop → placeholder
  - `settings.reply` → `in_reply_to_screen_name`
  - `File` vs `url` media resolution; mismatched/empty entries skipped
  - resulting object is a valid `Tweet` (type-level + key fields asserted)
- **`XPostPreview.test.tsx`** (RTL smoke):
  - renders author name, `@handle`, body text
  - `theme="dark"` → wrapper has `data-theme="dark"`
  - `quotedTweet` → nested quoted card present
  - no fabricated counts/date in the footer

**Done** = `pnpm typecheck && pnpm build && pnpm test` all green, no casts, files
small and focused.

## Open follow-ups (not v1)

- Poll preview block.
- Shared `<PostPreview>` dispatcher that picks the platform component from
  `variant.platform` once ≥2 platforms exist.

# TikTok preview — case matrix (build reference)

> What the SDK `<TikTokPostPreview>` must cover, derived from **our own Post
> object** (not invented), cross-checked against TikTok's Required-UX spec.
> Each case cites the requirement number from the build spec (MUST #1–#10 / SHOULD).

## The data we render from (single source of truth)

**Variant** — `TikTokPostVariant = Extract<PostVariantInput, { platform: 'tiktok' }>`
(needs adding to `@postrun/js`; X/LinkedIn already have theirs):

| Field | Type | Notes |
| --- | --- | --- |
| `platform` | `'tiktok'` | discriminant |
| `post_type` | `'video' \| 'single_image' \| 'carousel'` | drives media render + which settings are legal |
| `body` | `string?` | **title** for video (≤2200), **description** for photo (≤4000). We have NO separate photo `title` field — body IS the description. |
| `media` | `{ media_id, crop_box?, alt_text_override? }[]` | ordered; count rules: video=1, single_image=1, carousel=2–35 |
| `settings.privacy_level` | `PUBLIC_TO_EVERYONE \| MUTUAL_FOLLOW_FRIENDS \| FOLLOWER_OF_CREATOR \| SELF_ONLY` (optional) | NO default — absent = "must choose" |
| `settings.disable_comment` | `boolean?` | `true` = disabled (we invert allow→disable) |
| `settings.disable_duet` | `boolean?` | **video-only** |
| `settings.disable_stitch` | `boolean?` | **video-only** |
| `settings.video_cover_timestamp_ms` | `number?` | video-only |
| `settings.photo_cover_index` | `number?` | photo-only |
| `settings.auto_add_music` | `boolean?` | photo-only |
| `settings.brand_content_toggle` | `boolean?` | paid partnership; **incompatible w/ SELF_ONLY** |
| `settings.brand_organic_toggle` | `boolean?` | own-brand promotion |
| `settings.is_aigc` | `boolean?` | **video-only** AIGC disclosure |

**Creator info** — `TikTokCreatorInfo` (from `useTikTokCreatorInfo(connId)`):
`creator{nickname, username, avatar_url|null}` · `privacy_options[]` (typed subset) ·
`interaction{comment,duet,stitch}` (positive = ALLOWED) · `max_video_duration_sec`.

**Media pixels** — resolved from the SDK `MediaResource`, never a local `File`:
a read variant carries each asset inline (`media[].media`); a compose draft passes
uploaded assets via `media: MediaResource[]`, matched by `media_id`.
`resolveVariantMedia(refs, 'tiktok', media)` picks `per_platform.tiktok.url` and
returns `ResolvedMedia` with an honest `state: 'ready' | 'processing'`.

**Verbatim strings already authored** (reuse, don't re-string): see
`apps/web/.../_lib/tiktok-options.ts` — `TIKTOK_PROCESSING_NOTICE`,
`TIKTOK_MUSIC_CONFIRMATION_URL`, `TIKTOK_BRANDED_CONTENT_POLICY_URL`,
`commercialLabelNotice()`, `audienceUnselected()`, `commercialDisclosureIncomplete()`,
`interactionRows()`. These are generic → they should move into `@postrun/js`.

---

## A. Media render — MUST #1 (+ #3 no watermark)

1. **Video** (`post_type:'video'`, 1 video) → video player/poster. Never a photo carousel.
2. **Single image** (`single_image`, 1 image) → one image, no carousel chrome, no video player.
3. **Carousel** (`carousel`, 2–35 images) → full image carousel (slider + dots), like the real photo post.
4. **GIF** media `kind:'gif'` on a photo post → render as image (TikTok photo = images).
5. **Pixels not yet resolved** (`url` null + only a `media_id`, asset still `uploading`/`processing`) → skeleton/placeholder tile, never a broken `<img>`.
6. **Compose-time upload** (asset still processing) → `resolveVariantMedia` returns `state:'processing'` → "Processing media…" tile (no local `File` path).
7. **No media** (draft, `media:[]`) → empty media placeholder; Post disabled (TikTok requires media).
8. **Count mismatch** (carousel w/ 1, video w/ 0/2) → render what exists, mark invalid, Post disabled.
9. **#3 no watermark / unaltered**: media rendered clean — NO burnt-in logo, NO Postrun mark, NO fake-engagement overlay baked onto the pixels (Postiz burns icons over the frame; we must not — the audit checks "no watermark added"). Chrome (handle, rail) is preview-only overlay, never composited into media.

## B. Caption / title — MUST #2 (editable to the moment of posting)

10. **Video title** present, ≤2200 → editable field; counter vs **2200**.
11. **Photo description** present, ≤4000 → editable field; counter vs **4000**.
12. **Over cap** → counter over-limit styling; Post disabled (`body_too_long`).
13. **Empty body** → allowed (body optional; media is the content); show placeholder text.
14. **Editable in the preview** (not locked) → two-way bound; `onCaptionChange` fires; selecting the photo-vs-video cap by `post_type`.
15. **Hashtags / @mentions** in body → rendered/highlighted (SHOULD).
16. **Clarify**: the spec's "photo title ≤ 90 runes" is an adapter field we don't expose — our body maps to the 4000-char description. Don't enforce 90 (false reject). Note in UI copy if a title field is ever added.

## C. Creator identity — MUST #4

17. `creator.nickname` + `avatar_url` present → show name + avatar (+ `@username`).
18. `avatar_url` null → neutral placeholder avatar (don't break layout).
19. Creator-info **loading** → skeleton header + disabled Post.
20. Creator-info **error / unavailable** → can't safely render options; show error state, Post disabled (we must not guess privacy/interaction).

## D. Audience / privacy — MUST #5

21. `privacy_level` chosen → show selected audience via `tiktokPrivacyLabel`.
22. `privacy_level` undefined → **no default**; show "choose who can view" required prompt (`TIKTOK_AUDIENCE_REQUIRED_HINT`); Post disabled (`audienceUnselected`).
23. **Unaudited app** → posts forced `SELF_ONLY`; `privacy_options` may be just `[SELF_ONLY]`. Surface the constraint honestly.
24. **Branded content on** → `SELF_ONLY` removed from offered options; a previously-private selection is cleared (re-pick).

## E. Interaction settings — MUST #6

25. **Video** → Comment / Duet / Stitch rows; each reflects `allow_*`; **none default-on**.
26. Creator forbids one (`interaction.<k> === false`) → that row **disabled + forced off**, greyed.
27. **Photo** → only **Comment** shown (Duet/Stitch hidden — TikTok mandate + API rejects them on photo).
28. Render "as they'll apply" → show the on/off state each will publish with.

## F. Commercial-content label — MUST #7 (verbatim)

29. No disclosure → no label shown.
30. **Your Brand only** → `"Your photo/video will be labeled as 'Promotional content'"`.
31. **Branded Content** (alone or with Your Brand) → `"Your photo/video will be labeled as 'Paid partnership'"`.
32. Disclosure on, neither chosen → incomplete; show `TIKTOK_DISCLOSURE_REQUIRED_HINT`; Post disabled.
33. Branded + `SELF_ONLY` → conflict (handled by E24; never reachable at Post).

## G. Consent declaration — MUST #8 (DIRECTLY above Post, verbatim, links)

34. **Default**: `"By posting, you agree to TikTok's Music Usage Confirmation"` (Music link).
35. **Branded**: `"By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation."` (both links).
36. Position: rendered immediately above the Post button, no element between.

## H. Explicit-consent gate — MUST #9

37. Post **click IS the consent** — `onPost` fires only on explicit user click. No auto-post, no publish on mount/effect, nothing sent before the click.
38. **Post disabled until valid** = AND of: media-count valid · body ≤ cap · privacy chosen · disclosure complete · (branded ⇒ not private) · creator-info loaded. (SHOULD: disabled-until-valid.)

## I. Processing notice — MUST #10

39. Show `TIKTOK_PROCESSING_NOTICE` ("…may take a few minutes to process and appear on your profile") at/near publish.

## J. AIGC — SHOULD

40. Video + `is_aigc` → show AIGC label in the preview.
41. Photo → AIGC hidden (video-only field).

## K. Presentation / cross-cutting

42. Theme light/dark/auto (mirror LinkedIn `theme` + `--pr-*` CSS vars).
43. `className`/`style` passthrough; memoized; `'use client'`.
44. Mobile: stacks, no overflow, tap targets.

---

## Open design decision (resolve before building)

Is `<TikTokPostPreview>` **presentational-only** (re-surfaces choices the host already
collected, + editable caption + Post gate) or does it also **own the option controls**
(privacy dropdown, interaction toggles, disclosure)?

- The X/LinkedIn previews are pure feed-card mocks (presentational).
- TikTok's Required UX is a **publish-confirmation surface** — media + editable caption
  + creator + chosen-settings read-out + commercial label + declaration + Post button.
- The dashboard already has the *picking* controls (`composer-tiktok-options.tsx`).

**Recommendation:** SDK ships a presentational confirmation `<TikTokPostPreview>` that
renders read-outs of audience/interaction/disclosure + media + **editable caption** +
declaration + **a Post button whose click is the consent gate** (`onPost`). The
option-*picking* controls stay a separate concern (host-owned or a later
`<TikTokOptions>`), so the preview is the §5 confirmation/consent view the audit checks.
The generic glue in `_lib/tiktok-options.ts` should move down into `@postrun/js`.

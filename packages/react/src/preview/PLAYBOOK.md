# Social Preview Playbook — read this BEFORE building any network's preview

> Hard-won from building the **TikTok** preview + publish panel (the screencast
> gate for TikTok's Content-Posting app review). Every preview after this —
> Instagram, Facebook, YouTube, etc. — follows this. It encodes both the
> **process** that works and the **specific mistakes that cost real rework**.
>
> The two non-negotiable goals of a preview: (1) it looks like the real platform
> on sight, and (2) when a network's API approval is gated on the publishing UX
> (TikTok is; Meta/YouTube screencasts effectively are), it is **compliant** —
> nothing the audit can flag.

---

## 0. The bar

- **Match the platform's ACTUAL UI, pixel-faithful.** Not "close enough." The
  reviewer compares your render to their app. A 7/10 is a fail.
- **Reference real source, never vibes.** Get the platform's real DOM/screenshots
  (ask the user — they have the app open) and match them. Read the platform's
  Required-UX / content-sharing docs and verify every string, cap, and rule.
- **Green gates ≠ done.** typecheck/test/build passing proves it compiles. Open it
  in Chrome and *look at it* against the reference before claiming done.

---

## 1. Architecture (where things live — reuse, don't reinvent)

```
packages/js/src/
  resources.ts        <Network>PostVariant = Extract<PostVariantInput,{platform:'x'}>  ← derive, never declare
  <network>-options.ts  framework-agnostic Required-UX logic + verbatim strings (the SINGLE source)
packages/react/src/preview/
  types.ts            PreviewMedia / ResolvedMedia / PreviewMediaKind  (shared by ALL networks)
  use-resolved-media.ts  File→objectURL + url resolution, memoized  (USE THIS, do not re-roll)
  <network>/
    <Network>PostPreview.tsx   the feed/post card (presentational)
    <Network>PublishPanel.tsx  the confirmation+consent surface (only if the network has Required UX)
    Media.tsx, Caption.tsx, icons.tsx, theme.ts, ui.tsx, types.ts, index.ts
    *.test.tsx
```

- **Components are PRESENTATIONAL.** Host passes `variant` + (creator/account info)
  + resolved `media`. No data fetching inside the preview.
- **Generic, customer-reusable logic goes in `@postrun/js`** (the dogfood rule),
  consumed by React. Never fork it. Verbatim platform strings live there as named
  constants.
- **Wire exports through BOTH** `preview/index.ts` AND the package root
  `packages/react/src/index.ts`, or it isn't consumable. Add a **changeset**
  (`@postrun/js` + `@postrun/react` are version-locked → bump both).

---

## 2. The build process that works

1. **Read the platform docs first** (API + content-sharing/Required-UX). Pin the
   real caps, enums, scopes, required wording. Training data is stale.
2. **Get the real UI reference.** Ask the user for the platform's actual DOM /
   screenshots of the post AND (if relevant) the pre-post preview screen. Confirm
   **mobile vs web** — they differ (see lesson 3.1).
3. **Spin up the playground** (`apps/playground`, Vite, aliased to `src` for HMR)
   driven by a real Post-object fixture. This is the live review surface.
4. **Build in small chunks, get approval per chunk.** Card frame → media → caption
   → (panel sections) → states/theming → tests.
5. **Self-critique loop:** open in Chrome (chrome-devtools MCP `navigate_page` +
   `take_screenshot`), compare to the reference, name the gaps, fix, re-render.
   Do NOT hand a draft to the user as QA.
6. **Tests + gates + changeset**, then review.

---

## 3. Lessons learned (the expensive ones)

### 3.1 Match the platform's REAL layout — and the RIGHT one (mobile vs web)
TikTok **web** puts the action rail *beside* the video; TikTok **mobile** overlays
it *on* the video. We built web first, then had to redo it as mobile. **The
customer-facing preview should match the platform's MOBILE app** (that's what the
creator sees and what the audit references). Bonus: rail-over-video keeps the white
glyphs on dark pixels, so it works on any host background.

### 3.2 NEVER hand-roll icons
Hand-drawn SVG path approximations are the #1 vibe-coded tell and an instant
reject. Use, in order of preference:
1. The platform's **own icon SVGs**, lifted verbatim from their DOM (their official
   marks). This is what TikTok's heart/comment/bookmark/share/plus are.
2. A **maintained icon set** (`react-icons`, e.g. Ionicons `io5`) for generic
   glyphs (we use it for the music note).
Never approximate a brand/UI glyph by hand.

### 3.3 NEVER hand-roll mechanics a package owns
The carousel uses **Embla** (`embla-carousel-react`) — real touch/drag for free.
Do not hand-roll swipe, sliders, retry loops, sleeps, etc. (repo principle:
buy-don't-hand-roll). And match the platform's carousel exactly: TikTok = **dots
only, no counter, no arrows** (you swipe). Position dots with clear spacing above
the caption, not crammed against it.

### 3.4 Never fabricate engagement metrics
A pre-post preview has no real counts. TikTok shows **`‑‑‑`** (dashes), not `0` and
never invented numbers. Use whatever the platform's actual pre-post preview shows.

### 3.5 No watermark / unmodified media (COMPLIANCE)
Never composite a logo, watermark, or fake-engagement overlay onto the media
bytes. The audit literally checks "no watermark added." Chrome (handle, rail) is a
preview overlay — it must never be baked into the media element.

### 3.6 Full to-be-posted content must be READABLE (COMPLIANCE §5a-style)
Silent truncation can be flagged. We clamp the caption to 2 lines with a
**"more"/"less"** toggle that expands AND **scrolls** long text within the card, so
the entire caption is readable in the preview. Keep the full text in the editable
field too. Postiz only `line-clamp-6`s and relies on the editor — do better.

### 3.7 Caps come from the contract, counted the way the API counts
Caption caps differ by post type (TikTok: video title 2200 / photo description
4000) — mirror the contract's values, and count **UTF-16 code units**
(`value.length`) so the editor never disagrees with the server gate. Don't enforce
a limit the contract doesn't model (TikTok's 90-char photo *title* isn't in our
schema — our body maps to the 4000 description; enforcing 90 = false reject).

### 3.8 Theming: media card always-dark; controls panel themes
A video/photo surface is always dark on these platforms — the **card stays dark**.
The **controls panel** themes light/dark/`auto` via CSS variables (mirror
`linkedin/theme.ts` / `tiktok/theme.ts`: `paletteVars(dark)` + `useIsDark(theme)` +
`var(--pr-*)`). Don't hardcode panel colors.

### 3.9 jsdom test stubs for Embla-based components
Embla reads `ownerWindow.matchMedia` + `IntersectionObserver` + `ResizeObserver`,
none of which jsdom implements. Stub all three on `window` in `beforeAll` (define
on `window`, not `globalThis` — Embla uses the element's owner window). See
`tiktok/TikTokPostPreview.test.tsx`.

---

## 4. Types discipline (CRITICAL — repo principle #3)

- **Every DATA/contract shape derives from `@postrun/js`.** The variant
  (`Extract<PostVariantInput,{platform:'…'}>`), its `settings`, `post_type`, enums,
  and even key sets (e.g. interaction keys via `keyof CreatorInfo['interaction']`).
  A literal union or interface that duplicates a contract type is a finding.
- **Acceptable to declare:** component prop interfaces, and pure UI view-models /
  form-value types (kept in `@postrun/js` when shared). Everything they reference
  must still be SDK-derived.
- **No casts.** No `as` / `any` / `!` to bridge a type gap (allowed: `as const`,
  `as const satisfies`). A cast means the type is wrong — fix the type.

---

## 5. Compliance-gated previews (the TikTok pattern)

When a network gates API approval on the publishing UX, the preview is only half —
you also build the **publish/confirmation panel**. Required pieces (TikTok's, the
template):

- [ ] Editable caption up to the moment of posting (full text readable).
- [ ] Audience/privacy selector with **NO default** (force an explicit choice).
- [ ] Interaction settings, **creator-gated** (disabled + off where the
      account/creator forbids; hide ones that don't apply to the post type).
- [ ] Commercial/branded-content disclosure with **verbatim** label wording.
- [ ] Consent declaration **directly above** the Post button; wording switches by
      context (e.g. branded content).
- [ ] **Affirmative-consent gate:** `onPost` fires ONLY on an explicit click — no
      auto-post, no effect/mount-triggered publish. **Disabled-until-valid.**
- [ ] Processing notice.
- [ ] (SHOULD) any platform label that appears on the post (AIGC, "Paid
      partnership", audience pill) — **derive it from the post `settings`** so the
      preview reflects the real choice.

All of that logic (no-default rules, disclosure rules, allow→disable mapping,
verbatim strings) lives in `@postrun/js/<network>-options.ts` — the single source.

**Networks status:** X + LinkedIn previews shipped (feed-card only, no Required
UX). TikTok = full preview + Required-UX panel (this build). Instagram / Facebook
(Meta review screencast) and YouTube (API audit) come next — check each platform's
current content-publishing policy for its own Required-UX before building.

---

## 6. Definition of done (per network)

- [ ] Matches the real platform UI in Chrome at desktop **and** mobile widths
      (self-critiqued against the reference, honest "yes").
- [ ] Renders from our real Post object (`<Network>PostVariant`); zero hand-rolled
      data types; no casts.
- [ ] Icons are official marks or a maintained set — never hand-rolled.
- [ ] Packages used for mechanics (carousel, etc.), not re-implemented.
- [ ] Media unmodified (no watermark); full caption readable; caps correct.
- [ ] If Required-UX applies: panel complete + consent gate fires only on click +
      disabled-until-valid + verbatim strings verified against live docs.
- [ ] Theming (card dark, panel light/dark/auto); loading/empty/processing states.
- [ ] Exported from `preview/index.ts` + package root; changeset added.
- [ ] Tests pin the **behaviors**, not just "renders": consent gate, caps,
      no-default audience, greyed forbidden options, label derivation. A test that
      passes even if the behavior breaks is worthless.
- [ ] typecheck + test + build green — then read the diff line-by-line anyway.

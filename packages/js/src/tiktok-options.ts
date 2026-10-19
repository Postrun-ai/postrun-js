import type {
  MediaResource,
  Post,
  PostType,
  SettingsFor,
  TikTokCreatorInfo,
} from './resources';
import { type TikTokPrivacyLevel } from './resources';
import { tiktokPrivacyLabel } from './tiktok';

/**
 * The TikTok composer's publish-options model — the framework-agnostic glue
 * between the live `creator-info` payload and a TikTok post's settings. This is
 * the SINGLE source for the audience / creator-gated interaction / commercial
 * disclosure rules; the React panel and the dashboard composer both consume it
 * (never re-implement it). The no-default audience and explicit-consent flow are
 * Postrun's own UX choices, not API requirements.
 *
 * The creator-info shape, the privacy union, and the privacy label come from the
 * contract (`./resources`, `./tiktok`) — never re-declared. This module owns the
 * controlled FORM value, the selection rules, and the mapping into the SDK's
 * per-platform `tiktok` settings.
 */

/** TikTok caption caps, mirrored from the publish contract (`BODY_MAX.tiktok_*`).
 * A video post caps the title (2200), a photo post the description (4000). Lives
 * here (not in React) so non-React consumers (MCP, API client, scripts) can use
 * it. The server enforces these; the editor surfaces them. */
export const TIKTOK_CAPTION_MAX = { video: 2200, photo: 4000 } as const;

/** The caption cap for a given post_type (video → title cap, photo → description).
 * `post_type` is server-derived from the media (read-only) — the composer passes
 * the shape it knows it's building (a video post vs a photo post). */
export function captionMaxFor(postType: PostType): number {
  return postType === 'video'
    ? TIKTOK_CAPTION_MAX.video
    : TIKTOK_CAPTION_MAX.photo;
}

/** The creator-gated interactions we surface — DERIVED from the creator-info
 * contract (`interaction` keys), never hand-listed, so it can never drift from
 * the API shape. */
export type TikTokInteractionKey = keyof TikTokCreatorInfo['interaction'];

/** Which commercial-disclosure brand option a control maps to. */
export type TikTokBrandKind = 'your_brand' | 'branded_content';

/**
 * The controlled value a TikTok composer/preview owns. `privacy_level` is
 * PHOTO-ONLY (TikTok publishes every video publicly) and optional because we
 * make the user pick — there is NO default (an absent value is the "must choose"
 * state the photo publish gate keys off). Interaction flags are POSITIVE
 * ("allow"); `tiktokSettings` inverts them to the API's `disable_*` shape.
 */
export interface TikTokOptionsValue {
  privacy_level?: TikTokPrivacyLevel;
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  /** Commercial Content Disclosure master toggle (off by default). When on, at
   * least one of `your_brand` / `branded_content` must be chosen. */
  commercial_disclosure: boolean;
  your_brand: boolean;
  branded_content: boolean;
  /** AI-generated content disclosure → the API's `is_ai_generated`. Video-only,
   * off by default. */
  ai_generated: boolean;
}

export interface AudiencePrivacyChoice {
  level: TikTokPrivacyLevel;
  label: string;
  disabled: boolean;
  /** Why the option is disabled; present only when disabled. */
  disabledReason?: string;
}

export interface TikTokInteractionRow {
  key: TikTokInteractionKey;
  label: string;
  /** Disabled (and forced off) when the creator forbids it — TikTok mandate. */
  disabled: boolean;
}

/* --------------------------- required wording --------------------------- */

/** TikTok's Music Usage Confirmation — the legal URL the declaration links to. */
export const TIKTOK_MUSIC_CONFIRMATION_URL =
  'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';

/** TikTok's Branded Content Policy — linked when a paid partnership is disclosed. */
export const TIKTOK_BRANDED_CONTENT_POLICY_URL =
  'https://www.tiktok.com/legal/page/global/bc-policy/en';

/** TikTok's exact required prompt when disclosure is on but nothing is chosen. */
export const TIKTOK_DISCLOSURE_REQUIRED_HINT =
  'You need to indicate if your content promotes yourself, a third party, or both.';

/** Shown when a photo post has no audience picked yet. */
export const TIKTOK_AUDIENCE_REQUIRED_HINT =
  'Choose who can view this post before publishing.';

/** Why branded content can't be combined with a private audience. */
export const TIKTOK_BRANDED_CONTENT_PRIVATE_DISABLED_REASON =
  'Branded content visibility cannot be set to private.';

/** A published post may take a few minutes to process; tells the user so. */
export const TIKTOK_PROCESSING_NOTICE =
  'After you publish, it may take a few minutes for your post to process and appear on your TikTok profile.';

/* ------------------------------ defaults ------------------------------ */

/**
 * The initial value for a TikTok post: nothing pre-selected. We make the user
 * actively choose — no default audience, every interaction OFF, no disclosure.
 * The panel still greys the interactions the creator forbids.
 */
export function defaultTikTokOptions(): TikTokOptionsValue {
  return {
    privacy_level: undefined,
    allow_comment: false,
    allow_duet: false,
    allow_stitch: false,
    commercial_disclosure: false,
    your_brand: false,
    branded_content: false,
    ai_generated: false,
  };
}

/* ------------------------------ audience ------------------------------ */

/** Narrow a raw dropdown value to a `TikTokPrivacyLevel` against the creator's
 * allowed options — returns `undefined` for anything not offered (no cast). */
export function parsePrivacyLevel(
  value: string,
  options: readonly TikTokPrivacyLevel[],
): TikTokPrivacyLevel | undefined {
  return options.find((option) => option === value);
}

/** Effective brand flags (only meaningful while disclosure is on). */
function discloses(value: TikTokOptionsValue, kind: TikTokBrandKind): boolean {
  return value.commercial_disclosure && value[kind];
}

/**
 * The audience choices for a PHOTO post — one per creator-allowed level. While
 * branded content is disclosed, `SELF_ONLY` stays visible but disabled with the
 * reason (branded content can't be private); it is never silently removed or
 * swapped, so the user's selection is never changed behind their back.
 */
export function audiencePrivacyOptions(
  options: readonly TikTokPrivacyLevel[],
  value: TikTokOptionsValue,
): AudiencePrivacyChoice[] {
  const brandedContent = discloses(value, 'branded_content');

  return options.map((level) => {
    const disabled = brandedContent && level === 'SELF_ONLY';
    return {
      level,
      label: tiktokPrivacyLabel(level),
      disabled,
      ...(disabled
        ? { disabledReason: TIKTOK_BRANDED_CONTENT_PRIVATE_DISABLED_REASON }
        : {}),
    };
  });
}

/** A photo post with no audience picked yet — must BLOCK publish (the API
 * requires `privacy_level` on photos and we offer no default). A video never
 * needs one: TikTok publishes every video publicly. */
export function audienceUnselected(
  value: TikTokOptionsValue,
  isVideo: boolean,
): boolean {
  return !isVideo && value.privacy_level === undefined;
}

/* --------------------------- commercial disclosure --------------------------- */

/** Disclosure is on but neither brand option is chosen — TikTok requires ≥1. */
export function commercialDisclosureIncomplete(
  value: TikTokOptionsValue,
): boolean {
  return (
    value.commercial_disclosure && !value.your_brand && !value.branded_content
  );
}

/** True when the post is disclosed as branded content (drives the BC declaration). */
export function brandedContentDeclared(value: TikTokOptionsValue): boolean {
  return discloses(value, 'branded_content');
}

/**
 * TikTok's required label notice for the disclosed content — branded content
 * (alone OR with your-brand) is "Paid partnership"; your-brand alone is
 * "Promotional content". `null` when nothing is disclosed. Wording is verbatim.
 */
export function commercialLabelNotice(
  value: TikTokOptionsValue,
): string | null {
  if (discloses(value, 'branded_content')) {
    return "Your photo/video will be labeled as 'Paid partnership'";
  }
  if (discloses(value, 'your_brand')) {
    return "Your photo/video will be labeled as 'Promotional content'";
  }
  return null;
}

/** Toggle the master disclosure switch. Turning it OFF clears both brand
 * selections (a hidden control must not keep sending a stale selection). */
export function setCommercialDisclosure(
  value: TikTokOptionsValue,
  on: boolean,
): TikTokOptionsValue {
  return on
    ? { ...value, commercial_disclosure: true }
    : {
        ...value,
        commercial_disclosure: false,
        your_brand: false,
        branded_content: false,
      };
}

/** Set one brand option. Never touches the audience (see
 * `brandedContentDisabledReason` for how a private audience locks branded content). */
export function setBrandKind(
  value: TikTokOptionsValue,
  kind: TikTokBrandKind,
  on: boolean,
): TikTokOptionsValue {
  return { ...value, [kind]: on };
}

/* ------------------------------ interactions ------------------------------ */

/**
 * Why "Branded content" is locked, or undefined when it can be toggled. With a
 * private audience already picked the option stays visible but disabled WITH the
 * reason — an already-checked box stays untickable.
 */
export function brandedContentDisabledReason(
  value: TikTokOptionsValue,
): string | undefined {
  return value.privacy_level === 'SELF_ONLY' && !value.branded_content
    ? TIKTOK_BRANDED_CONTENT_PRIVATE_DISABLED_REASON
    : undefined;
}

/** True when the creator does NOT permit this interaction (so it's locked off). */
export function isInteractionForbidden(
  info: TikTokCreatorInfo,
  key: TikTokInteractionKey,
): boolean {
  return !info.interaction[key];
}

const INTERACTION_LABELS: Record<TikTokInteractionKey, string> = {
  comment: 'Comment',
  duet: 'Duet',
  stitch: 'Stitch',
};

/** Duet & Stitch are video-only — the API rejects `disable_duet` /
 * `disable_stitch` on a photo post — so a photo post shows only Comment. */
const VIDEO_INTERACTIONS: readonly TikTokInteractionKey[] = [
  'comment',
  'duet',
  'stitch',
];
const PHOTO_INTERACTIONS: readonly TikTokInteractionKey[] = ['comment'];

const INTERACTION_VALUE_KEY = {
  comment: 'allow_comment',
  duet: 'allow_duet',
  stitch: 'allow_stitch',
} as const satisfies Record<TikTokInteractionKey, keyof TikTokOptionsValue>;

/** The interaction toggles to render — video shows Comment/Duet/Stitch (each
 * disabled iff the creator forbids it); photo shows only Comment. */
export function interactionRows(
  info: TikTokCreatorInfo,
  isVideo: boolean,
): TikTokInteractionRow[] {
  const order = isVideo ? VIDEO_INTERACTIONS : PHOTO_INTERACTIONS;
  return order.map((key) => ({
    key,
    label: INTERACTION_LABELS[key],
    disabled: isInteractionForbidden(info, key),
  }));
}

/** The `TikTokOptionsValue` flag an interaction key maps to. */
export function interactionValueKey(
  key: TikTokInteractionKey,
): keyof TikTokOptionsValue {
  return INTERACTION_VALUE_KEY[key];
}

/** Immutably set an interaction flag — returns a new value, never mutates. */
export function toggleInteraction(
  value: TikTokOptionsValue,
  key: TikTokInteractionKey,
  on: boolean,
): TikTokOptionsValue {
  return { ...value, [INTERACTION_VALUE_KEY[key]]: on };
}

/* -------------------------------- mapping -------------------------------- */

/**
 * Map the composer's positive value into the SDK's `tiktok` settings — INVERTING
 * `allow_*` into TikTok's `disable_*`. The API rejects video-only fields
 * (`disable_duet`/`disable_stitch`/`is_ai_generated`) on a photo and
 * `privacy_level` on a video (`field_placement_invalid`), so each post kind sends
 * only its own.
 */
export function tiktokSettings(
  value: TikTokOptionsValue,
  isVideo: boolean,
): NonNullable<SettingsFor<'tiktok'>> {
  const base = {
    disable_comment: !value.allow_comment,
    is_brand_organic: discloses(value, 'your_brand'),
    is_branded_content: discloses(value, 'branded_content'),
  };

  return isVideo
    ? {
        ...base,
        disable_duet: !value.allow_duet,
        disable_stitch: !value.allow_stitch,
        is_ai_generated: value.ai_generated,
      }
    : { ...base, privacy_level: value.privacy_level };
}

/** A fetched post's TikTok variant settings (the read shape) — derived from the
 * contract, never re-declared. */
type TikTokVariantSettings = Extract<
  Post['variants'][number],
  { platform: 'tiktok' }
>['settings'];

/**
 * The inverse of {@link tiktokSettings}: rebuild the composer's controlled
 * options from a fetched post's TikTok settings — the open-a-draft / scheduled
 * path. `disable_*` flags invert back to positive "allow"; disclosure is on when
 * either brand flag is.
 */
export function tiktokOptionsFromSettings(
  settings: TikTokVariantSettings,
): TikTokOptionsValue {
  const yourBrand = settings.is_brand_organic ?? false;
  const brandedContent = settings.is_branded_content ?? false;

  return {
    privacy_level: settings.privacy_level,
    allow_comment: !(settings.disable_comment ?? false),
    allow_duet: !(settings.disable_duet ?? false),
    allow_stitch: !(settings.disable_stitch ?? false),
    commercial_disclosure: yourBrand || brandedContent,
    your_brand: yourBrand,
    branded_content: brandedContent,
    ai_generated: settings.is_ai_generated ?? false,
  };
}

/* ------------------------------ readiness ------------------------------ */

/**
 * A render-ready block message when the selected video exceeds the creator's
 * `max_video_duration_sec`, else `null`. Video-only. Never false-blocks: missing
 * creator-info (still loading), no video asset, or a duration the probe hasn't
 * reported yet (`source.duration_ms === null`) all return `null` — it only fires
 * on a KNOWN over-limit duration.
 */
export function tiktokDurationError(
  media: readonly MediaResource[],
  info: TikTokCreatorInfo | null,
  isVideo: boolean,
): string | null {
  if (!isVideo || !info) return null;

  const durationMs = media.find((asset) => asset.kind === 'video')?.source
    ?.duration_ms;
  if (durationMs == null) return null;
  if (durationMs / 1000 <= info.max_video_duration_sec) return null;

  return `This video is longer than your TikTok account allows (max ${info.max_video_duration_sec}s).`;
}

/**
 * Is the TikTok post ready to publish (client-side gate mirroring the API)?
 * A photo needs an audience; any post with disclosure on needs a brand kind.
 * The caption-cap + media-count checks live with their own components.
 */
export function tiktokOptionsReady(
  value: TikTokOptionsValue,
  isVideo: boolean,
): boolean {
  // Branded content can't be private (the API rejects it) — checked here so a
  // host that builds the options object directly (bypassing setBrandKind's
  // clearing) still can't enable Post on a state the wire will refuse.
  const brandedPrivate =
    !isVideo &&
    discloses(value, 'branded_content') &&
    value.privacy_level === 'SELF_ONLY';
  return (
    !audienceUnselected(value, isVideo) &&
    !commercialDisclosureIncomplete(value) &&
    !brandedPrivate
  );
}

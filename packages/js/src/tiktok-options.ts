import type {
  SettingsFor,
  TikTokCreatorInfo,
  TikTokPostVariant,
} from './resources';
import { type TikTokPrivacyLevel } from './resources';
import { tiktokPrivacyLabel } from './tiktok';

/**
 * TikTok's mandatory publish-options model — the framework-agnostic glue between
 * the live `creator-info` payload and a TikTok post's settings. This is the
 * SINGLE source for the no-default / creator-gated / commercial-disclosure rules
 * TikTok's Required UX mandates; the React panel and the dashboard composer both
 * consume it (never re-implement it).
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

/** The caption cap for a given post_type (video → title cap, photo → description). */
export function captionMaxFor(postType: TikTokPostVariant['post_type']): number {
  return postType === 'video'
    ? TIKTOK_CAPTION_MAX.video
    : TIKTOK_CAPTION_MAX.photo;
}

/** The creator-gated interactions TikTok requires us to surface — DERIVED from
 * the creator-info contract (`interaction` keys), never hand-listed, so it can
 * never drift from the API shape. */
export type TikTokInteractionKey = keyof TikTokCreatorInfo['interaction'];

/** Which commercial-disclosure brand option a control maps to. */
export type TikTokBrandKind = 'your_brand' | 'branded_content';

/**
 * The controlled value a TikTok composer/preview owns. `privacy_level` is
 * optional because TikTok requires the user to pick — there is NO default (an
 * absent value is the "must choose" state the publish gate keys off). Interaction
 * flags are POSITIVE ("allow"); `tiktokSettings` inverts them to the API's
 * `disable_*` shape.
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
  /** AI-generated content disclosure → the API's `is_aigc`. Video-only, off by
   * default. */
  aigc: boolean;
}

export interface TikTokPrivacyChoice {
  level: TikTokPrivacyLevel;
  label: string;
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

/** TikTok's required prompt when no audience has been picked yet. */
export const TIKTOK_AUDIENCE_REQUIRED_HINT =
  'Choose who can view this video before publishing.';

/** TikTok Required UX: clients must notify users a published post may take a few
 * minutes to process. No exact string is mandated; this conveys it. */
export const TIKTOK_PROCESSING_NOTICE =
  'After you publish, it may take a few minutes for your post to process and appear on your TikTok profile.';

/* ------------------------------ defaults ------------------------------ */

/**
 * The initial value for a TikTok post: nothing pre-selected. TikTok's Required UX
 * mandates the user actively choose — no default privacy, every interaction OFF,
 * no disclosure. The panel still greys the interactions the creator forbids.
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
    aigc: false,
  };
}

/* ------------------------------ audience ------------------------------ */

/** The audience choices for the dropdown — one per level the creator allows. */
export function privacyChoices(
  options: readonly TikTokPrivacyLevel[],
): TikTokPrivacyChoice[] {
  return options.map((level) => ({ level, label: tiktokPrivacyLabel(level) }));
}

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
 * The audience levels to offer. Branded content can ONLY be public/friends —
 * TikTok forbids posting it SELF_ONLY (private) — so that option is dropped when
 * branded content is disclosed. Otherwise every creator-allowed level is offered.
 */
export function audiencePrivacyOptions(
  options: readonly TikTokPrivacyLevel[],
  value: TikTokOptionsValue,
): TikTokPrivacyLevel[] {
  return discloses(value, 'branded_content')
    ? options.filter((option) => option !== 'SELF_ONLY')
    : [...options];
}

/** No audience picked yet — must BLOCK publish (TikTok mandates an explicit
 * choice with no default; the API rejects a missing `privacy_level` too). */
export function audienceUnselected(value: TikTokOptionsValue): boolean {
  return value.privacy_level === undefined;
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

/**
 * Set one brand option. Enabling branded content while a private audience is
 * picked clears the audience (branded content can't be SELF_ONLY; no default — the
 * user re-picks from the now-narrowed options).
 */
export function setBrandKind(
  value: TikTokOptionsValue,
  kind: TikTokBrandKind,
  on: boolean,
): TikTokOptionsValue {
  const clearPrivacy =
    kind === 'branded_content' && on && value.privacy_level === 'SELF_ONLY';
  return {
    ...value,
    [kind]: on,
    ...(clearPrivacy ? { privacy_level: undefined } : {}),
  };
}

/* ------------------------------ interactions ------------------------------ */

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

/** Duet & Stitch are video-remix features — TikTok states they are NOT applicable
 * to photo posts ("only 'Allow Comment' can be displayed"), and the API rejects
 * `disable_duet`/`disable_stitch` on a non-video post. So a photo post shows only
 * Comment. */
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
 * `allow_*` into TikTok's `disable_*`. `disable_duet`/`disable_stitch`/`is_aigc`
 * are video-only (the API rejects them on a photo post), so a photo post sends
 * just `privacy_level` + `disable_comment` + the brand toggles.
 */
export function tiktokSettings(
  value: TikTokOptionsValue,
  isVideo: boolean,
): NonNullable<SettingsFor<'tiktok'>> {
  const base = {
    privacy_level: value.privacy_level,
    disable_comment: !value.allow_comment,
    brand_organic_toggle: discloses(value, 'your_brand'),
    brand_content_toggle: discloses(value, 'branded_content'),
  };

  return isVideo
    ? {
        ...base,
        disable_duet: !value.allow_duet,
        disable_stitch: !value.allow_stitch,
        is_aigc: value.aigc,
      }
    : base;
}

/* ------------------------------ readiness ------------------------------ */

/**
 * Is the TikTok post ready to publish (client-side gate mirroring the API)?
 * Audience must be chosen and, if disclosure is on, a brand kind must be picked.
 * The caption-cap + media-count checks live with their own components.
 */
export function tiktokOptionsReady(value: TikTokOptionsValue): boolean {
  // Branded content cannot be SELF_ONLY (the API rejects it) — mirror that here so
  // the Post button never enables on a state the wire will refuse, even if a host
  // constructs the options object directly (bypassing setBrandKind's clearing).
  const brandedPrivate =
    discloses(value, 'branded_content') && value.privacy_level === 'SELF_ONLY';
  return (
    !audienceUnselected(value) &&
    !commercialDisclosureIncomplete(value) &&
    !brandedPrivate
  );
}

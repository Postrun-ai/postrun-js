import { describe, expect, it } from 'vitest';

import type { MediaResource, TikTokCreatorInfo } from './resources';
import {
  TIKTOK_BRANDED_CONTENT_PRIVATE_DISABLED_REASON,
  audiencePrivacyOptions,
  audienceUnselected,
  brandedContentDeclared,
  brandedContentDisabledReason,
  commercialDisclosureIncomplete,
  commercialLabelNotice,
  defaultTikTokOptions,
  interactionRows,
  interactionValueKey,
  isInteractionForbidden,
  parsePrivacyLevel,
  setBrandKind,
  setCommercialDisclosure,
  tiktokDurationError,
  tiktokOptionsFromSettings,
  tiktokOptionsReady,
  tiktokSettings,
  toggleInteraction,
} from './tiktok-options';

/**
 * The TikTok-options logic is the SINGLE source for the composer's TikTok rules
 * (photo-only audience with no default, creator-gated interactions, commercial
 * disclosure, allow→disable mapping). These tests pin those behaviours.
 */

const creatorInfo: TikTokCreatorInfo = {
  creator: { nickname: 'Acme', username: 'acme', avatar_url: null },
  privacy_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

describe('defaultTikTokOptions', () => {
  it('pre-selects nothing — no default audience, all interactions off', () => {
    const v = defaultTikTokOptions();
    expect(v.privacy_level).toBeUndefined();
    expect(v.allow_comment).toBe(false);
    expect(v.allow_duet).toBe(false);
    expect(v.allow_stitch).toBe(false);
    expect(v.commercial_disclosure).toBe(false);
    expect(v.ai_generated).toBe(false);
  });
});

describe('audience', () => {
  it('offers every creator-allowed level by default', () => {
    expect(
      audiencePrivacyOptions(creatorInfo.privacy_options, defaultTikTokOptions()),
    ).toEqual([
      { level: 'PUBLIC_TO_EVERYONE', label: 'Everyone', disabled: false },
      { level: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends', disabled: false },
      { level: 'SELF_ONLY', label: 'Only you', disabled: false },
    ]);
  });

  it('keeps SELF_ONLY visible but disabled, with the reason, for branded content', () => {
    const v = { ...defaultTikTokOptions(), commercial_disclosure: true, branded_content: true };
    const choices = audiencePrivacyOptions(creatorInfo.privacy_options, v);
    expect(choices.map((c) => c.level)).toEqual([
      'PUBLIC_TO_EVERYONE',
      'MUTUAL_FOLLOW_FRIENDS',
      'SELF_ONLY',
    ]);
    expect(choices.filter((c) => c.disabled)).toEqual([
      {
        level: 'SELF_ONLY',
        label: 'Only you',
        disabled: true,
        disabledReason: TIKTOK_BRANDED_CONTENT_PRIVATE_DISABLED_REASON,
      },
    ]);
  });

  it('audienceUnselected is true for a photo until a level is chosen (no default)', () => {
    expect(audienceUnselected(defaultTikTokOptions(), false)).toBe(true);
    expect(
      audienceUnselected(
        { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' },
        false,
      ),
    ).toBe(false);
  });

  it('a video never needs an audience (TikTok publishes it publicly)', () => {
    expect(audienceUnselected(defaultTikTokOptions(), true)).toBe(false);
  });

  it('parsePrivacyLevel narrows only to offered values', () => {
    expect(parsePrivacyLevel('SELF_ONLY', creatorInfo.privacy_options)).toBe('SELF_ONLY');
    expect(parsePrivacyLevel('NONSENSE', creatorInfo.privacy_options)).toBeUndefined();
  });

});

describe('commercial disclosure', () => {
  it('is incomplete when on but neither brand option is chosen', () => {
    const v = { ...defaultTikTokOptions(), commercial_disclosure: true };
    expect(commercialDisclosureIncomplete(v)).toBe(true);
    expect(commercialDisclosureIncomplete({ ...v, your_brand: true })).toBe(false);
  });

  it('labels paid partnership / promotional content / nothing (verbatim)', () => {
    const base = defaultTikTokOptions();
    expect(commercialLabelNotice(base)).toBeNull();
    expect(
      commercialLabelNotice({ ...base, commercial_disclosure: true, your_brand: true }),
    ).toBe("Your photo/video will be labeled as 'Promotional content'");
    expect(
      commercialLabelNotice({ ...base, commercial_disclosure: true, branded_content: true }),
    ).toBe("Your photo/video will be labeled as 'Paid partnership'");
  });

  it('branded wins over your-brand for the label + the BC declaration', () => {
    const v = {
      ...defaultTikTokOptions(),
      commercial_disclosure: true,
      your_brand: true,
      branded_content: true,
    };
    expect(commercialLabelNotice(v)).toBe(
      "Your photo/video will be labeled as 'Paid partnership'",
    );
    expect(brandedContentDeclared(v)).toBe(true);
  });

  it('turning disclosure off clears both brand selections', () => {
    const v = {
      ...defaultTikTokOptions(),
      commercial_disclosure: true,
      your_brand: true,
      branded_content: true,
    };
    expect(setCommercialDisclosure(v, false)).toMatchObject({
      commercial_disclosure: false,
      your_brand: false,
      branded_content: false,
    });
  });

  it('locks branded content while a private audience is picked', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(brandedContentDisabledReason(v)).toBe(
      'Branded content visibility cannot be set to private.',
    );
    expect(
      brandedContentDisabledReason({ ...v, privacy_level: 'PUBLIC_TO_EVERYONE' }),
    ).toBeUndefined();
    expect(
      brandedContentDisabledReason({ ...v, branded_content: true }),
    ).toBeUndefined();
  });

  it('setBrandKind never changes the audience', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(setBrandKind(v, 'your_brand', true).privacy_level).toBe('SELF_ONLY');
    expect(setBrandKind(v, 'branded_content', true).privacy_level).toBe(
      'SELF_ONLY',
    );
  });
});

describe('interactions', () => {
  it('flags an interaction the creator forbids', () => {
    expect(isInteractionForbidden(creatorInfo, 'stitch')).toBe(true);
    expect(isInteractionForbidden(creatorInfo, 'comment')).toBe(false);
  });

  it('video shows Comment/Duet/Stitch; photo shows only Comment', () => {
    expect(interactionRows(creatorInfo, true).map((r) => r.key)).toEqual([
      'comment',
      'duet',
      'stitch',
    ]);
    expect(interactionRows(creatorInfo, false).map((r) => r.key)).toEqual([
      'comment',
    ]);
  });

  it('marks the creator-forbidden row disabled', () => {
    const stitch = interactionRows(creatorInfo, true).find((r) => r.key === 'stitch');
    expect(stitch?.disabled).toBe(true);
  });

  it('toggleInteraction flips the positive allow flag immutably', () => {
    const v = defaultTikTokOptions();
    const next = toggleInteraction(v, 'comment', true);
    expect(next.allow_comment).toBe(true);
    expect(v.allow_comment).toBe(false); // original untouched
    expect(interactionValueKey('duet')).toBe('allow_duet');
  });
});

describe('tiktokSettings mapping', () => {
  it('video inverts allow→disable, uses the Accounts API names, and never sends privacy_level', () => {
    const v = {
      ...defaultTikTokOptions(),
      privacy_level: 'PUBLIC_TO_EVERYONE' as const,
      allow_comment: true,
      allow_duet: false,
      allow_stitch: true,
      ai_generated: true,
    };
    expect(tiktokSettings(v, true)).toEqual({
      disable_comment: false,
      disable_duet: true,
      disable_stitch: false,
      is_brand_organic: false,
      is_branded_content: false,
      is_ai_generated: true,
    });
  });

  it('photo sends privacy_level and omits the video-only fields', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    const settings = tiktokSettings(v, false);
    expect(settings.privacy_level).toBe('SELF_ONLY');
    expect(settings).not.toHaveProperty('disable_duet');
    expect(settings).not.toHaveProperty('disable_stitch');
    expect(settings).not.toHaveProperty('is_ai_generated');
    expect(settings.disable_comment).toBe(true);
  });

  it('brand flags are only set while disclosure is on', () => {
    const off = { ...defaultTikTokOptions(), your_brand: true };
    expect(tiktokSettings(off, true).is_brand_organic).toBe(false);
    const on = { ...off, commercial_disclosure: true };
    expect(tiktokSettings(on, true).is_brand_organic).toBe(true);
  });
});

describe('tiktokOptionsFromSettings', () => {
  it('inverts tiktokSettings (disable_* → allow_*, flags → disclosure)', () => {
    const v = {
      ...defaultTikTokOptions(),
      privacy_level: 'MUTUAL_FOLLOW_FRIENDS' as const,
      allow_comment: true,
      commercial_disclosure: true,
      branded_content: true,
      ai_generated: true,
    };
    expect(tiktokOptionsFromSettings(tiktokSettings(v, true))).toEqual({
      ...v,
      privacy_level: undefined,
    });
  });

  it('reads absent flags as the permissive default', () => {
    expect(tiktokOptionsFromSettings({})).toMatchObject({
      allow_comment: true,
      allow_duet: true,
      allow_stitch: true,
      commercial_disclosure: false,
      ai_generated: false,
    });
  });
});

describe('tiktokDurationError', () => {
  const clip = (duration_ms: number | null): MediaResource => ({
    id: 'med_1',
    object: 'media',
    profile_id: 'prof_1',
    kind: 'video',
    content_type: 'video/mp4',
    status: 'ready',
    progress: { stage: 'done', percent: 100 },
    raw: false,
    error: null,
    source: {
      format: 'video/mp4',
      bytes: 1,
      width: 1080,
      height: 1920,
      duration_ms,
    },
    alt_text: null,
    per_platform: {},
    external_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  });

  it('blocks a known over-limit video', () => {
    expect(tiktokDurationError([clip(601_000)], creatorInfo, true)).toMatch(
      /max 600s/,
    );
  });

  it('never false-blocks (photo, no info, unknown or in-limit duration)', () => {
    expect(tiktokDurationError([clip(601_000)], creatorInfo, false)).toBeNull();
    expect(tiktokDurationError([clip(601_000)], null, true)).toBeNull();
    expect(tiktokDurationError([clip(null)], creatorInfo, true)).toBeNull();
    expect(tiktokDurationError([clip(600_000)], creatorInfo, true)).toBeNull();
  });
});

describe('tiktokOptionsReady', () => {
  it('a photo requires an audience and a complete disclosure', () => {
    expect(tiktokOptionsReady(defaultTikTokOptions(), false)).toBe(false);
    const chosen = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(tiktokOptionsReady(chosen, false)).toBe(true);
    expect(
      tiktokOptionsReady({ ...chosen, commercial_disclosure: true }, false),
    ).toBe(false);
  });

  it('a video is ready without an audience but still needs a complete disclosure', () => {
    expect(tiktokOptionsReady(defaultTikTokOptions(), true)).toBe(true);
    expect(
      tiktokOptionsReady(
        { ...defaultTikTokOptions(), commercial_disclosure: true },
        true,
      ),
    ).toBe(false);
  });

  it('is false for branded content on a private (SELF_ONLY) photo', () => {
    expect(
      tiktokOptionsReady(
        {
          ...defaultTikTokOptions(),
          privacy_level: 'SELF_ONLY',
          commercial_disclosure: true,
          branded_content: true,
        },
        false,
      ),
    ).toBe(false);
  });
});

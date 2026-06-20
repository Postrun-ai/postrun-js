import { describe, expect, it } from 'vitest';

import type { TikTokCreatorInfo } from './resources';
import {
  audiencePrivacyOptions,
  audienceUnselected,
  brandedContentDeclared,
  commercialDisclosureIncomplete,
  commercialLabelNotice,
  defaultTikTokOptions,
  interactionRows,
  interactionValueKey,
  isInteractionForbidden,
  parsePrivacyLevel,
  privacyChoices,
  setBrandKind,
  setCommercialDisclosure,
  tiktokOptionsReady,
  tiktokSettings,
  toggleInteraction,
} from './tiktok-options';

/**
 * The TikTok-options logic is the SINGLE source for TikTok's Required-UX rules
 * (no-default audience, creator-gated interactions, commercial disclosure,
 * allow→disable mapping). These tests pin the compliance-critical behaviours.
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
    expect(v.aigc).toBe(false);
  });
});

describe('audience', () => {
  it('offers every creator-allowed level by default', () => {
    expect(
      audiencePrivacyOptions(creatorInfo.privacy_options, defaultTikTokOptions()),
    ).toEqual(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY']);
  });

  it('drops SELF_ONLY when branded content is disclosed (cannot be private)', () => {
    const v = { ...defaultTikTokOptions(), commercial_disclosure: true, branded_content: true };
    expect(audiencePrivacyOptions(creatorInfo.privacy_options, v)).toEqual([
      'PUBLIC_TO_EVERYONE',
      'MUTUAL_FOLLOW_FRIENDS',
    ]);
  });

  it('audienceUnselected is true until a level is chosen (no default)', () => {
    expect(audienceUnselected(defaultTikTokOptions())).toBe(true);
    expect(
      audienceUnselected({ ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' }),
    ).toBe(false);
  });

  it('parsePrivacyLevel narrows only to offered values', () => {
    expect(parsePrivacyLevel('SELF_ONLY', creatorInfo.privacy_options)).toBe('SELF_ONLY');
    expect(parsePrivacyLevel('NONSENSE', creatorInfo.privacy_options)).toBeUndefined();
  });

  it('privacyChoices pairs each level with its label', () => {
    expect(privacyChoices(['SELF_ONLY'])).toEqual([
      { level: 'SELF_ONLY', label: 'Only you' },
    ]);
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

  it('enabling branded content clears a private audience', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(setBrandKind(v, 'branded_content', true).privacy_level).toBeUndefined();
  });

  it('your-brand does not clear the audience', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(setBrandKind(v, 'your_brand', true).privacy_level).toBe('SELF_ONLY');
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
  it('video inverts allow→disable and includes duet/stitch/aigc', () => {
    const v = {
      ...defaultTikTokOptions(),
      privacy_level: 'PUBLIC_TO_EVERYONE' as const,
      allow_comment: true,
      allow_duet: false,
      allow_stitch: true,
      aigc: true,
    };
    expect(tiktokSettings(v, true)).toEqual({
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_comment: false,
      disable_duet: true,
      disable_stitch: false,
      brand_organic_toggle: false,
      brand_content_toggle: false,
      is_aigc: true,
    });
  });

  it('photo omits the video-only fields (duet/stitch/aigc)', () => {
    const v = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    const settings = tiktokSettings(v, false);
    expect(settings).not.toHaveProperty('disable_duet');
    expect(settings).not.toHaveProperty('disable_stitch');
    expect(settings).not.toHaveProperty('is_aigc');
    expect(settings.disable_comment).toBe(true);
  });

  it('brand toggles are only set while disclosure is on', () => {
    const off = { ...defaultTikTokOptions(), your_brand: true };
    expect(tiktokSettings(off, true).brand_organic_toggle).toBe(false);
    const on = { ...off, commercial_disclosure: true };
    expect(tiktokSettings(on, true).brand_organic_toggle).toBe(true);
  });
});

describe('tiktokOptionsReady', () => {
  it('requires an audience and a complete disclosure', () => {
    expect(tiktokOptionsReady(defaultTikTokOptions())).toBe(false);
    const chosen = { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY' as const };
    expect(tiktokOptionsReady(chosen)).toBe(true);
    expect(
      tiktokOptionsReady({ ...chosen, commercial_disclosure: true }),
    ).toBe(false); // disclosure on, no brand picked
  });

  it('is false for branded content on a private (SELF_ONLY) post', () => {
    expect(
      tiktokOptionsReady({
        ...defaultTikTokOptions(),
        privacy_level: 'SELF_ONLY',
        commercial_disclosure: true,
        branded_content: true,
      }),
    ).toBe(false);
  });
});

'use client';

import type { TikTokCreatorInfo, TikTokOptionsValue } from '@postrun/js';
import {
  TIKTOK_AUDIENCE_REQUIRED_HINT,
  audiencePrivacyOptions,
  audienceUnselected,
  parsePrivacyLevel,
} from '@postrun/js';
import type { CSSProperties } from 'react';

import { Hint, SectionLabel, TOKENS } from './ui';

/**
 * The audience / privacy selector — PHOTO posts only (TikTok publishes videos
 * publicly). We make the user choose with NO default, so the select opens on a
 * disabled placeholder and an unchosen value shows the required hint. Options come from the creator's allowed set;
 * a private audience stays visible but disabled (with its reason) while branded
 * content is disclosed (see `audiencePrivacyOptions`).
 */
export function AudienceSelect({
  creatorInfo,
  value,
  onChange,
}: {
  creatorInfo: TikTokCreatorInfo;
  value: TikTokOptionsValue;
  onChange: (value: TikTokOptionsValue) => void;
}) {
  const choices = audiencePrivacyOptions(creatorInfo.privacy_options, value);
  const enabled = choices.flatMap((c) => (c.disabled ? [] : [c.level]));
  const reason = choices.find((c) => c.disabled)?.disabledReason;
  const unselected = audienceUnselected(value, false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionLabel>Who can view this post</SectionLabel>
      <select
        aria-label="Who can view this post"
        value={value.privacy_level ?? ''}
        onChange={(e) =>
          onChange({
            ...value,
            // Validate against the ENABLED options so a manipulated value
            // (e.g. SELF_ONLY while branded) can't slip in.
            privacy_level: parsePrivacyLevel(e.target.value, enabled),
          })
        }
        style={selectStyle}
      >
        <option value="" disabled>
          Select who can view this post
        </option>
        {choices.map((choice) => (
          <option
            key={choice.level}
            value={choice.level}
            disabled={choice.disabled}
            title={choice.disabledReason}
          >
            {choice.label}
          </option>
        ))}
      </select>
      {reason ? <Hint>{reason}</Hint> : null}
      {unselected ? <Hint>{TIKTOK_AUDIENCE_REQUIRED_HINT}</Hint> : null}
    </div>
  );
}

const selectStyle: CSSProperties = {
  width: '100%',
  appearance: 'none',
  background: 'transparent',
  color: 'inherit',
  border: `1px solid ${TOKENS.BORDER}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

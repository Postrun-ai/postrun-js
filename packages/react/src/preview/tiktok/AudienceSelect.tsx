'use client';

import type { TikTokCreatorInfo, TikTokOptionsValue } from '@postrun/js';
import {
  TIKTOK_AUDIENCE_REQUIRED_HINT,
  audiencePrivacyOptions,
  audienceUnselected,
  parsePrivacyLevel,
  tiktokPrivacyLabel,
} from '@postrun/js';
import type { CSSProperties } from 'react';

import { Hint, SectionLabel, TOKENS } from './ui';

/**
 * The audience / privacy selector — MUST #5. TikTok mandates an explicit choice
 * with NO default, so the select opens on a disabled placeholder and an unchosen
 * value shows the required hint. Options come from the creator's allowed set;
 * branded content drops SELF_ONLY (handled in `audiencePrivacyOptions`).
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
  const options = audiencePrivacyOptions(creatorInfo.privacy_options, value);
  const unselected = audienceUnselected(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionLabel>Who can view this post</SectionLabel>
      <select
        aria-label="Who can view this post"
        value={value.privacy_level ?? ''}
        onChange={(e) =>
          onChange({
            ...value,
            // Validate against the OFFERED (filtered) options, not the full set —
            // so a manipulated value (e.g. SELF_ONLY while branded) can't slip in.
            privacy_level: parsePrivacyLevel(e.target.value, options),
          })
        }
        style={selectStyle}
      >
        <option value="" disabled>
          Select who can view this post
        </option>
        {options.map((level) => (
          <option key={level} value={level}>
            {tiktokPrivacyLabel(level)}
          </option>
        ))}
      </select>
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

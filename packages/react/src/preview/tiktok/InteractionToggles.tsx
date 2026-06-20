'use client';

import type { TikTokCreatorInfo, TikTokOptionsValue } from '@postrun/js';
import { interactionRows, interactionValueKey, toggleInteraction } from '@postrun/js';

import { Row, SectionLabel, Switch } from './ui';

/**
 * The interaction toggles — MUST #6. Video shows Comment / Duet / Stitch; a photo
 * post shows only Comment (TikTok mandate). None default on; an interaction the
 * creator forbids renders disabled and forced off. The rows + the forbidden flags
 * come from `interactionRows` (the single source).
 */
export function InteractionToggles({
  creatorInfo,
  value,
  onChange,
  isVideo,
}: {
  creatorInfo: TikTokCreatorInfo;
  value: TikTokOptionsValue;
  onChange: (value: TikTokOptionsValue) => void;
  isVideo: boolean;
}) {
  const rows = interactionRows(creatorInfo, isVideo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionLabel>Allow users to</SectionLabel>
      {rows.map((row) => {
        const on = Boolean(value[interactionValueKey(row.key)]);
        return (
          <Row
            key={row.key}
            label={row.label}
            sublabel={row.disabled ? 'Turned off by this creator' : undefined}
            control={
              <Switch
                checked={!row.disabled && on}
                disabled={row.disabled}
                ariaLabel={`Allow ${row.label}`}
                onChange={(next) => onChange(toggleInteraction(value, row.key, next))}
              />
            }
          />
        );
      })}
    </div>
  );
}

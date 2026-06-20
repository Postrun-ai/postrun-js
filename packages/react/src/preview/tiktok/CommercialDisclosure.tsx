'use client';

import type { TikTokOptionsValue } from '@postrun/js';
import {
  TIKTOK_DISCLOSURE_REQUIRED_HINT,
  commercialDisclosureIncomplete,
  commercialLabelNotice,
  setBrandKind,
  setCommercialDisclosure,
} from '@postrun/js';

import { CheckRow, Hint, Notice, Row, SectionLabel, Switch } from './ui';

/**
 * Commercial-content disclosure — MUST #7. Off by default. When on, the user must
 * pick at least one of "Your brand" / "Branded content" (else the required hint
 * blocks publish), and the resulting label notice is shown verbatim:
 *   Your brand     → "Your photo/video will be labeled as 'Promotional content'"
 *   Branded content→ "Your photo/video will be labeled as 'Paid partnership'"
 * Branded content can't be private (handled in `setBrandKind` / the audience list).
 */
export function CommercialDisclosure({
  value,
  onChange,
}: {
  value: TikTokOptionsValue;
  onChange: (value: TikTokOptionsValue) => void;
}) {
  const labelNotice = commercialLabelNotice(value);
  const incomplete = commercialDisclosureIncomplete(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionLabel>Disclose post content</SectionLabel>
      <Row
        label="Disclose commercial content"
        sublabel="Turn on if this post promotes a brand, product, or service."
        control={
          <Switch
            checked={value.commercial_disclosure}
            ariaLabel="Disclose commercial content"
            onChange={(next) => onChange(setCommercialDisclosure(value, next))}
          />
        }
      />

      {value.commercial_disclosure ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 2 }}>
          <CheckRow
            label="Your brand"
            checked={value.your_brand}
            onChange={(next) => onChange(setBrandKind(value, 'your_brand', next))}
          />
          <CheckRow
            label="Branded content"
            checked={value.branded_content}
            onChange={(next) => onChange(setBrandKind(value, 'branded_content', next))}
          />
          {incomplete ? <Hint>{TIKTOK_DISCLOSURE_REQUIRED_HINT}</Hint> : null}
          {labelNotice ? <Notice>{labelNotice}</Notice> : null}
        </div>
      ) : null}
    </div>
  );
}

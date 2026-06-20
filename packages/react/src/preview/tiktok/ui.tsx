'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { TT_VAR, varRef } from './theme';

/**
 * Small shared controls for the TikTok publish panel — a switch, a labelled row,
 * and a required-field hint. Colours come from the panel theme variables
 * (`var(--pr-tt-*)`), so every control adapts to light/dark without a fork.
 */

const MUTED = varRef(TT_VAR.muted);
const BORDER = varRef(TT_VAR.border);
const ACCENT = varRef(TT_VAR.accent);
const SWITCH_OFF = varRef(TT_VAR.switchOff);
/** "On" stays a literal green in both themes (universally reads as enabled). */
const ON = '#34c759';

/** A labelled control row: title (+ optional sublabel) on the left, control on
 * the right. */
export function Row({
  label,
  sublabel,
  control,
  htmlFor,
}: {
  label: string;
  sublabel?: string;
  control: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div style={rowStyle}>
      <label htmlFor={htmlFor} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        {sublabel ? <span style={{ fontSize: 12, color: MUTED }}>{sublabel}</span> : null}
      </label>
      {control}
    </div>
  );
}

/** An iOS-style switch. Disabled renders dimmed and is non-interactive. */
export function Switch({
  checked,
  onChange,
  disabled,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        ...switchTrackStyle,
        background: checked ? ON : SWITCH_OFF,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        style={{
          ...switchKnobStyle,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

/** A section heading inside the panel. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

/** A required / error hint line (red). */
export function Hint({ children }: { children: ReactNode }) {
  return <p style={hintStyle}>{children}</p>;
}

/** A neutral notice line (muted). */
export function Notice({ children }: { children: ReactNode }) {
  return <p style={noticeStyle}>{children}</p>;
}

/** A labelled checkbox row (used for the brand-disclosure options). */
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} style={checkRowStyle}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: ACCENT, width: 16, height: 16 }}
      />
      <span style={{ fontSize: 14 }}>{label}</span>
    </label>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 36,
};

const switchTrackStyle: CSSProperties = {
  position: 'relative',
  width: 40,
  height: 24,
  borderRadius: 999,
  border: 0,
  padding: 2,
  flex: '0 0 auto',
  transition: 'background 160ms ease',
};

const switchKnobStyle: CSSProperties = {
  display: 'block',
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
  transition: 'transform 160ms ease',
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
};

const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: ACCENT,
  lineHeight: 1.4,
};

const noticeStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: MUTED,
  lineHeight: 1.4,
};

const checkRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
};

export const TOKENS = { MUTED, BORDER, ACCENT, ON };

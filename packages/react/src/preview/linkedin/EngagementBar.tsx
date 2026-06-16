import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { FiMessageSquare, FiRepeat, FiSend, FiThumbsUp } from 'react-icons/fi';

import { LI_VAR, varRef } from './theme';

/**
 * The static LinkedIn action bar — Like / Comment / Repost / Send. Real Feather
 * icons (via react-icons) + labels, no fabricated reaction counts (a draft has
 * none). Honest, like the X preview's footer.
 */

const ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  borderTop: `1px solid ${varRef(LI_VAR.border)}`,
  marginTop: 8,
  padding: '4px 8px',
};

const ITEM: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px',
  color: varRef(LI_VAR.muted),
  fontSize: 14,
  fontWeight: 600,
};

const ACTIONS: { label: string; Icon: IconType }[] = [
  { label: 'Like', Icon: FiThumbsUp },
  { label: 'Comment', Icon: FiMessageSquare },
  { label: 'Repost', Icon: FiRepeat },
  { label: 'Send', Icon: FiSend },
];

export function EngagementBar() {
  return (
    <div style={ROW}>
      {ACTIONS.map(({ label, Icon }) => (
        <span key={label} style={ITEM}>
          <Icon size={20} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

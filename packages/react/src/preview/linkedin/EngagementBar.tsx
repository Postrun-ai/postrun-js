import type { CSSProperties } from 'react';

import { LI_VAR, varRef } from './theme';

/**
 * The static LinkedIn action bar — Like / Comment / Repost / Send. Icons + labels
 * only, no fabricated reaction counts (a draft has none). Honest, like the X
 * preview's footer.
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
  padding: '8px 8px',
  color: varRef(LI_VAR.muted),
  fontSize: 14,
  fontWeight: 600,
};

const ICON: CSSProperties = { width: 20, height: 20, fill: 'currentColor' };

const ACTIONS = [
  {
    label: 'Like',
    path: 'M12.785 2.477a2.5 2.5 0 014.213 2.69L15.6 8.5H19a2 2 0 011.94 2.49l-1.5 6A2 2 0 0117.5 18.5H8V8.6l4.785-6.123zM6 9H3a1 1 0 00-1 1v7a1 1 0 001 1h3V9z',
  },
  {
    label: 'Comment',
    path: 'M7 9h10v1H7V9zm0 4h7v-1H7v1zm16-2a9 9 0 01-13.36 7.87L3 20l1.13-6.64A9 9 0 1123 11zm-2 0a7 7 0 10-11.95 4.95l.34.34-.57 3.34 3.34-.57.34.34A7 7 0 0021 11z',
  },
  {
    label: 'Repost',
    path: 'M14 5l4 4-4 4V10H8a2 2 0 00-2 2v2H4v-2a4 4 0 014-4h6V5zM10 19l-4-4 4-4v3h6a2 2 0 002-2V9h2v3a4 4 0 01-4 4h-6v3z',
  },
  {
    label: 'Send',
    path: 'M3 3l18 9-18 9 4-9-4-9zm3.5 9L4.8 16.6 16 12 4.8 7.4 6.5 12z',
  },
];

export function EngagementBar() {
  return (
    <div style={ROW}>
      {ACTIONS.map((action) => (
        <span key={action.label} style={ITEM}>
          <svg viewBox="0 0 24 24" style={ICON} aria-hidden="true">
            <path d={action.path} />
          </svg>
          {action.label}
        </span>
      ))}
    </div>
  );
}

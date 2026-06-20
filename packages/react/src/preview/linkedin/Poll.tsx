import type { LinkedInPostVariant } from '@postrun/js';
import { linkedinPollDurationLabel } from '@postrun/js';
import type { CSSProperties } from 'react';

import { LI_VAR, varRef } from './theme';

/**
 * A LinkedIn poll (`content_kind: 'poll'`) — the question, the 2–4 option rows
 * (rendered as the pre-vote outlined buttons LinkedIn shows), and the footer
 * ("0 votes • <duration>"). A fresh poll has no votes, so we never fabricate
 * counts. Driven straight from `settings.poll`.
 */

/** The poll settings shape — derived from the contract, never re-declared. */
type LinkedInPoll = NonNullable<
  NonNullable<LinkedInPostVariant['settings']>['poll']
>;

export interface PollProps {
  poll: LinkedInPoll;
}

export function Poll({ poll }: PollProps) {
  return (
    <div style={wrapStyle}>
      <div style={questionStyle}>{poll.question}</div>
      <div style={optionsStyle}>
        {poll.options.map((option, i) => (
          <div key={`${option}-${i}`} style={optionStyle}>
            {option}
          </div>
        ))}
      </div>
      <div style={footerStyle}>
        0 votes • {linkedinPollDurationLabel(poll.duration)}
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  border: `1px solid ${varRef(LI_VAR.border)}`,
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const questionStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: varRef(LI_VAR.text),
  lineHeight: 1.35,
};

const optionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const optionStyle: CSSProperties = {
  border: `1px solid ${varRef(LI_VAR.accent)}`,
  borderRadius: 999,
  padding: '8px 16px',
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: varRef(LI_VAR.accent),
};

const footerStyle: CSSProperties = {
  fontSize: 12,
  color: varRef(LI_VAR.muted),
};

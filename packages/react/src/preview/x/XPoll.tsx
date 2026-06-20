import type { XPoll as XPollSettings } from '@postrun/js';
import { xPollDurationLabel } from '@postrun/js';
import type { CSSProperties } from 'react';

/**
 * An X poll (`settings.poll`) rendered in the post preview — the 2–4 options as
 * X's pre-vote outlined buttons, then an honest "0 votes · <time left>" footer
 * (a draft poll has no votes; never fabricate counts). Colors inherit
 * react-tweet's CSS variables, so it matches the card in light and dark.
 */

export interface XPollProps {
  poll: XPollSettings;
}

export function XPoll({ poll }: XPollProps) {
  return (
    <div style={wrapStyle}>
      {poll.options.map((option, i) => (
        <div key={`${option}-${i}`} style={optionStyle}>
          {option}
        </div>
      ))}
      <div style={footerStyle}>
        0 votes · {xPollDurationLabel(poll.duration_minutes)}
      </div>
    </div>
  );
}

const BLUE = 'var(--tweet-color-blue-primary, #1d9bf0)';
const MUTED = 'var(--tweet-color-gray-secondary, #536471)';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 12,
};

const optionStyle: CSSProperties = {
  border: `1px solid ${BLUE}`,
  color: BLUE,
  borderRadius: 999,
  padding: '8px 16px',
  textAlign: 'center',
  fontSize: 15,
  fontWeight: 700,
};

const footerStyle: CSSProperties = {
  fontSize: 13,
  color: MUTED,
  marginTop: 2,
};

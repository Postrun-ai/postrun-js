import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { XPoll } from './XPoll';

describe('<XPoll>', () => {
  it('renders every option and an honest 0-vote / duration footer', () => {
    render(
      <XPoll
        poll={{
          options: ['Ship it', 'Wait a week'],
          duration_minutes: 1440,
        }}
      />,
    );
    expect(screen.getByText('Ship it')).toBeDefined();
    expect(screen.getByText('Wait a week')).toBeDefined();
    expect(screen.getByText(/0 votes/)).toBeDefined();
    expect(screen.getByText(/1 day left/)).toBeDefined();
  });
});

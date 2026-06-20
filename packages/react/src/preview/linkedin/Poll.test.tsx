import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Poll } from './Poll';

describe('<Poll>', () => {
  it('renders the question, every option, and the duration footer', () => {
    render(
      <Poll
        poll={{
          question: 'Best deploy day?',
          options: ['Monday', 'Wednesday', 'Friday'],
          duration: 'SEVEN_DAYS',
        }}
      />,
    );
    expect(screen.getByText('Best deploy day?')).toBeDefined();
    expect(screen.getByText('Monday')).toBeDefined();
    expect(screen.getByText('Wednesday')).toBeDefined();
    expect(screen.getByText('Friday')).toBeDefined();
    expect(screen.getByText(/1 week left/)).toBeDefined();
    // a fresh poll has no votes — never fabricate counts
    expect(screen.getByText(/0 votes/)).toBeDefined();
  });
});

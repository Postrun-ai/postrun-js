import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostBody } from './PostBody';

const colors = { accent: 'rgb(10,102,194)', muted: '#666' };

describe('<PostBody>', () => {
  it('renders short text in full with no "…more" control', () => {
    render(<PostBody text="Quick update for the team." colors={colors} />);

    expect(screen.getByText(/Quick update for the team\./)).toBeDefined();
    expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
  });

  it('folds long text behind "…more" and reveals it on click', () => {
    const tail = 'THE_HIDDEN_TAIL_SENTENCE';
    const text = `${'word '.repeat(60)}${tail}`; // > fold threshold

    render(<PostBody text={text} colors={colors} />);

    // Tail is hidden while collapsed.
    expect(screen.queryByText(new RegExp(tail))).toBeNull();
    const more = screen.getByRole('button', { name: /more/i });

    fireEvent.click(more);

    expect(screen.getByText(new RegExp(tail))).toBeDefined();
  });

  it('highlights a hashtag as a styled link', () => {
    render(<PostBody text="big news #launch today" colors={colors} />);
    const tag = screen.getByText('#launch');
    expect(tag.tagName.toLowerCase()).toBe('a');
  });

  it('highlights a URL as a link with the right href', () => {
    render(<PostBody text="see https://postrun.ai now" colors={colors} />);
    const link = screen.getByText('https://postrun.ai');
    expect(link.getAttribute('href')).toBe('https://postrun.ai');
  });

  it('highlights a provided @mention name', () => {
    render(
      <PostBody
        text="welcome Acme Studio to the team"
        mentionNames={['Acme Studio']}
        colors={colors}
      />,
    );
    expect(screen.getByText('Acme Studio')).toBeDefined();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeTextLayout } from '../test-helpers';
import { PostBody } from './PostBody';

const colors = { accent: 'rgb(10,102,194)', muted: '#666' };

/** LinkedIn folds at 3 lines: 3 × 40 chars, less the 6 of "… more". */
const LEAD = `${'word '.repeat(21)}the order`;

describe('<PostBody>', () => {
  beforeEach(() => {
    fakeTextLayout(40);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('collapses again when "see less" is clicked after expanding', () => {
    const tail = 'THE_HIDDEN_TAIL_SENTENCE';
    const text = `${'word '.repeat(60)}${tail}`;
    render(<PostBody text={text} colors={colors} />);

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByText(new RegExp(tail))).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /see less/i }));
    expect(screen.queryByText(new RegExp(tail))).toBeNull();
  });

  it('folds at three lines on a word, with no "." before "… more"', () => {
    const { container } = render(
      <PostBody text={`${LEAD}. Then it ships tomorrow with tracking.`} colors={colors} />,
    );
    expect(container.textContent).toBe(`${LEAD}… more`);
  });

  it('keeps a hashtag highlighted inside the folded text', () => {
    render(<PostBody text={`#launch ${LEAD}. Then it ships tomorrow.`} colors={colors} />);
    expect(screen.getByRole('button', { name: 'more' })).toBeDefined();
    expect(screen.getByText('#launch').tagName.toLowerCase()).toBe('a');
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

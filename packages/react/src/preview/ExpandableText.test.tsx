import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpandableText, findFold } from './ExpandableText';
import { fakeTextLayout } from './test-helpers';

describe('findFold', () => {
  it('shows the whole text when it fits', () => {
    expect(findFold('short caption', () => true)).toBe('short caption'.length);
  });

  it('ends the fold on a whole word', () => {
    const text = 'hello world again';
    expect(text.slice(0, findFold(text, (end) => end <= 8))).toBe('hello');
  });

  it.each(['order.', 'order,', 'order!', 'order…', 'order —', 'order!!! 🎉', '“order.”'])(
    'leaves no punctuation before the ellipsis (%s)',
    (cut) => {
      const text = `Place the ${cut} Then wait for the box`;
      const shown = text.slice(0, findFold(text, (end) => end <= `Place the ${cut}`.length));
      expect(shown).toMatch(/order$/);
    },
  );

  it('folds scripts written without spaces at a word, not at the end', () => {
    const text = '今日はとても良い天気ですね。明日も晴れるといいですね。';
    const end = findFold(text, (n) => n <= 10);
    expect(end).toBeGreaterThan(0);
    expect(end).toBeLessThanOrEqual(10);
  });

  it('keeps the first word when even that does not fit', () => {
    const text = 'Supercalifragilistic word';
    expect(text.slice(0, findFold(text, (end) => end <= 3))).toBe('Supercalifragilistic');
  });

  it('binary-searches, so a long caption costs a few measurements', () => {
    const fits = vi.fn((end: number) => end <= 2500);
    findFold('word '.repeat(1000), fits);
    expect(fits.mock.calls.length).toBeLessThanOrEqual(12);
  });
});

/** 2 lines of 40 chars fit 80 chars, and the fold's "… more" takes 6 of them. */
const LEAD = `${'word '.repeat(13)}the order`;
const LONG = `${LEAD}. Then the parcel ships tomorrow morning with tracking.`;

describe('<ExpandableText>', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the whole text and no toggle when it fits', () => {
    fakeTextLayout(40);
    render(<ExpandableText text="short caption" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('short caption')).toBeDefined();
  });

  it('cuts at a word with "… more" inline after it, never "order.…"', () => {
    fakeTextLayout(40);
    const { container } = render(<ExpandableText text={LONG} lines={2} />);

    expect(container.textContent).toBe(`${LEAD}… more`);
    const more = screen.getByRole('button', { name: 'more' });
    const text = screen.getByText(/the order…/);
    expect(text.lastChild).toBe(more);
  });

  it('expands to the full text with "less" inline, and folds again', () => {
    fakeTextLayout(40);
    const { container } = render(<ExpandableText text={LONG} lessLabel="see less" />);

    fireEvent.click(screen.getByRole('button', { name: 'more' }));
    expect(container.textContent).toBe(`${LONG} see less`);
    expect(screen.getByRole('button', { name: 'see less' }).getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'see less' }));
    expect(container.textContent).toBe(`${LEAD}… more`);
  });

  it('renders the visible slice through `render`, keeping its markup', () => {
    fakeTextLayout(40);
    render(
      <ExpandableText
        text={`#launch ${LONG}`}
        render={(shown) => (
          <>
            <a href="#">{shown.slice(0, 7)}</a>
            {shown.slice(7)}
          </>
        )}
      />,
    );
    expect(screen.getByText('#launch').tagName).toBe('A');
    expect(screen.getByRole('button', { name: 'more' })).toBeDefined();
  });

  it('folds when the text grows past the fold (live composer edits)', () => {
    fakeTextLayout(40);
    const { rerender } = render(<ExpandableText text="short caption" />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ExpandableText text={LONG} />);
    expect(screen.getByRole('button', { name: 'more' })).toBeDefined();
  });

  it('re-measures when the card is resized', () => {
    const resized: Array<() => void> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const layout = fakeTextLayout(40);
    const { container } = render(<ExpandableText text={LONG} />);
    expect(container.textContent).toBe(`${LEAD}… more`);

    layout.resize(200);
    act(() => resized.forEach((callback) => callback()));

    expect(container.textContent).toBe(LONG);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpandableText } from './ExpandableText';

describe('<ExpandableText>', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows no toggle when the text fits (no overflow)', () => {
    render(<ExpandableText lines={2}>short caption</ExpandableText>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('short caption')).toBeDefined();
  });

  it('shows "more" when overflowing and toggles expand/collapse on click', () => {
    // jsdom reports 0 for layout metrics — force an overflow.
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40);

    render(<ExpandableText lines={2}>a long caption that overflows two lines</ExpandableText>);

    const more = screen.getByRole('button', { name: /show more/i });
    expect(more.textContent).toBe('more');

    fireEvent.click(more);
    const less = screen.getByRole('button', { name: /show less/i });
    expect(less.textContent).toBe('less');

    fireEvent.click(less);
    expect(screen.getByRole('button', { name: /show more/i }).textContent).toBe('more');
  });
});

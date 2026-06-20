import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TikTokCaptionField, captionMaxFor } from './CaptionField';

/** The editable caption (MUST #2) — correct cap per post_type, live edits. */
describe('<TikTokCaptionField>', () => {
  it('caps a video title at 2200 and a photo description at 4000', () => {
    expect(captionMaxFor('video')).toBe(2200);
    expect(captionMaxFor('carousel')).toBe(4000);
    expect(captionMaxFor('single_image')).toBe(4000);
  });

  it('shows the live count against the post-type cap', () => {
    render(
      <TikTokCaptionField value="hello" onChange={() => {}} postType="video" />,
    );
    expect(screen.getByText('5 / 2,200')).toBeDefined();
  });

  it('fires onChange with the edited text', () => {
    const onChange = vi.fn();
    render(
      <TikTokCaptionField value="" onChange={onChange} postType="carousel" />,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new caption' },
    });
    expect(onChange).toHaveBeenCalledWith('new caption');
  });
});

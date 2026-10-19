import type { TikTokCreatorInfo, TikTokOptionsValue, TikTokPostVariant } from '@postrun/js';
import { defaultTikTokOptions } from '@postrun/js';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TikTokPublishPanel } from './PublishPanel';

const creatorInfo: TikTokCreatorInfo = {
  creator: { nickname: 'Acme', username: 'acme', avatar_url: null },
  privacy_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

const variant: TikTokPostVariant = {
  platform: 'tiktok',
  connection_id: 'conn_1',
  body: 'hello',
  media: [{ media_id: 'med_1' }],
  settings: {},
};

function renderPanel(
  options: TikTokOptionsValue,
  onPost = vi.fn(),
  extra: Partial<React.ComponentProps<typeof TikTokPublishPanel>> = {},
) {
  render(
    <TikTokPublishPanel
      variant={variant}
      postType="video"
      creatorInfo={creatorInfo}
      caption="hello"
      onCaptionChange={() => {}}
      options={options}
      onOptionsChange={() => {}}
      onPost={onPost}
      {...extra}
    />,
  );
  return onPost;
}

const ready: TikTokOptionsValue = {
  ...defaultTikTokOptions(),
  privacy_level: 'SELF_ONLY',
};

describe('<TikTokPublishPanel> — consent gate (#9) + readiness', () => {
  it('disables a photo Post until an audience is chosen', () => {
    renderPanel(defaultTikTokOptions(), vi.fn(), { postType: 'single_image' });
    const post = screen.getByRole('button', { name: 'Post' });
    expect(post.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Choose who can view/)).toBeDefined();
  });

  it('a video has no audience control and is ready without one', () => {
    renderPanel(defaultTikTokOptions());
    expect(screen.queryByLabelText('Who can view this post')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('does NOT auto-post and only fires onPost on an explicit click', () => {
    const onPost = renderPanel(ready);
    expect(onPost).not.toHaveBeenCalled(); // nothing on render
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(onPost).toHaveBeenCalledTimes(1);
  });

  it('shows the processing notice (#10)', () => {
    renderPanel(ready);
    expect(screen.getByText(/may take a few minutes/)).toBeDefined();
  });

  it('disables Post when the caption exceeds the cap (#2)', () => {
    renderPanel(ready, vi.fn(), { caption: 'a'.repeat(2201) });
    expect(
      screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('disables Post for branded content on a private (SELF_ONLY) photo', () => {
    renderPanel(
      {
        ...ready,
        privacy_level: 'SELF_ONLY',
        commercial_disclosure: true,
        branded_content: true,
      },
      vi.fn(),
      { postType: 'single_image' },
    );
    expect(
      screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('hides the AIGC toggle on a photo post (video-only field)', () => {
    renderPanel(ready, vi.fn(), {
      postType: 'carousel',
      variant: {
        ...variant,
        media: [{ media_id: 'a' }, { media_id: 'b' }],
      },
    });
    expect(screen.queryByText('AI-generated content')).toBeNull();
  });
});

describe('<TikTokPublishPanel> — declaration (#8) switches with branded content', () => {
  it('shows only the Music Usage Confirmation by default', () => {
    renderPanel(ready);
    expect(screen.getByText('Music Usage Confirmation')).toBeDefined();
    expect(screen.queryByText('Branded Content Policy')).toBeNull();
  });

  it('adds the Branded Content Policy when branded content is disclosed', () => {
    renderPanel({
      ...ready,
      privacy_level: 'PUBLIC_TO_EVERYONE',
      commercial_disclosure: true,
      branded_content: true,
    });
    expect(screen.getByText('Branded Content Policy')).toBeDefined();
    expect(screen.getByText('Music Usage Confirmation')).toBeDefined();
  });
});

describe('<TikTokPublishPanel> — audience vs branded content', () => {
  it('locks Branded content (with the reason) while Only you is picked on a photo', () => {
    renderPanel(
      { ...defaultTikTokOptions(), privacy_level: 'SELF_ONLY', commercial_disclosure: true },
      vi.fn(),
      { postType: 'single_image' },
    );
    expect(
      screen.getByRole('checkbox', { name: /Branded content/ }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getAllByText('Branded content visibility cannot be set to private.')
        .length,
    ).toBeGreaterThan(0);
  });

  it('keeps Only you visible but disabled once branded content is chosen', () => {
    renderPanel(
      {
        ...defaultTikTokOptions(),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        commercial_disclosure: true,
        branded_content: true,
      },
      vi.fn(),
      { postType: 'single_image' },
    );
    const option = screen.getByRole('option', { name: 'Only you' });
    expect(option.hasAttribute('disabled')).toBe(true);
  });
});

describe('<TikTokPublishPanel> — interactions (#6)', () => {
  it('greys (disables) an interaction the creator forbids', () => {
    renderPanel(ready);
    const stitch = screen.getByRole('switch', { name: 'Allow Stitch' });
    expect(stitch.hasAttribute('disabled')).toBe(true);
  });
});

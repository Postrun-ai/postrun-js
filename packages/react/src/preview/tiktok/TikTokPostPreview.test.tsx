import type {
  PostVariant,
  TikTokCreatorInfo,
  TikTokPostVariant,
} from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { processingMedia, readyMedia, readyVideo } from '../test-helpers';
import { TikTokPostPreview } from './TikTokPostPreview';

// Embla reads `ownerWindow.matchMedia` (the jsdom window), which jsdom omits —
// define it on `window` directly so the carousel can mount in tests.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // Embla observes slides + resizes with these (absent in jsdom).
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: Observer,
  });
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: Observer,
  });
});

afterAll(() => {
  // @ts-expect-error — remove the test-only stubs.
  delete window.matchMedia;
  // @ts-expect-error — remove the test-only stubs.
  delete window.IntersectionObserver;
  // @ts-expect-error — remove the test-only stubs.
  delete window.ResizeObserver;
});

const creatorInfo: TikTokCreatorInfo = {
  creator: { nickname: 'Acme Studio', username: 'acmestudio', avatar_url: null },
  privacy_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

function ttVariant(
  overrides: Partial<TikTokPostVariant> = {},
): TikTokPostVariant {
  return {
    platform: 'tiktok',
    connection_id: 'conn_1',
    body: 'spring shoot',
    media: [{ media_id: 'med_1' }],
    settings: {},
    ...overrides,
  };
}

const videoMedia = [readyVideo('med_1', 'tiktok')];
const photoMedia = [readyMedia('a', 'tiktok'), readyMedia('b', 'tiktok')];

describe('<TikTokPostPreview>', () => {
  it('renders the handle (no @), caption and music row', () => {
    render(
      <TikTokPostPreview variant={ttVariant()} creatorInfo={creatorInfo} media={videoMedia} />,
    );
    expect(screen.getByText('acmestudio')).toBeDefined();
    expect(screen.getByText(/spring shoot/)).toBeDefined();
    expect(screen.getByText(/Original sound - Acme Studio/)).toBeDefined();
  });

  it('shows dashes for counts (never fabricated numbers)', () => {
    render(
      <TikTokPostPreview variant={ttVariant()} creatorInfo={creatorInfo} media={videoMedia} />,
    );
    // like / comment / bookmark / share
    expect(screen.getAllByText('‑‑‑')).toHaveLength(4);
  });

  it('renders a <video> for a video post', () => {
    const { container } = render(
      <TikTokPostPreview variant={ttVariant()} creatorInfo={creatorInfo} media={videoMedia} />,
    );
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('renders an image carousel for a photo post', () => {
    const { container } = render(
      <TikTokPostPreview
        variant={ttVariant({ media: [{ media_id: 'a' }, { media_id: 'b' }] })}
        creatorInfo={creatorInfo}
        media={photoMedia}
      />,
    );
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelectorAll('img').length).toBeGreaterThan(0);
  });

  it('shows the AIGC label only when is_aigc is set', () => {
    const { rerender } = render(
      <TikTokPostPreview variant={ttVariant()} creatorInfo={creatorInfo} media={videoMedia} />,
    );
    expect(screen.queryByText('Creator labeled as AI-generated')).toBeNull();

    rerender(
      <TikTokPostPreview
        variant={ttVariant({ settings: { is_aigc: true } })}
        creatorInfo={creatorInfo}
        media={videoMedia}
      />,
    );
    expect(screen.getByText('Creator labeled as AI-generated')).toBeDefined();
  });

  it('shows the commercial label from the disclosure toggles', () => {
    const { rerender } = render(
      <TikTokPostPreview
        variant={ttVariant({ settings: { brand_organic_toggle: true } })}
        creatorInfo={creatorInfo}
        media={videoMedia}
      />,
    );
    expect(screen.getByText('Promotional content')).toBeDefined();

    rerender(
      <TikTokPostPreview
        variant={ttVariant({ settings: { brand_content_toggle: true } })}
        creatorInfo={creatorInfo}
        media={videoMedia}
      />,
    );
    expect(screen.getByText('Paid partnership')).toBeDefined();
  });

  it('shows a processing skeleton when the asset is still processing', () => {
    render(
      <TikTokPostPreview
        variant={ttVariant()}
        creatorInfo={creatorInfo}
        media={[processingMedia('med_1')]}
      />,
    );
    expect(screen.getByText('Processing media…')).toBeDefined();
  });

  it('shows the empty state when there is no media', () => {
    render(
      <TikTokPostPreview
        variant={ttVariant({ media: [] })}
        creatorInfo={creatorInfo}
        media={[]}
      />,
    );
    expect(screen.getByText('No media yet')).toBeDefined();
  });

  it('accepts a FETCHED (read-shape) variant straight from the API', () => {
    const fetched: Extract<PostVariant, { platform: 'tiktok' }> = {
      platform: 'tiktok',
      post_type: 'video',
      id: 'pv_tt1',
      object: 'post_variant',
      connection_id: 'conn_1',
      body: 'fetched tiktok post',
      status: 'draft',
      schedule_at: null,
      result: null,
      error: null,
      media: [
        {
          media_id: 'med_1',
          position: 0,
          alt_text_override: null,
          media: readyVideo('med_1', 'tiktok'),
        },
      ],
      settings: {},
    };
    // No `media` prop — the read variant carries its asset inline.
    render(<TikTokPostPreview variant={fetched} creatorInfo={creatorInfo} />);
    expect(screen.getByText(/fetched tiktok post/)).toBeDefined();
  });
});

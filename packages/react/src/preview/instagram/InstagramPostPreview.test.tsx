import type { InstagramPostVariant, PostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  connection,
  readyMedia,
  readyVideo,
  processingMedia,
} from '../test-helpers';
import { InstagramPostPreview } from './InstagramPostPreview';

// Embla reads matchMedia + IntersectionObserver + ResizeObserver (absent in jsdom).
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
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

const conn = connection({ platform: 'instagram' });
const image = [readyMedia('m1', 'instagram', { alt_text: 'a cat' })];

function igVariant(
  overrides: Partial<InstagramPostVariant> = {},
): InstagramPostVariant {
  return {
    platform: 'instagram',
    post_type: 'single_image',
    connection_id: 'conn_1',
    body: '',
    media: [{ media_id: 'm1' }],
    settings: { media_type: 'IMAGE' },
    ...overrides,
  };
}

describe('<InstagramPostPreview>', () => {
  it('derives the username/avatar from the connection and renders image + caption', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({ body: 'spring shoot' })}
        connection={conn}
        media={image}
        verified
      />,
    );
    expect(screen.getAllByText('acmestudio').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Verified')).toBeDefined();
    expect(screen.getByAltText('a cat')).toBeDefined();
    expect(screen.getByText(/spring shoot/)).toBeDefined();
  });

  it('renders the like/comment/share/save actions (no fabricated counts)', () => {
    const { container } = render(
      <InstagramPostPreview variant={igVariant()} connection={conn} media={image} />,
    );
    expect(screen.getByLabelText('Like')).toBeDefined();
    expect(screen.getByLabelText('Comment')).toBeDefined();
    expect(screen.getByLabelText('Share')).toBeDefined();
    expect(screen.getByLabelText('Save')).toBeDefined();
    expect(container.textContent).not.toMatch(/\d+ likes/i);
  });

  it('shows collaborators in the header when present', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({
          settings: { media_type: 'IMAGE', collaborators: ['janedev'] },
        })}
        connection={conn}
        media={image}
      />,
    );
    expect(screen.getByText(/janedev/)).toBeDefined();
  });

  it('renders a carousel for multiple images', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({
          post_type: 'carousel',
          media: [{ media_id: 'm1' }, { media_id: 'm2' }],
          settings: { media_type: 'CAROUSEL' },
        })}
        connection={conn}
        media={[readyMedia('m1', 'instagram'), readyMedia('m2', 'instagram')]}
      />,
    );
    expect(container.querySelectorAll('img').length).toBeGreaterThan(1);
  });

  it('renders a FEED card (not a reel) when post_type is single_image even if media_type is REELS', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({
          post_type: 'single_image',
          settings: { media_type: 'REELS' },
        })}
        connection={conn}
        media={image}
      />,
    );
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders a reel (vertical video + audio label)', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({
          post_type: 'reel',
          body: 'behind the scenes',
          media: [{ media_id: 'v1' }],
          settings: { media_type: 'REELS', audio_name: 'Original audio' },
        })}
        connection={conn}
        media={[readyVideo('v1', 'instagram')]}
      />,
    );
    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.getByText(/Original audio/)).toBeDefined();
  });

  it('accepts a FETCHED (read-shape) variant with enriched media inline', () => {
    const fetched: Extract<PostVariant, { platform: 'instagram' }> = {
      platform: 'instagram',
      post_type: 'single_image',
      id: 'pv_ig1',
      object: 'post_variant',
      connection_id: 'conn_1',
      body: 'fetched instagram post',
      status: 'draft',
      schedule_at: null,
      result: null,
      error: null,
      media: [
        {
          media_id: 'm1',
          position: 0,
          alt_text_override: null,
          media: readyMedia('m1', 'instagram'),
        },
      ],
      settings: { media_type: 'IMAGE' },
    };
    // No `media` prop — the read variant carries its asset inline.
    const { container } = render(
      <InstagramPostPreview variant={fetched} connection={conn} />,
    );
    expect(screen.getByText(/fetched instagram post/)).toBeDefined();
    // The inline asset's instagram rendition renders (no "processing" tile).
    expect(
      container.querySelector('img[src="https://cdn.test/m1.jpg"]'),
    ).not.toBeNull();
  });

  it('shows a media placeholder (not a black void) when a feed post has no media', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({ media: [] })}
        connection={conn}
        media={[]}
      />,
    );
    expect(screen.getByText('No media yet')).toBeDefined();
  });

  it('shows a processing skeleton when the asset is still processing', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({ media: [{ media_id: 'm1' }] })}
        connection={conn}
        media={[processingMedia('m1')]}
      />,
    );
    expect(screen.getByText('Processing media…')).toBeDefined();
  });

  it('pins the card to a stable width so empty and populated cards match (zero shift)', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({ media: [] })}
        connection={conn}
        media={[]}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.width).toBe('100%');
    expect(card.style.maxWidth).toBe('470px');
  });

  it('shows a media placeholder on an empty reel', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({
          post_type: 'reel',
          media: [],
          settings: { media_type: 'REELS' },
        })}
        connection={conn}
        media={[]}
      />,
    );
    expect(screen.getByText('No media yet')).toBeDefined();
  });
});

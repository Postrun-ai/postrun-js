import type { InstagramPostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { InstagramPreviewAuthor, PreviewMedia } from '../types';
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

const author: InstagramPreviewAuthor = {
  username: 'acmestudio',
  avatar_url: 'https://cdn.test/a.png',
  verified: true,
};

function igVariant(
  overrides: Partial<InstagramPostVariant> = {},
): InstagramPostVariant {
  return {
    platform: 'instagram',
    post_type: 'single_image',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: { media_type: 'IMAGE' },
    ...overrides,
  };
}

const image: PreviewMedia[] = [
  { kind: 'image', url: 'https://cdn.test/1.jpg', alt: 'a cat' },
];

describe('<InstagramPostPreview>', () => {
  it('renders the username, verified badge, image, and caption', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({ body: 'spring shoot' })}
        author={author}
        media={image}
      />,
    );
    expect(screen.getAllByText('acmestudio').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Verified')).toBeDefined();
    expect(screen.getByAltText('a cat')).toBeDefined();
    expect(screen.getByText(/spring shoot/)).toBeDefined();
  });

  it('renders the like/comment/share/save actions (no fabricated counts)', () => {
    const { container } = render(
      <InstagramPostPreview variant={igVariant()} author={author} media={image} />,
    );
    expect(screen.getByLabelText('Like')).toBeDefined();
    expect(screen.getByLabelText('Comment')).toBeDefined();
    expect(screen.getByLabelText('Share')).toBeDefined();
    expect(screen.getByLabelText('Save')).toBeDefined();
    // no numeric like/comment counts in a draft preview
    expect(container.textContent).not.toMatch(/\d+ likes/i);
  });

  it('shows collaborators in the header when present', () => {
    render(
      <InstagramPostPreview
        variant={igVariant({ settings: { media_type: 'IMAGE', collaborators: ['janedev'] } })}
        author={author}
        media={image}
      />,
    );
    expect(screen.getByText(/janedev/)).toBeDefined();
  });

  it('renders a carousel for multiple images', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({ post_type: 'carousel', settings: { media_type: 'CAROUSEL' } })}
        author={author}
        media={[
          { kind: 'image', url: 'https://cdn.test/1.jpg' },
          { kind: 'image', url: 'https://cdn.test/2.jpg' },
        ]}
      />,
    );
    expect(container.querySelectorAll('img').length).toBeGreaterThan(1);
  });

  it('renders a reel (vertical video + audio label)', () => {
    const { container } = render(
      <InstagramPostPreview
        variant={igVariant({
          post_type: 'reel',
          body: 'behind the scenes',
          settings: { media_type: 'REELS', audio_name: 'Original audio' },
        })}
        author={author}
        media={[{ kind: 'video', url: 'https://cdn.test/v.mp4' }]}
      />,
    );
    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.getByText(/Original audio/)).toBeDefined();
  });
});

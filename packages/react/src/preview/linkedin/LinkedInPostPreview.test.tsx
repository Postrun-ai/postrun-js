import type { LinkedInPostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LinkedInPreviewAuthor } from '../types';
import { LinkedInPostPreview } from './LinkedInPostPreview';

const author: LinkedInPreviewAuthor = {
  name: 'Acme Studio',
  headline: 'Founder & CEO at Acme',
  username: 'acmestudio',
  avatar_url: 'https://cdn.test/acme.png',
  verified: true,
};

function liVariant(
  overrides: Partial<LinkedInPostVariant> = {},
): LinkedInPostVariant {
  return {
    platform: 'linkedin',
    post_type: 'text',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: { visibility: 'PUBLIC', content_kind: 'text' },
    ...overrides,
  };
}

describe('<LinkedInPostPreview>', () => {
  it('renders the author name, headline and body', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({ body: 'big news today' })}
        author={author}
      />,
    );
    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText('Founder & CEO at Acme')).toBeDefined();
    expect(screen.getByText(/big news today/)).toBeDefined();
  });

  it('shows the public globe icon for PUBLIC visibility', () => {
    render(<LinkedInPostPreview variant={liVariant()} author={author} />);
    expect(screen.getByLabelText('Public')).toBeDefined();
  });

  it('shows the connections icon for CONNECTIONS visibility', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: { visibility: 'CONNECTIONS', content_kind: 'text' },
        })}
        author={author}
      />,
    );
    expect(screen.getByLabelText('Connections')).toBeDefined();
  });

  it('renders a media image', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({ post_type: 'single_image' })}
        author={author}
        media={[{ kind: 'image', url: 'https://cdn.test/a.jpg', alt: 'a cat' }]}
      />,
    );
    expect(screen.getByAltText('a cat')).toBeDefined();
  });

  it('renders the static action bar by default', () => {
    render(<LinkedInPostPreview variant={liVariant()} author={author} />);
    expect(screen.getByText('Like')).toBeDefined();
    expect(screen.getByText('Repost')).toBeDefined();
  });

  it('sets color-scheme dark when theme is dark (palette via light-dark())', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} author={author} theme="dark" />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.colorScheme).toBe('dark');
    expect(card.style.getPropertyValue('--pr-li-bg')).toContain('light-dark');
  });

  it('follows the OS color scheme by default (auto → color-scheme: light dark)', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} author={author} />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.colorScheme).toBe('light dark');
  });

  it('forwards className for customer styling', () => {
    const { container } = render(
      <LinkedInPostPreview
        variant={liVariant()}
        author={author}
        className="my-li"
      />,
    );
    expect(container.firstElementChild?.className).toContain('my-li');
  });

  it('dispatches to the article card for content_kind: article', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            content_kind: 'article',
            article: { source: 'https://acme.com/x', title: 'We launched' },
          },
        })}
        author={author}
      />,
    );
    expect(screen.getByText('We launched')).toBeDefined();
    expect(screen.getByText('acme.com')).toBeDefined();
  });

  it('dispatches to the poll for content_kind: poll', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            content_kind: 'poll',
            poll: { question: 'Best day?', options: ['Mon', 'Fri'], duration: 'ONE_DAY' },
          },
        })}
        author={author}
      />,
    );
    expect(screen.getByText('Best day?')).toBeDefined();
    expect(screen.getByText('Mon')).toBeDefined();
  });

  it('dispatches to the document card for content_kind: document', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            content_kind: 'document',
            document: { title: 'Q3 Deck.pdf' },
          },
        })}
        author={author}
      />,
    );
    expect(screen.getByText('Q3 Deck.pdf')).toBeDefined();
  });
});

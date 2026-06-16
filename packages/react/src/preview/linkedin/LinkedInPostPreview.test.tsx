import type { LinkedInPostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LinkedInPreviewAuthor } from '../types';
import { LinkedInPostPreview } from './LinkedInPostPreview';

const author: LinkedInPreviewAuthor = {
  name: 'Acme Studio',
  headline: 'Founder & CEO at Acme',
  avatarUrl: 'https://cdn.test/acme.png',
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

  it('applies the dark palette when theme is dark', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} author={author} theme="dark" />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.getPropertyValue('--pr-li-bg')).toBe('#1b1f23');
  });

  it('applies the light palette by default (no OS preference in jsdom)', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} author={author} />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.getPropertyValue('--pr-li-bg')).toBe('#ffffff');
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
});

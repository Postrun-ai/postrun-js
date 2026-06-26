import type { LinkedInPostVariant, PostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { connection, readyMedia } from '../test-helpers';
import { LinkedInPostPreview } from './LinkedInPostPreview';

const conn = connection({
  platform: 'linkedin',
  external_account_name: 'Acme Studio',
  username: 'acmestudio',
  avatar_url: 'https://cdn.test/acme.png',
});
const HEADLINE = 'Founder & CEO at Acme';
const image = [readyMedia('m1', 'linkedin', { alt_text: 'a cat' })];

function liVariant(
  overrides: Partial<LinkedInPostVariant> = {},
): LinkedInPostVariant {
  return {
    platform: 'linkedin',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: { visibility: 'PUBLIC' },
    ...overrides,
  };
}

describe('<LinkedInPostPreview>', () => {
  it('renders the author name, headline and body', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({ body: 'big news today' })}
        connection={conn} headline={HEADLINE} verified
      />,
    );
    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText('Founder & CEO at Acme')).toBeDefined();
    expect(screen.getByText(/big news today/)).toBeDefined();
  });

  it('shows the public globe icon for PUBLIC visibility', () => {
    render(<LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified />);
    expect(screen.getByLabelText('Public')).toBeDefined();
  });

  it('shows the connections icon for CONNECTIONS visibility', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: { visibility: 'CONNECTIONS' },
        })}
        connection={conn} headline={HEADLINE} verified
      />,
    );
    expect(screen.getByLabelText('Connections')).toBeDefined();
  });

  it('renders a media image', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({ media: [{ media_id: 'm1' }] })}
        connection={conn} headline={HEADLINE} verified
        media={image}
      />,
    );
    expect(screen.getByAltText('a cat')).toBeDefined();
  });

  it('renders the static action bar by default', () => {
    render(<LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified />);
    expect(screen.getByText('Like')).toBeDefined();
    expect(screen.getByText('Repost')).toBeDefined();
  });

  it('sets color-scheme dark when theme is dark (palette via light-dark())', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified theme="dark" />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.colorScheme).toBe('dark');
    expect(card.style.getPropertyValue('--pr-li-bg')).toContain('light-dark');
  });

  it('follows the OS color scheme by default (auto → color-scheme: light dark)', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.colorScheme).toBe('light dark');
  });

  it('forwards className for customer styling', () => {
    const { container } = render(
      <LinkedInPostPreview
        variant={liVariant()}
        connection={conn} headline={HEADLINE} verified
        className="my-li"
      />,
    );
    expect(container.firstElementChild?.className).toContain('my-li');
  });

  it('dispatches to the article card when an article sub-object is present', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            article: { source: 'https://acme.com/x', title: 'We launched' },
          },
        })}
        connection={conn} headline={HEADLINE} verified
      />,
    );
    expect(screen.getByText('We launched')).toBeDefined();
    expect(screen.getByText('acme.com')).toBeDefined();
  });

  it('dispatches to the poll when a poll sub-object is present', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            poll: { question: 'Best day?', options: ['Mon', 'Fri'], duration: 'ONE_DAY' },
          },
        })}
        connection={conn} headline={HEADLINE} verified
      />,
    );
    expect(screen.getByText('Best day?')).toBeDefined();
    expect(screen.getByText('Mon')).toBeDefined();
  });

  it('accepts a FETCHED (read-shape) variant straight from the API', () => {
    const fetched: Extract<PostVariant, { platform: 'linkedin' }> = {
      platform: 'linkedin',
      post_type: 'text',
      content_kind: 'text',
      id: 'pv_li1',
      object: 'post_variant',
      connection_id: 'conn_1',
      body: 'fetched linkedin post',
      status: 'draft',
      schedule_at: null,
      result: null,
      error: null,
      media: [],
      settings: { visibility: 'PUBLIC' },
    };
    render(<LinkedInPostPreview variant={fetched} connection={conn} headline={HEADLINE} verified />);
    expect(screen.getByText(/fetched linkedin post/)).toBeDefined();
  });

  it('shows a muted placeholder body when the post is empty', () => {
    render(<LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified />);
    expect(screen.getByText('What do you want to talk about?')).toBeDefined();
  });

  it('pins the card to a stable width so empty and populated cards match (zero shift)', () => {
    const { container } = render(
      <LinkedInPostPreview variant={liVariant()} connection={conn} headline={HEADLINE} verified />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.width).toBe('100%');
    expect(card.style.maxWidth).toBe('552px');
  });

  it('hides the placeholder once there is a body', () => {
    render(
      <LinkedInPostPreview variant={liVariant({ body: 'hello' })} connection={conn} headline={HEADLINE} verified />,
    );
    expect(screen.queryByText('What do you want to talk about?')).toBeNull();
  });

  it('hides the placeholder when only media is present', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({ media: [{ media_id: 'm1' }] })}
        connection={conn} headline={HEADLINE} verified
        media={image}
      />,
    );
    expect(screen.queryByText('What do you want to talk about?')).toBeNull();
  });

  it('dispatches to the document card when a document sub-object is present', () => {
    render(
      <LinkedInPostPreview
        variant={liVariant({
          settings: {
            visibility: 'PUBLIC',
            document: { title: 'Q3 Deck.pdf' },
          },
        })}
        connection={conn} headline={HEADLINE} verified
      />,
    );
    expect(screen.getByText('Q3 Deck.pdf')).toBeDefined();
  });
});

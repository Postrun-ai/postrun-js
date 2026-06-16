import type { XPostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { XPreviewAuthor } from '../types';
import { XPostPreview } from './XPostPreview';

const author: XPreviewAuthor = {
  name: 'Acme Studio',
  handle: 'acmestudio',
  avatarUrl: 'https://cdn.test/acme.png',
  verified: true,
};

function xVariant(overrides: Partial<XPostVariant> = {}): XPostVariant {
  return {
    platform: 'x',
    post_type: 'text',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: {},
    ...overrides,
  };
}

describe('<XPostPreview>', () => {
  it('renders the author name, handle, and body', () => {
    render(
      <XPostPreview variant={xVariant({ body: 'shipping day' })} author={author} />,
    );

    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText(/acmestudio/)).toBeDefined();
    expect(screen.getByText(/shipping day/)).toBeDefined();
  });

  it('defaults to no data-theme (auto / inherit)', () => {
    const { container } = render(
      <XPostPreview variant={xVariant()} author={author} />,
    );
    expect(container.firstElementChild?.getAttribute('data-theme')).toBeNull();
  });

  it('sets data-theme="dark" when theme is dark', () => {
    const { container } = render(
      <XPostPreview variant={xVariant()} author={author} theme="dark" />,
    );
    expect(container.firstElementChild?.getAttribute('data-theme')).toBe('dark');
  });

  it('forwards className to the wrapper for customer styling', () => {
    const { container } = render(
      <XPostPreview
        variant={xVariant()}
        author={author}
        className="my-preview"
      />,
    );
    expect(container.firstElementChild?.className).toContain('my-preview');
  });

  it('lets the customer override internal components (e.g. the avatar)', () => {
    render(
      <XPostPreview
        variant={xVariant()}
        author={author}
        components={{
          AvatarImg: (props) => <img {...props} data-testid="custom-avatar" />,
        }}
      />,
    );
    expect(screen.getByTestId('custom-avatar')).toBeDefined();
  });

  it('renders a media image with its alt text', () => {
    render(
      <XPostPreview
        variant={xVariant({ post_type: 'single_image' })}
        author={author}
        media={[{ kind: 'image', url: 'https://cdn.test/a.jpg', alt: 'a cat' }]}
      />,
    );
    expect(screen.getByAltText('a cat')).toBeDefined();
  });

  it("falls back to the variant media's alt_text_override when no alt is given", () => {
    render(
      <XPostPreview
        variant={xVariant({
          post_type: 'single_image',
          media: [{ media_id: 'med_1', alt_text_override: 'from the asset' }],
        })}
        author={author}
        media={[{ kind: 'image', url: 'https://cdn.test/a.jpg' }]}
      />,
    );
    expect(screen.getByAltText('from the asset')).toBeDefined();
  });

  it('renders the quoted card from quotedTweet', () => {
    render(
      <XPostPreview
        variant={xVariant({ settings: { quote_tweet_id: '123' } })}
        author={author}
        quotedTweet={{
          author: { name: 'Quoted Co', handle: 'quotedco' },
          body: 'original take',
        }}
      />,
    );
    expect(screen.getByText(/original take/)).toBeDefined();
  });

  it('renders reply context when a reply and parent handle are present', () => {
    render(
      <XPostPreview
        variant={xVariant({ settings: { reply: { in_reply_to_tweet_id: '9' } } })}
        author={author}
        replyToHandle="someone"
      />,
    );
    expect(screen.getByText(/Replying to/i)).toBeDefined();
  });
});

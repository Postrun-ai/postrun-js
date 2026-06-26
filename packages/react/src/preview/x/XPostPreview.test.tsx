import type { PostVariant, XPostVariant } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  connection,
  mediaAsset,
  processingMedia,
  readyMedia,
} from '../test-helpers';
import { XPostPreview } from './XPostPreview';

const conn = connection({
  platform: 'x',
  external_account_name: 'Acme Studio',
  username: 'acmestudio',
  avatar_url: 'https://cdn.test/acme.png',
});
const image = [readyMedia('m1', 'x', { alt_text: 'a cat' })];

function xVariant(overrides: Partial<XPostVariant> = {}): XPostVariant {
  return {
    platform: 'x',
    connection_id: 'conn_1',
    body: '',
    media: [],
    settings: {},
    ...overrides,
  };
}

/** A single-image variant referencing `m1`. */
function withImage(over: Partial<XPostVariant> = {}): XPostVariant {
  return xVariant({ media: [{ media_id: 'm1' }], ...over });
}

describe('<XPostPreview>', () => {
  it('derives the name/handle/avatar from the connection and renders the body', () => {
    render(
      <XPostPreview
        variant={xVariant({ body: 'shipping day' })}
        connection={conn}
        verified
      />,
    );

    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText(/acmestudio/)).toBeDefined();
    expect(screen.getByText(/shipping day/)).toBeDefined();
  });

  it('defaults to no data-theme (auto / inherit)', () => {
    const { container } = render(
      <XPostPreview variant={xVariant()} connection={conn} />,
    );
    expect(container.firstElementChild?.getAttribute('data-theme')).toBeNull();
  });

  it('sets data-theme="dark" when theme is dark', () => {
    const { container } = render(
      <XPostPreview variant={xVariant()} connection={conn} theme="dark" />,
    );
    expect(container.firstElementChild?.getAttribute('data-theme')).toBe('dark');
  });

  it('forwards className to the wrapper for customer styling', () => {
    const { container } = render(
      <XPostPreview variant={xVariant()} connection={conn} className="my-preview" />,
    );
    expect(container.firstElementChild?.className).toContain('my-preview');
  });

  it('lets the customer override internal components (e.g. the avatar)', () => {
    render(
      <XPostPreview
        variant={xVariant()}
        connection={conn}
        components={{
          AvatarImg: (props) => <img {...props} data-testid="custom-avatar" />,
        }}
      />,
    );
    expect(screen.getByTestId('custom-avatar')).toBeDefined();
  });

  it('renders a media image with its alt text (from the asset)', () => {
    render(<XPostPreview variant={withImage()} connection={conn} media={image} />);
    expect(screen.getByAltText('a cat')).toBeDefined();
  });

  it("renders media with the ORIGINAL rendition src, not react-tweet's CDN transform", () => {
    const asset = mediaAsset('m1', {
      per_platform: {
        x: {
          status: 'ready',
          url: 'https://cdn.customer.com/photo.jpg',
          width: 1200,
          height: 800,
          bytes: 1,
          warnings: [],
          errors: [],
        },
      },
    });
    render(<XPostPreview variant={withImage()} connection={conn} media={[asset]} />);
    const img = screen.getByAltText('Image');
    expect(img.getAttribute('src')).toBe('https://cdn.customer.com/photo.jpg');
  });

  it("uses the variant media's alt_text_override over the asset alt_text", () => {
    render(
      <XPostPreview
        variant={withImage({
          media: [{ media_id: 'm1', alt_text_override: 'from the override' }],
        })}
        connection={conn}
        media={image}
      />,
    );
    expect(screen.getByAltText('from the override')).toBeDefined();
  });

  it('renders the quoted card from quotedTweet', () => {
    render(
      <XPostPreview
        variant={xVariant({ settings: { quote_tweet_id: '123' } })}
        connection={conn}
        quotedTweet={{ name: 'Quoted Co', username: 'quotedco', body: 'original take' }}
      />,
    );
    expect(screen.getByText(/original take/)).toBeDefined();
  });

  it('renders reply context when a reply and parent handle are present', () => {
    render(
      <XPostPreview
        variant={xVariant({ settings: { reply: { in_reply_to_tweet_id: '9' } } })}
        connection={conn}
        replyToHandle="someone"
      />,
    );
    expect(screen.getByText(/Replying to/i)).toBeDefined();
  });

  it('accepts a FETCHED (read-shape) variant with enriched media inline', () => {
    const fetched: Extract<PostVariant, { platform: 'x' }> = {
      platform: 'x',
      post_type: 'single_image',
      id: 'pv_x1',
      object: 'post_variant',
      connection_id: 'conn_1',
      body: 'shipped from a fetched post',
      status: 'draft',
      schedule_at: null,
      result: null,
      error: null,
      media: [
        {
          media_id: 'm1',
          position: 0,
          alt_text_override: 'inline cat',
          media: readyMedia('m1', 'x'),
        },
      ],
      settings: {},
    };
    // No `media` prop — the read variant carries its asset inline.
    render(<XPostPreview variant={fetched} connection={conn} />);
    expect(screen.getByText(/shipped from a fetched post/)).toBeDefined();
    expect(screen.getByAltText('inline cat')).toBeDefined();
  });

  it("shows X's muted placeholder body when there's no body or media", () => {
    render(<XPostPreview variant={xVariant()} connection={conn} />);
    expect(screen.getByText("What's happening?")).toBeDefined();
  });

  it('does not show the placeholder once a body is present', () => {
    render(<XPostPreview variant={xVariant({ body: 'hi' })} connection={conn} />);
    expect(screen.queryByText("What's happening?")).toBeNull();
  });

  it('does not show the placeholder when only media is present', () => {
    render(<XPostPreview variant={withImage()} connection={conn} media={image} />);
    expect(screen.queryByText("What's happening?")).toBeNull();
  });

  it('shows the processing tile when media is attached but its rendition is not ready', () => {
    render(
      <XPostPreview variant={withImage()} connection={conn} media={[processingMedia('m1')]} />,
    );
    expect(screen.getByText('Processing media…')).toBeDefined();
    expect(screen.queryByText("What's happening?")).toBeNull();
  });

  it('renders a poll with its options and an honest 0-vote footer', () => {
    render(
      <XPostPreview
        variant={xVariant({
          body: 'wdyt?',
          settings: { poll: { options: ['Yes', 'No'], duration_minutes: 1440 } },
        })}
        connection={conn}
      />,
    );
    expect(screen.getByText('Yes')).toBeDefined();
    expect(screen.getByText('No')).toBeDefined();
    expect(screen.getByText(/0 votes · 1 day left/)).toBeDefined();
  });
});

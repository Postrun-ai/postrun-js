import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArticleCard, domainOf } from './ArticleCard';

describe('domainOf', () => {
  it('strips protocol, www and path', () => {
    expect(domainOf('https://www.example.com/a/b?c=1')).toBe('example.com');
    expect(domainOf('http://news.ycombinator.com/item?id=1')).toBe(
      'news.ycombinator.com',
    );
  });

  it('falls back to the raw string for an unparseable source', () => {
    expect(domainOf('not a url')).toBe('not a url');
  });
});

describe('<ArticleCard>', () => {
  it('renders the title, description and domain', () => {
    render(
      <ArticleCard
        article={{
          source: 'https://www.acme.com/blog/launch',
          title: 'We launched the thing',
          description: 'A short subtext about the launch.',
        }}
      />,
    );
    expect(screen.getByText('We launched the thing')).toBeDefined();
    expect(screen.getByText('A short subtext about the launch.')).toBeDefined();
    expect(screen.getByText('acme.com')).toBeDefined();
  });

  it('renders a thumbnail image when provided', () => {
    const { container } = render(
      <ArticleCard
        article={{ source: 'https://acme.com', title: 'T' }}
        thumbnail={{ kind: 'image', state: 'ready', src: 'https://cdn/x.jpg' }}
      />,
    );
    expect(container.querySelector('img')).not.toBeNull();
  });
});

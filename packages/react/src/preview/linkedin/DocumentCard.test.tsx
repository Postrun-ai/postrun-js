import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocumentCard } from './DocumentCard';

describe('<DocumentCard>', () => {
  it('renders the document title', () => {
    render(<DocumentCard document={{ title: 'Q3 Investor Update' }} />);
    expect(screen.getByText('Q3 Investor Update')).toBeDefined();
  });

  it('shows a document affordance when no cover image is provided', () => {
    render(<DocumentCard document={{ title: 'Deck' }} />);
    expect(screen.getByText('Document')).toBeDefined();
  });

  it('renders the cover image when provided', () => {
    const { container } = render(
      <DocumentCard
        document={{ title: 'Deck' }}
        cover={{ kind: 'image', src: 'https://cdn/page1.jpg' }}
      />,
    );
    expect(container.querySelector('img')).not.toBeNull();
  });
});

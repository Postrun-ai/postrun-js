import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReadyMedia } from '../types';
import { ImageMosaic } from './ImageMosaic';

const img = (n: number): ReadyMedia => ({
  kind: 'image',
  state: 'ready',
  src: `https://cdn.test/${n}.jpg`,
  alt: `image ${n}`,
});

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => img(i + 1));

describe('<ImageMosaic>', () => {
  it('renders a single image', () => {
    render(<ImageMosaic media={[img(1)]} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByAltText('image 1')).toBeDefined();
  });

  it('renders two images side by side', () => {
    render(<ImageMosaic media={many(2)} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('renders all four for a 4-image post', () => {
    render(<ImageMosaic media={many(4)} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
  });

  it('caps at four tiles and shows a +N overlay for 5+', () => {
    render(<ImageMosaic media={many(6)} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByText('+2')).toBeDefined();
  });
});

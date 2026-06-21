import type { CSSProperties } from 'react';

import type { ResolvedMedia } from '../types';

/**
 * LinkedIn's image layout: a single full-bleed image, or the 2/3/4 mosaic with a
 * "+N" overlay on the fourth tile when there are more than four. Edge-to-edge,
 * 2px gutters — matching the in-feed look.
 */

const MAX_TILES = 4;
const MOSAIC_HEIGHT = 272;

const GRID_BASE: CSSProperties = {
  display: 'grid',
  gap: 2,
  height: MOSAIC_HEIGHT,
  overflow: 'hidden',
};

/** Grid template for a given visible-tile count (2, 3 or 4). */
function gridStyle(tiles: number): CSSProperties {
  if (tiles === 2) {
    return { ...GRID_BASE, gridTemplateColumns: '1fr 1fr' };
  }
  if (tiles === 3) {
    // One tall image on the left, two stacked on the right.
    return {
      ...GRID_BASE,
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gridTemplateAreas: '"a b" "a c"',
    };
  }
  return {
    ...GRID_BASE,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
  };
}

const IMG_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const AREAS = ['a', 'b', 'c'];

function Tile({
  item,
  area,
  overlay,
}: {
  item: ResolvedMedia;
  area?: string;
  overlay?: number;
}) {
  return (
    <div style={{ position: 'relative', gridArea: area, overflow: 'hidden' }}>
      <img src={item.src} alt={item.alt ?? ''} style={IMG_STYLE} />
      {overlay ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          {`+${overlay}`}
        </div>
      ) : null}
    </div>
  );
}

export interface ImageMosaicProps {
  media: readonly ResolvedMedia[];
}

export function ImageMosaic({ media }: ImageMosaicProps) {
  const [only] = media;
  if (!only) {
    return null;
  }

  if (media.length === 1) {
    // Reserve the natural aspect ratio when known, so the row's height is set
    // before the pixels load (zero layout shift) — and since the ratio matches
    // the source, the image is shown uncropped. Unknown dims fall back to the
    // natural `height: auto` (a one-time shift, as before).
    const ratio =
      only.width && only.height ? `${only.width} / ${only.height}` : undefined;
    return (
      <img
        src={only.src}
        alt={only.alt ?? ''}
        style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: ratio }}
      />
    );
  }

  const tiles = media.slice(0, MAX_TILES);
  const hidden = media.length - MAX_TILES;

  return (
    <div style={gridStyle(tiles.length)}>
      {tiles.map((item, index) => (
        <Tile
          key={item.src + index}
          item={item}
          area={tiles.length === 3 ? AREAS[index] : undefined}
          overlay={
            hidden > 0 && index === MAX_TILES - 1 ? hidden : undefined
          }
        />
      ))}
    </div>
  );
}

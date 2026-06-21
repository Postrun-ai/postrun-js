'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import type { ResolvedMedia } from '../types';

/**
 * The Instagram feed media: a single edge-to-edge 1:1 image/video, or a swipeable
 * carousel (Embla — real drag) with a "n/N" pill top-right and the bottom dots.
 * Pixels are shown unmodified.
 */
export function FeedMedia({ media }: { media: readonly ResolvedMedia[] }) {
  if (media.length <= 1) {
    return (
      <div style={frameStyle}>
        {media[0] ? <Tile item={media[0]} /> : null}
      </div>
    );
  }
  return <Carousel media={media} />;
}

function Tile({ item }: { item: ResolvedMedia }) {
  if (item.kind === 'video') {
    return (
      <video src={item.src} poster={item.posterSrc} controls style={mediaStyle} />
    );
  }
  return <img src={item.src} alt={item.alt ?? ''} style={mediaStyle} />;
}

function Carousel({ media }: { media: readonly ResolvedMedia[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [selected, setSelected] = useState(0);

  const sync = useCallback((api: NonNullable<typeof emblaApi>) => {
    setSelected(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    sync(emblaApi);
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi, sync]);

  return (
    <div style={frameStyle}>
      <div ref={emblaRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {media.map((item) => (
            <div key={item.src} style={slideStyle}>
              <Tile item={item} />
            </div>
          ))}
        </div>
      </div>
      <div style={pillStyle}>
        {selected + 1}/{media.length}
      </div>
      <div style={dotsStyle}>
        {media.map((item, i) => (
          <span
            key={`dot-${item.src}`}
            style={{ ...dotStyle, opacity: i === selected ? 1 : 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

const frameStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  background: '#000',
  overflow: 'hidden',
};

const mediaStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const slideStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 100%',
  minWidth: 0,
  height: '100%',
};

const pillStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 9px',
  borderRadius: 999,
};

const dotsStyle: CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 4,
};

const dotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#fff',
};

'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { MediaPlaceholder } from '../MediaPlaceholder';
import type { ResolvedMedia } from '../types';
import { IG_VAR, varRef } from './theme';

/**
 * The Instagram feed media: a single edge-to-edge 1:1 image/video, or a swipeable
 * carousel (Embla — real drag) with a "n/N" pill top-right and the bottom dots.
 * Pixels are shown unmodified. The 1:1 frame is ALWAYS reserved, so the empty,
 * processing, and loaded states are the same size (zero layout shift).
 */
export function FeedMedia({
  media,
  pending = false,
}: {
  media: readonly ResolvedMedia[];
  /** Media is referenced but its pixels aren't resolved yet (still processing). */
  pending?: boolean;
}) {
  if (media.length <= 1) {
    const item = media[0];
    return (
      <div style={frameStyle}>
        {item ? (
          <Tile item={item} />
        ) : (
          <MediaPlaceholder
            label={pending ? 'Processing media…' : 'No media yet'}
            color={varRef(IG_VAR.muted)}
            background={EMPTY_BG}
            shimmer={pending}
          />
        )}
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

/** Instagram's own media-loading placeholder grey (theme-aware) — present enough
 * to read as a deliberate "media goes here" slot, NOT the pure black used to
 * letterbox real media. */
const EMPTY_BG = 'light-dark(#efefef, #1c1c1c)';

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

'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { MediaPlaceholder } from '../MediaPlaceholder';
import type { ResolvedMedia } from '../types';

/**
 * The full-bleed media inside the TikTok card. A video autoplays muted/looped
 * (cover-cropped to 9:16); photos render as a swipeable carousel (Embla — real
 * touch/drag) with TikTok's bottom dots ONLY (no counter, no arrows — you swipe).
 * The pixels are shown UNMODIFIED — no watermark, nothing composited on the media
 * (TikTok audit §5b).
 */
export function Media({
  media,
  pending = false,
}: {
  media: ResolvedMedia[];
  /** Media is referenced but its pixels aren't resolved yet (still processing). */
  pending?: boolean;
}) {
  const [first] = media;
  if (!first) {
    return (
      <MediaPlaceholder
        label={pending ? 'Processing media…' : 'No media yet'}
        color="rgba(255,255,255,0.55)"
        background="linear-gradient(180deg,#1c1c20,#101013)"
        shimmer={pending}
      />
    );
  }

  if (first.kind === 'video') {
    return (
      <video
        src={first.src}
        poster={first.posterSrc}
        autoPlay
        muted
        loop
        playsInline
        style={coverStyle}
      />
    );
  }

  return <PhotoCarousel media={media} />;
}

function PhotoCarousel({ media }: { media: ResolvedMedia[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  });
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
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={emblaRef} style={viewportStyle}>
        <div style={containerStyle}>
          {media.map((m, i) => (
            <div key={`${m.src}-${i}`} style={slideStyle}>
              <img src={m.src} alt={m.alt ?? ''} style={coverStyle} />
            </div>
          ))}
        </div>
      </div>

      {media.length > 1 ? (
        <div style={dotsStyle}>
          {media.map((m, i) => (
            <span
              key={`dot-${m.src}-${i}`}
              style={{ ...dotStyle, opacity: i === selected ? 1 : 0.4 }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const coverStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const viewportStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

const containerStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
};

const slideStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 100%',
  minWidth: 0,
  height: '100%',
};

const dotsStyle: CSSProperties = {
  position: 'absolute',
  bottom: 124,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 5,
  alignItems: 'center',
};

const dotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#fff',
  transition: 'opacity 160ms ease',
};

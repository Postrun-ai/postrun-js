'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import type { ResolvedMedia } from '../types';

/**
 * The full-bleed media inside the TikTok card. A video autoplays muted/looped
 * (cover-cropped to 9:16); photos render as a swipeable carousel (Embla — real
 * touch/drag, not a hand-rolled slider) with TikTok's top index counter, bottom
 * dots, and ‹ › arrows. The pixels are shown UNMODIFIED — no watermark, no logo,
 * nothing composited onto the media (TikTok audit §5b).
 */
export function Media({ media }: { media: ResolvedMedia[] }) {
  if (media.length === 0) {
    return <EmptyMedia />;
  }

  const first = media[0]!;
  if (first.kind === 'video') {
    return (
      <video
        src={first.posterSrc ? undefined : first.src}
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
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback((api: NonNullable<typeof emblaApi>) => {
    setSelected(api.selectedScrollSnap());
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
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

  const many = media.length > 1;

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

      {many ? (
        <>
          <div style={counterStyle}>
            {selected + 1}/{media.length}
          </div>
          {canPrev ? (
            <Arrow side="left" onClick={() => emblaApi?.scrollPrev()} />
          ) : null}
          {canNext ? (
            <Arrow side="right" onClick={() => emblaApi?.scrollNext()} />
          ) : null}
          <div style={dotsStyle}>
            {media.map((m, i) => (
              <button
                key={`dot-${m.src}-${i}`}
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                style={{
                  ...dotStyle,
                  opacity: i === selected ? 1 : 0.4,
                  width: i === selected ? 16 : 6,
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function EmptyMedia() {
  return <div style={emptyStyle}>No media yet</div>;
}

function Arrow({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      onClick={onClick}
      style={{ ...arrowStyle, [side]: 10 }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
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

const counterStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 10px',
  borderRadius: 999,
  backdropFilter: 'blur(4px)',
  pointerEvents: 'none',
};

const dotsStyle: CSSProperties = {
  position: 'absolute',
  bottom: 70,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 5,
  alignItems: 'center',
};

const dotStyle: CSSProperties = {
  height: 6,
  borderRadius: 999,
  border: 0,
  padding: 0,
  background: '#fff',
  cursor: 'pointer',
  transition: 'width 160ms ease, opacity 160ms ease',
};

const arrowStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: 0,
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  fontSize: 16,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  backdropFilter: 'blur(4px)',
};

const emptyStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 13,
  background: 'linear-gradient(180deg,#1c1c20,#101013)',
};

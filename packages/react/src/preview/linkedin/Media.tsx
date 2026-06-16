import type { ResolvedMedia } from '../types';
import { ImageMosaic } from './ImageMosaic';

/**
 * The media area of a LinkedIn post (v1: images + video). A post carries either
 * a video or images; a video wins if present and renders as a playable element
 * with its poster, otherwise the image mosaic. Edge-to-edge, like the feed.
 */

function VideoTile({ item }: { item: ResolvedMedia }) {
  return (
    <video
      src={item.src}
      poster={item.posterSrc}
      controls
      style={{ width: '100%', display: 'block', background: '#000' }}
    />
  );
}

export interface MediaProps {
  media: readonly ResolvedMedia[];
}

export function Media({ media }: MediaProps) {
  if (media.length === 0) {
    return null;
  }

  const video = media.find(
    (item) => item.kind === 'video' || item.kind === 'gif',
  );
  if (video) {
    return <VideoTile item={video} />;
  }

  const images = media.filter((item) => item.kind === 'image');
  return <ImageMosaic media={images} />;
}

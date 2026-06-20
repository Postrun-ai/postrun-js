import type { MediaUploadItem } from '../media';
import type { PreviewMedia, PreviewMediaKind } from './types';

/**
 * Bridge `useMediaUpload`'s items into preview-card media — the one mapping every
 * `useMediaUpload` + preview consumer would otherwise hand-write. Both shapes are
 * SDK-owned (`MediaUploadItem` ← the hook, `PreviewMedia` → the cards), so this
 * lives in the SDK rather than in every app.
 *
 * It passes the local `File` (the cards mint/revoke the object URL), so a preview
 * renders immediately — before upload settles AND after. `kind` comes from the
 * detected `media.kind` once probed, else the file's MIME. Documents (and any
 * file we can't identify as image/video/gif) are dropped — they aren't
 * previewable. `width`/`height`/`alt` are filled from the settled asset when known.
 */
function previewKind(item: MediaUploadItem): PreviewMediaKind | null {
  const detected = item.media?.kind;
  if (detected) {
    // The detected family is authoritative; documents aren't previewable.
    return detected === 'document' ? null : detected;
  }
  // Pre-detection: fall back to the file's own MIME.
  const mime = item.file.type;
  if (mime === 'image/gif') {
    return 'gif';
  }
  if (mime.startsWith('video/')) {
    return 'video';
  }
  if (mime.startsWith('image/')) {
    return 'image';
  }
  return null;
}

export function toPreviewMedia(
  items: readonly MediaUploadItem[],
): PreviewMedia[] {
  return items.flatMap((item) => {
    const kind = previewKind(item);
    if (!kind) {
      return [];
    }
    return [
      {
        kind,
        file: item.file,
        width: item.media?.source?.width ?? undefined,
        height: item.media?.source?.height ?? undefined,
        alt: item.media?.alt_text ?? undefined,
      },
    ];
  });
}

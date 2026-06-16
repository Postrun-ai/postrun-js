'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PreviewMedia, ResolvedMedia } from './types';

/**
 * Shared media resolution for every platform preview. URL-backed items resolve
 * SYNCHRONOUSLY (the common, processed-asset path — no first-paint flash);
 * compose-time `File` items get an object URL minted in an effect and revoked on
 * change/unmount. Keyed on a content signature, so the resolved array is stable
 * across parent re-renders that don't change the media — the heavy work (object
 * URLs) never churns and downstream mapping stays memoized. Alt text falls back
 * to the variant media's `alt_text_override`.
 */

/** Per-item alt-text fallback source (the variant's media refs). */
export type AltFallbacks =
  | readonly { alt_text_override?: string | null }[]
  | undefined;

function fileKey(file: File | undefined): string {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
}

/** A content signature so object-URL work only re-runs when the media actually
 * changes — not on every parent re-render that passes a new array. */
export function mediaSignature(
  media: readonly PreviewMedia[] | undefined,
): string {
  return (media ?? [])
    .map((item) => {
      const source = item.url ?? fileKey(item.file);
      const size = `${item.width ?? ''}x${item.height ?? ''}`;
      return `${item.kind}|${source}|${item.posterUrl ?? ''}|${size}|${item.alt ?? ''}`;
    })
    .join('§');
}

/** Stable string of the per-item alt fallbacks, for memo keying. */
export function altSignatureOf(media: AltFallbacks): string {
  return (media ?? []).map((m) => m?.alt_text_override ?? '').join('§');
}

export function useResolvedMedia(
  media: readonly PreviewMedia[] | undefined,
  altFallbacks: AltFallbacks,
  altSignature: string,
): ResolvedMedia[] {
  const signature = mediaSignature(media);
  const [objectUrls, setObjectUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const created: string[] = [];
    const next: Record<number, string> = {};
    (media ?? []).forEach((item, index) => {
      if (!item.url && item.file) {
        const url = URL.createObjectURL(item.file);
        created.push(url);
        next[index] = url;
      }
    });
    setObjectUrls(next);
    return () => {
      for (const url of created) {
        URL.revokeObjectURL(url);
      }
    };
    // `signature` captures every File identity that needs an object URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return useMemo(
    () =>
      (media ?? []).flatMap((item, index): ResolvedMedia[] => {
        const src = item.url ?? objectUrls[index];
        if (!src) {
          return [];
        }
        return [
          {
            kind: item.kind,
            src,
            width: item.width,
            height: item.height,
            alt: item.alt ?? altFallbacks?.[index]?.alt_text_override ?? undefined,
            posterSrc: item.posterUrl,
          },
        ];
      }),
    // `signature` + `altSignature` capture the content; `objectUrls` flips once
    // File blobs resolve. Referencing `media`/`altFallbacks` directly is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, altSignature, objectUrls],
  );
}

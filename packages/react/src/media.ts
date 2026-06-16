import { useMutation, useQuery } from '@tanstack/react-query';
import pRetry, { AbortError } from 'p-retry';
import pWaitFor from 'p-wait-for';
import { useCallback, useRef, useState } from 'react';

import { unwrap } from '@postrun/js';
import type {
  CreateMediaInput,
  MediaKind,
  MediaResource,
  MediaTarget,
  PostrunClient,
  UpdateMediaInput,
} from '@postrun/js';

import { usePostrun } from './context';
import { mediaKeys } from './keys';
import { UploadError, uploadBytes } from './upload-bytes';

const DOCUMENT_MIME =
  /^application\/(pdf|msword|vnd\.(openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation)|ms-powerpoint))$/;

/** Map a file's MIME to a media kind so callers pass a File, not metadata. */
function inferKind(contentType: string): MediaKind {
  if (contentType === 'image/gif') return 'gif';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (DOCUMENT_MIME.test(contentType)) return 'document';
  throw new Error(
    `Could not infer media kind from "${contentType}". Pass { kind } explicitly.`,
  );
}

/** Poll the asset until it settles (ready/failed), respecting cancellation. */
async function pollUntilSettled(
  client: PostrunClient,
  id: string,
  signal: AbortSignal,
): Promise<MediaResource> {
  let latest: MediaResource | undefined;
  await pWaitFor(
    async () => {
      if (signal.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }
      latest = unwrap(
        await client.GET('/media/{id}', { params: { path: { id } } }),
      );
      return latest.status === 'ready' || latest.status === 'failed';
    },
    { interval: 1500, timeout: 300_000 },
  );

  if (!latest) {
    throw new Error('Media polling returned no result.');
  }
  return latest;
}

export type MediaUploadStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

export interface MediaUploadOptions {
  /** Profile that owns the asset. */
  profileId: string;
  /** Platforms to validate + render for (omit to add later via useUpdateMedia). */
  targets?: MediaTarget[];
  /** Override the kind inferred from the file's MIME. */
  kind?: MediaKind;
  /** The file's MIME type. Defaults to `file.type`; required when that's empty. */
  contentType?: string;
  /** Store as-is with zero processing. */
  raw?: boolean;
  altText?: string;
  externalId?: string;
  metadata?: CreateMediaInput['metadata'];
}

/**
 * Upload a file and get back a platform-validated asset. The hook owns the whole
 * journey: infer kind/content_type from the `File`, create the asset, PUT the
 * bytes with live `progress` + retry, poll until processing settles, and expose
 * `media.per_platform` (per-target status, url, warnings, errors). `cancel()`
 * aborts an in-flight upload.
 */
export function useMediaUpload() {
  const { client, queryClient } = usePostrun();
  const [status, setStatus] = useState<MediaUploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [media, setMedia] = useState<MediaResource | null>(null);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File, options: MediaUploadOptions): Promise<MediaResource> => {
      // Resolve the MIME up front (before touching state) — the API rejects a
      // fabricated `application/octet-stream`, so fail clearly instead.
      const contentType = options.contentType || file.type;
      if (!contentType) {
        throw new Error(
          "Could not determine the file's content type. Pass { contentType } explicitly.",
        );
      }
      const kind = options.kind ?? inferKind(contentType);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('uploading');
      setProgress(0);
      setMedia(null);
      setError(null);

      try {
        const created = unwrap(
          await client.POST('/media', {
            body: {
              profile_id: options.profileId,
              kind,
              content_type: contentType,
              targets: options.targets,
              raw: options.raw,
              alt_text: options.altText,
              external_id: options.externalId,
              metadata: options.metadata,
            },
          }),
        );

        if (created.upload) {
          const target = created.upload;
          await pRetry(
            async () => {
              try {
                await uploadBytes(target, file, {
                  onProgress: setProgress,
                  signal: controller.signal,
                });
              } catch (uploadError) {
                // A client error (e.g. an expired signed URL) won't fix on retry.
                if (
                  uploadError instanceof UploadError &&
                  uploadError.status >= 400 &&
                  uploadError.status < 500
                ) {
                  throw new AbortError(uploadError);
                }
                throw uploadError;
              }
            },
            { retries: 3, signal: controller.signal },
          );
        }

        setStatus('processing');
        const settled = await pollUntilSettled(
          client,
          created.id,
          controller.signal,
        );
        queryClient.setQueryData(mediaKeys.detail(created.id), settled);
        setMedia(settled);
        setStatus(settled.status === 'failed' ? 'failed' : 'ready');
        return settled;
      } catch (caught) {
        setError(caught);
        setStatus('failed');
        throw caught;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [client, queryClient],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setMedia(null);
    setError(null);
  }, []);

  return { upload, cancel, reset, status, progress, media, error };
}

/** Retrieve a media asset; auto-polls while it is still uploading/processing. */
export function useMedia(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: mediaKeys.detail(id),
      queryFn: async () =>
        unwrap(await client.GET('/media/{id}', { params: { path: { id } } })),
      enabled: Boolean(id),
      refetchInterval: (query) => {
        const current = query.state.data;
        return current?.status === 'uploading' || current?.status === 'processing'
          ? 2000
          : false;
      },
    },
    queryClient,
  );
}

/** Update a media asset: alt text / metadata / external_id, or extend targets. */
export function useUpdateMedia() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async ({ id, ...body }: { id: string } & UpdateMediaInput) =>
        unwrap(
          await client.PATCH('/media/{id}', {
            params: { path: { id } },
            body,
          }),
        ),
      onSuccess: (result, { id }) =>
        queryClient.setQueryData(mediaKeys.detail(id), result),
    },
    queryClient,
  );
}

/** Delete a media asset and its stored renditions. */
export function useDeleteMedia() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async (id: string) =>
        unwrap(
          await client.DELETE('/media/{id}', { params: { path: { id } } }),
        ),
      onSuccess: (_result, id) =>
        queryClient.removeQueries({ queryKey: mediaKeys.detail(id) }),
    },
    queryClient,
  );
}

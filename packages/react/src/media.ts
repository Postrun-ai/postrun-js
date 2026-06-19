import { useMutation, useQuery } from '@tanstack/react-query';
import pLimit from 'p-limit';
import pRetry, { AbortError } from 'p-retry';
import pWaitFor from 'p-wait-for';
import { useCallback, useRef, useState } from 'react';

import {
  mediaCreate,
  mediaDelete,
  mediaGet,
  mediaList,
  mediaUpdate,
} from '@postrun/js';
import type {
  ListMediaQuery,
  MediaKind,
  MediaResource,
  MediaTarget,
  Metadata,
  PostrunClient,
  UpdateMediaInput,
} from '@postrun/js';

import { usePostrun } from './context';
import { useInfiniteList } from './infinite-list';
import { mediaKeys } from './keys';
import { UploadError, uploadBytes } from './upload-bytes';

/**
 * Poll the asset until it settles (ready/failed), respecting cancellation.
 * `onTick` fires with each fetched resource so callers can surface the live
 * `progress.{stage,percent}` the API reports during processing.
 */
async function pollUntilSettled(
  client: PostrunClient,
  id: string,
  signal: AbortSignal,
  onTick?: (resource: MediaResource) => void,
): Promise<MediaResource> {
  let latest: MediaResource | undefined;
  await pWaitFor(
    async () => {
      if (signal.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }
      latest = (await mediaGet({ client, path: { id } })).data;
      onTick?.(latest);
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
  /** Optional override — omit and the API auto-detects the kind from the bytes. */
  kind?: MediaKind;
  /**
   * Optional override — omit and the API auto-detects the MIME from the bytes.
   * Still useful for a legacy Office binary (.doc/.ppt) whose magic bytes can't be
   * disambiguated by the server sniff.
   */
  contentType?: string;
  /** Store as-is with zero processing. */
  raw?: boolean;
  altText?: string;
  externalId?: string;
  metadata?: Metadata;
}

/**
 * The core single-file upload pipeline used by `useMediaUpload` for every file
 * (single or batched) so the create → PUT-with-retry → poll-until-settled
 * sequence lives in exactly one place. Pure orchestration — no React state; the
 * caller passes an `AbortSignal` and callbacks so it can drive its own UI. Throws
 * on a hard failure / abort; returns the settled `MediaResource` (which may itself
 * be `failed`).
 */
async function runUpload(
  client: PostrunClient,
  file: File,
  options: MediaUploadOptions,
  signal: AbortSignal,
  callbacks: {
    onProgress: (fraction: number) => void;
    onProcessing: () => void;
    onPoll?: (resource: MediaResource) => void;
  },
): Promise<MediaResource> {
  // The API auto-detects `kind` + `content_type` from the uploaded bytes
  // (magic-number sniff). Both ride as PURE OPTIONAL OVERRIDES — `undefined` when
  // the caller omits them, so the server detects; never fabricated client-side.
  const created = (
    await mediaCreate({
      client,
      body: {
        profile_id: options.profileId,
        kind: options.kind,
        content_type: options.contentType,
        targets: options.targets,
        raw: options.raw,
        alt_text: options.altText,
        external_id: options.externalId,
        metadata: options.metadata,
      },
    })
  ).data;

  if (created.upload) {
    const target = created.upload;
    await pRetry(
      async () => {
        try {
          await uploadBytes(target, file, {
            onProgress: callbacks.onProgress,
            signal,
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
      { retries: 3, signal },
    );
  }

  callbacks.onProcessing();
  return pollUntilSettled(client, created.id, signal, callbacks.onPoll);
}

/** One file's slot in an upload — its own live status, progress, and settled
 *  asset. `status` is never `idle` (an item exists only once uploading). */
export interface MediaUploadItem {
  /** Stable local id (NOT the asset id) — use as the React key and for `remove`. */
  id: string;
  file: File;
  status: Exclude<MediaUploadStatus, 'idle'>;
  /** 0–1 client-side BYTE-upload bar. `media.progress.{stage,percent}` is the
   *  live SERVER pipeline bar. */
  progress: number;
  media: MediaResource | null;
  error: unknown;
}

export interface UseMediaUploadResult {
  /** Every file added, in add-order, with its live state. */
  items: readonly MediaUploadItem[];
  /** The settled-ready assets, in item order — what you attach to a post. */
  ready: readonly MediaResource[];
  /** True while any item is still uploading or processing. */
  isUploading: boolean;
  /**
   * Upload ONE file or MANY under `options`, gated by `concurrency`. The reactive
   * `items` update live for UI; the returned promise is for imperative flows —
   * it resolves to the settled (`ready`|`failed`) resources for THIS batch, in
   * add-order, EXCLUDING any item removed/aborted mid-flight. Single-file usage:
   * `const [asset] = await add(file, opts)`.
   */
  add: (
    files: File | FileList | readonly File[],
    options: MediaUploadOptions,
  ) => Promise<MediaResource[]>;
  /** Drop an item by local id — aborts it if still in flight. */
  remove: (id: string) => void;
  /** Abort everything and clear the list. */
  reset: () => void;
}

export interface UseMediaUploadOptions {
  /**
   * How many files upload at once; the rest queue (default 3). Fixed for the
   * hook's lifetime — set it once when you call the hook.
   */
  concurrency?: number;
}

/** Normalize the accepted input (one File, a FileList, or an array) to a File[]. */
function toFileArray(files: File | FileList | readonly File[]): File[] {
  if (files instanceof File) return [files];
  return Array.from(files);
}

/**
 * Upload one OR many files and get back platform-validated assets. The hook owns
 * the whole journey per file: create the asset (the API auto-detects
 * kind/content_type from the bytes), PUT the bytes with live `progress` + retry,
 * poll until processing settles, and expose `media.per_platform` (per-target
 * status, url, warnings,
 * errors). Every file gets its own `MediaUploadItem` slot in `items`; `ready` is
 * the settled assets to attach to a post; `remove`/`reset` abort in-flight work.
 * Uploads run through ONE shared `p-limit` gate so only `concurrency` (default 3)
 * are in flight at once — global across `add` calls, not per-call.
 *
 * Single-file usage: `const [asset] = await add(file, opts)` (or read `ready[0]`).
 */
export function useMediaUpload(
  options?: UseMediaUploadOptions,
): UseMediaUploadResult {
  const { client, queryClient } = usePostrun();
  const [items, setItems] = useState<readonly MediaUploadItem[]>([]);
  // Local-id → controller, so `remove`/`reset` can abort an in-flight upload.
  const controllers = useRef<Map<string, AbortController>>(new Map());
  // One shared concurrency gate for the hook's lifetime — files queued across
  // multiple `add` calls all funnel through it, so the cap is global, not per-add.
  const limitRef = useRef<ReturnType<typeof pLimit> | null>(null);
  if (!limitRef.current) {
    limitRef.current = pLimit(options?.concurrency ?? 3);
  }

  const patch = useCallback(
    (id: string, changes: Partial<MediaUploadItem>) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      );
    },
    [],
  );

  const add = useCallback(
    (
      files: File | FileList | readonly File[],
      uploadOptions: MediaUploadOptions,
    ): Promise<MediaResource[]> => {
      const queued: MediaUploadItem[] = toFileArray(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'uploading',
        progress: 0,
        media: null,
        error: null,
      }));

      setItems((current) => [...current, ...queued]);

      const limit = limitRef.current;
      if (!limit) {
        return Promise.resolve([]);
      }

      // Each item resolves to its settled resource, or `null` if it was
      // removed/aborted mid-flight. These per-item promises NEVER reject, so the
      // batch `Promise.all` can't leave a hanging/unhandled rejection.
      const settlements = queued.map((item) => {
        const controller = new AbortController();
        controllers.current.set(item.id, controller);

        return limit(() => {
          // Removed while still queued behind the gate — skip the work entirely.
          if (controller.signal.aborted) {
            throw new DOMException('Upload aborted', 'AbortError');
          }
          return runUpload(client, item.file, uploadOptions, controller.signal, {
            onProgress: (progress) => patch(item.id, { progress }),
            onProcessing: () => patch(item.id, { status: 'processing' }),
            // Live server progress (stage + percent) each poll tick.
            onPoll: (media) => patch(item.id, { media }),
          });
        })
          .then((settled): MediaResource => {
            patch(item.id, {
              status: settled.status === 'failed' ? 'failed' : 'ready',
              media: settled,
              progress: 1,
            });
            queryClient.setQueryData(mediaKeys.detail(settled.id), settled);
            void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
            return settled;
          })
          .catch((error: unknown): MediaResource | null => {
            // An aborted item was removed — its slot is already gone; resolve to
            // null so the batch promise drops it instead of hanging or rejecting.
            if (controller.signal.aborted) {
              return null;
            }
            patch(item.id, { status: 'failed', error });
            return null;
          })
          .finally(() => {
            controllers.current.delete(item.id);
          });
      });

      return Promise.all(settlements).then((results) =>
        results.filter((result): result is MediaResource => result !== null),
      );
    },
    [client, queryClient, patch],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const reset = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    setItems([]);
  }, []);

  const ready = items.flatMap((item) =>
    item.status === 'ready' && item.media ? [item.media] : [],
  );
  const isUploading = items.some(
    (item) => item.status === 'uploading' || item.status === 'processing',
  );

  return { items, ready, isUploading, add, remove, reset };
}

/** Retrieve a media asset; auto-polls while it is still uploading/processing. */
export function useMedia(id: string) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: mediaKeys.detail(id),
      queryFn: async () =>
        (await mediaGet({ client, path: { id } })).data,
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

/**
 * List media assets under the account, newest first. Filter by `profile_id`,
 * `status`, `kind`, your own `external_id`, or `metadata` (exact-match
 * containment), with offset `limit`/`offset` pagination. Returns one page; use
 * `useMediaInfinite` for a load-more feed.
 */
export function useMediaList(query?: ListMediaQuery) {
  const { client, queryClient } = usePostrun();
  return useQuery(
    {
      queryKey: mediaKeys.list(query),
      queryFn: async () => (await mediaList({ client, query })).data,
    },
    queryClient,
  );
}

/**
 * Load-more / infinite-scroll view over the media list — same filters as
 * `useMediaList` minus pagination, which the helper drives. Returns
 * `{ items, total, loadMore, hasMore, … }`.
 */
export function useMediaInfinite(
  filters?: Omit<ListMediaQuery, 'limit' | 'offset'>,
  options?: { pageSize?: number },
) {
  const { client } = usePostrun();
  return useInfiniteList<MediaResource>({
    queryKey: mediaKeys.infinite(filters),
    limit: options?.pageSize,
    fetchPage: async ({ limit, offset }) =>
      (await mediaList({ client, query: { ...filters, limit, offset } })).data,
  });
}

/** Update a media asset: alt text / metadata / external_id, or extend targets. */
export function useUpdateMedia() {
  const { client, queryClient } = usePostrun();
  return useMutation(
    {
      mutationFn: async ({ id, ...body }: { id: string } & UpdateMediaInput) =>
        (await mediaUpdate({ client, path: { id }, body })).data,
      onSuccess: (result, { id }) => {
        queryClient.setQueryData(mediaKeys.detail(id), result);
        void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      },
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
        (await mediaDelete({ client, path: { id } })).data,
      onSuccess: (_result, id) => {
        queryClient.removeQueries({ queryKey: mediaKeys.detail(id) });
        void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      },
    },
    queryClient,
  );
}

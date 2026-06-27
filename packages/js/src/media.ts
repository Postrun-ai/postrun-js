import pWaitFor from 'p-wait-for';

import type { PostrunClient } from './client';
import { mediaGet } from './client/sdk.gen';
import type { MediaResource } from './resources';

/** Default delay between status polls. */
const DEFAULT_POLL_INTERVAL_MS = 1_500;

/**
 * Default ceiling before giving up. Server-side video transcode can legitimately
 * take many minutes on a busy worker, so this backstop is generous — a short one
 * marks still-processing-but-eventually-ready videos as a timeout. 30 minutes is
 * a backstop, NOT the expectation; assets normally settle in seconds-to-minutes.
 */
const DEFAULT_POLL_TIMEOUT_MS = 30 * 60 * 1_000;

export interface WaitForMediaOptions {
  /** Typed client to poll through; falls back to the SDK's default client. */
  client?: PostrunClient;
  /** Milliseconds between polls (default 1500). */
  pollInterval?: number;
  /** Milliseconds before giving up and rejecting (default 30 minutes). */
  timeout?: number;
  /** Abort the wait early. */
  signal?: AbortSignal;
  /** Each polled snapshot — surface `progress.percent` while it processes. */
  onPoll?: (media: MediaResource) => void;
}

/**
 * Resolve once a media asset stops processing. Polls `GET /v1/media/{id}` until
 * `status` is `ready` OR `failed`, returning that settled resource — a `failed`
 * asset RESOLVES (the caller inspects `status`/`error`), it does not throw. Rejects
 * on timeout or when `signal` aborts (a `DOMException('…', 'AbortError')`).
 */
export async function waitForMedia(
  mediaId: string,
  options: WaitForMediaOptions = {},
): Promise<MediaResource> {
  const {
    client,
    pollInterval = DEFAULT_POLL_INTERVAL_MS,
    timeout = DEFAULT_POLL_TIMEOUT_MS,
    signal,
    onPoll,
  } = options;

  let latest: MediaResource | undefined;
  await pWaitFor(
    async () => {
      if (signal?.aborted) {
        throw new DOMException('Media wait aborted', 'AbortError');
      }
      latest = (await mediaGet({ client, path: { id: mediaId } })).data;
      onPoll?.(latest);
      return latest.status === 'ready' || latest.status === 'failed';
    },
    { interval: pollInterval, timeout },
  );

  if (!latest) {
    throw new Error('Media polling returned no result.');
  }
  return latest;
}

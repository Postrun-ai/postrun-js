/**
 * A failed direct-to-storage (multipart) upload. `cause` carries the underlying
 * Uppy / network / API error so callers can inspect the real reason; `message` is
 * a short human summary. Thrown by {@link uploadFile} on a hard upload failure
 * (one or more parts could not be uploaded, or `complete` failed).
 */
export class UploadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UploadError';
  }
}

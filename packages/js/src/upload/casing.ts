import type { AwsS3Part } from '@uppy/aws-s3';

import type {
  MediaCompleteData,
  MediaListPartsResponse,
} from '../client/types.gen';

/**
 * The casing seam between Uppy's `@uppy/aws-s3` callbacks (which speak S3
 * PascalCase — `{ PartNumber, ETag, Size }`) and our endpoints (which speak the
 * API's snake_case — `{ part_number, etag, size }`). Uppy reads the parts we hand
 * it back from `listParts` and hands us the parts to send to `complete`, so a
 * silent mismatch here would break resume/complete with no error. Both maps are
 * pure and tested; the shapes are DERIVED from the generated client + Uppy types,
 * never hand-declared.
 */

/** One part as our `GET /media/{id}/multipart/parts` endpoint returns it. */
type ApiListedPart = MediaListPartsResponse['parts'][number];

/** One part as our `POST /media/{id}/multipart/complete` body carries it. */
type ApiCompletePart = NonNullable<MediaCompleteData['body']>['parts'][number];

/**
 * Map our snake_case listed parts → Uppy's S3 `AwsS3Part[]` so a resume after a
 * dropped connection skips the parts R2 already holds. A 1:1 field map — the
 * endpoint's `parts` contract guarantees `part_number`/`etag`/`size` on every
 * entry, so there's nothing to drop.
 */
export function listedPartsToS3(
  parts: readonly ApiListedPart[],
): AwsS3Part[] {
  return parts.map((part) => ({
    PartNumber: part.part_number,
    ETag: part.etag,
    Size: part.size,
  }));
}

/**
 * Map Uppy's S3 `AwsS3Part[]` (handed to `completeMultipartUpload`) → our
 * snake_case `complete` body parts. `AwsS3Part` types `PartNumber`/`ETag` as
 * optional; a part Uppy completes with always has both, but we assert the
 * invariant explicitly rather than cast — a missing field is a hard error, not a
 * silently-dropped part.
 */
export function s3PartsToComplete(
  parts: readonly AwsS3Part[],
): ApiCompletePart[] {
  return parts.map((part) => {
    if (part.PartNumber === undefined || part.ETag === undefined) {
      throw new Error(
        'Multipart complete received a part without PartNumber/ETag.',
      );
    }
    return { part_number: part.PartNumber, etag: part.ETag };
  });
}

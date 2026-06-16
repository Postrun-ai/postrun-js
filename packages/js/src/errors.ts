import * as z from 'zod';

import { zErrorCode } from './client/zod.gen';
import type { ErrorCode } from './client/types.gen';

/**
 * The closed set of machine-readable Postrun error codes — DERIVED from the
 * generated `ErrorCode` component union (emitted from the API's `ErrorCodeSchema`
 * via the OpenAPI spec), never hand-listed. Branch on `PostrunError.code` and the
 * compiler narrows + autocompletes the exact set the API can return. Each member
 * documents itself at https://docs.postrun.ai/errors/<code>.
 */
export type PostrunErrorCode = ErrorCode;

/**
 * The RFC 9457 problem body the Postrun API returns on every transport error —
 * its `encodeProblem` emits `{ type, title, status, code, detail, request_id?,
 * errors? }`, with the human message in `detail`.
 *
 * Modeled here with a tolerant Zod schema rather than DERIVED from the generated
 * types ON PURPOSE: the OpenAPI spec narrows `code` per-endpoint+status, so there
 * is no single generated "problem body" type to derive from — we parse the real
 * body here and surface the closed `code` union via `PostrunErrorCode`.
 */
const ProblemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  code: z.string().optional(),
  detail: z.string().optional(),
  // RFC 9457 calls the occurrence id `instance`; our bodies emit it as
  // `request_id`. Tolerate both, preferring `request_id`.
  request_id: z.string().optional(),
  instance: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), code: z.string(), detail: z.string() }))
    .optional(),
});

export type PostrunProblem = z.infer<typeof ProblemSchema>;

/** One invalid field on a validation (422) failure. */
export type PostrunFieldError = NonNullable<PostrunProblem['errors']>[number];

/** A typed error thrown by the client on a failed request. */
export class PostrunError extends Error {
  readonly status: number;
  /** The machine-readable code to branch on (closed union), if the body had one. */
  readonly code?: PostrunErrorCode;
  /** The request id for support/debugging (our `request_id`, or RFC `instance`). */
  readonly request_id?: string;
  /** Per-field validation problems on a 422, surfaced for convenience. */
  readonly fieldErrors: PostrunFieldError[];
  readonly problem?: PostrunProblem;

  constructor(status: number, rawProblem?: unknown) {
    const problem = ProblemSchema.safeParse(rawProblem).data;
    super(problem?.detail ?? problem?.title ?? `Postrun API error (${status})`);
    this.name = 'PostrunError';
    this.status = status;
    // Re-validate the body's `code` against the generated closed set so the field
    // is the typed union, not a bare string — an unknown code stays `undefined`
    // (no swallowed surprise) rather than being cast in.
    this.code = zErrorCode.safeParse(problem?.code).data;
    this.request_id = problem?.request_id ?? problem?.instance;
    this.fieldErrors = problem?.errors ?? [];
    this.problem = problem;
  }
}

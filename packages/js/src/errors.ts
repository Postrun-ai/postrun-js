import * as z from 'zod';

/**
 * The RFC 9457 problem body the Postrun API returns on every transport error —
 * its `encodeProblem` emits `{ type, title, status, code, detail, errors? }`,
 * with the human message in `detail`.
 *
 * Modeled here with a tolerant Zod schema rather than DERIVED from the generated
 * types ON PURPOSE: the OpenAPI spec currently documents oRPC's *default* error
 * shape (`{ defined, code, status, message, data }`), NOT the RFC 9457 body the
 * custom encoder actually sends — so the generated `error` type is wrong. We
 * parse the real body here. Once the spec documents RFC 9457 (the SDK-generation
 * fix), this should be derived from the contract and the schema deleted.
 */
const ProblemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  code: z.string().optional(),
  detail: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), code: z.string(), detail: z.string() }))
    .optional(),
});

export type PostrunProblem = z.infer<typeof ProblemSchema>;

/** A typed error thrown by `unwrap` when a request fails. */
export class PostrunError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly problem?: PostrunProblem;

  constructor(status: number, rawProblem?: unknown) {
    const problem = ProblemSchema.safeParse(rawProblem).data;
    super(problem?.detail ?? problem?.title ?? `Postrun API error (${status})`);
    this.name = 'PostrunError';
    this.status = status;
    this.code = problem?.code;
    this.problem = problem;
  }
}

/**
 * Turn a Hey API `{ data, error, response }` result into a value or a throw. The
 * client never throws by design (default `throwOnError: false`); hooks want
 * try/catch, so this is the bridge: success → `data`, failure → a typed
 * `PostrunError`. `response` is typed optional by the client but is always
 * present once the request resolves; a missing one is treated as a status-0
 * failure rather than crashing.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response?: Response;
}): T {
  const status = result.response?.status ?? 0;

  if (!result.response?.ok || result.error !== undefined) {
    throw new PostrunError(status, result.error);
  }

  if (result.data === undefined) {
    throw new PostrunError(status);
  }

  return result.data;
}

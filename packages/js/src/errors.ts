/**
 * The RFC 9457 problem envelope the Postrun API returns on transport errors.
 * Per-operation `error` bodies are already spec-typed by openapi-fetch; this is
 * the shared shape for the throwing ergonomic (`unwrap`) the hooks build on.
 */
export interface PostrunProblem {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  request_id?: string | null;
  errors?: Array<{ field: string; code: string; detail: string }>;
}

/** A typed error thrown by `unwrap` when a request fails. */
export class PostrunError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly problem?: PostrunProblem;

  constructor(status: number, problem?: PostrunProblem) {
    super(problem?.detail ?? problem?.title ?? `Postrun API error (${status})`);
    this.name = 'PostrunError';
    this.status = status;
    this.code = problem?.code;
    this.requestId = problem?.request_id ?? undefined;
    this.problem = problem;
  }
}

/**
 * Turn an openapi-fetch `{ data, error, response }` result into a value or a
 * throw. openapi-fetch never throws by design; hooks want try/catch, so this is
 * the bridge: success → `data`, failure → a typed `PostrunError`.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (!result.response.ok || result.error !== undefined) {
    throw new PostrunError(
      result.response.status,
      result.error as PostrunProblem | undefined,
    );
  }

  return result.data as T;
}

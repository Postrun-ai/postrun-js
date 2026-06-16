import { expectTypeOf, expect, test } from 'vitest';

import { PostrunError } from './errors';
import type { PostrunErrorCode } from './errors';

/** A representative RFC 9457 body the API's `encodeProblem` emits. */
const sampleProblem = {
  type: 'https://docs.postrun.ai/errors/validation_failed',
  title: 'The request body failed validation.',
  status: 422,
  code: 'validation_failed',
  detail: 'One or more fields are invalid.',
  request_id: 'req_abc123',
  errors: [
    { field: 'variants.0.platform', code: 'invalid_value', detail: 'Unknown platform.' },
    { field: 'profile_id', code: 'invalid_type', detail: 'Expected string.' },
  ],
};

test('PostrunError populates code, request_id and fieldErrors from an RFC 9457 body', () => {
  const error = new PostrunError(422, sampleProblem);

  expect(error.status).toBe(422);
  expect(error.code).toBe('validation_failed');
  expect(error.request_id).toBe('req_abc123');
  expect(error.message).toBe('One or more fields are invalid.');
  expect(error.fieldErrors).toEqual(sampleProblem.errors);
});

test('PostrunError.code is the typed closed union (narrows on a literal)', () => {
  const error = new PostrunError(404, {
    code: 'not_found',
    detail: 'No profile with that id.',
  });

  // The compile-time guarantee: `code` is the closed union, not bare `string`.
  expectTypeOf(error.code).toEqualTypeOf<PostrunErrorCode | undefined>();

  if (error.code === 'not_found') {
    expect(error.code).toBe('not_found');
  } else {
    throw new Error('expected the not_found branch to narrow');
  }
});

test('PostrunError leaves code undefined for an unknown code (no swallowed surprise)', () => {
  const error = new PostrunError(500, { code: 'totally_made_up', detail: 'boom' });

  expect(error.code).toBeUndefined();
  expect(error.message).toBe('boom');
});

test('PostrunError tolerates the RFC `instance` as the request id', () => {
  const error = new PostrunError(409, {
    code: 'conflict',
    detail: 'Already exists.',
    instance: 'req_from_instance',
  });

  expect(error.request_id).toBe('req_from_instance');
});

test('PostrunError defaults fieldErrors to an empty array when absent', () => {
  const error = new PostrunError(403, { code: 'forbidden', detail: 'Nope.' });

  expect(error.fieldErrors).toEqual([]);
});

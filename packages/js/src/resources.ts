import type { operations } from './generated/types';

/**
 * Resource and input shapes, DERIVED from the generated OpenAPI `operations`.
 * Never hand-declared — there is exactly one definition of each, sourced from
 * the contract, so `pnpm generate` keeps them in lockstep with the live API.
 *
 * (Direct path-indexing is intentional while only `profiles` exists; extract a
 * shared `Success<Op>` / `Body<Op>` helper once a second resource repeats it.)
 */

/** A profile — a client/brand workspace. */
export type Profile =
  operations['profiles.get']['responses']['200']['content']['application/json'];

/** A page of profiles (the list envelope). */
export type ProfileList =
  operations['profiles.list']['responses']['200']['content']['application/json'];

/** Query parameters for listing profiles (filters + pagination). */
export type ListProfilesQuery = NonNullable<
  operations['profiles.list']['parameters']['query']
>;

/** Request body to create a profile. */
export type CreateProfileInput =
  operations['profiles.create']['requestBody']['content']['application/json'];

/** Request body to update a profile (send only what changes). */
export type UpdateProfileInput = NonNullable<
  operations['profiles.update']['requestBody']
>['content']['application/json'];

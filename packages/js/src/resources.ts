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

/** A connected social/ads account on a profile. */
export type Connection =
  operations['connections.get']['responses']['200']['content']['application/json'];

/** A page of a profile's connections. */
export type ConnectionList =
  operations['connections.listByProfile']['responses']['200']['content']['application/json'];

/** The session returned when starting a connect (OAuth) flow. */
export type ConnectSession =
  operations['connections.connect']['responses']['201']['content']['application/json'];

/** A platform a connection can start an OAuth connect flow for. */
export type ConnectablePlatform =
  operations['connections.connect']['requestBody']['content']['application/json']['platform'];

/** Accounts discoverable on a pending connection, for the selection step. */
export type DiscoverableAccountList =
  operations['connections.listAccounts']['responses']['200']['content']['application/json'];

/** Request body to select an account on a pending connection. */
export type SelectAccountInput = NonNullable<
  operations['connections.select']['requestBody']
>['content']['application/json'];

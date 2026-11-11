import { zTokensMintBody } from '../client/zod.gen';

/** `zTokensMintBody` plus the one rule OpenAPI can't express: an approver token
 * must name who is approving (`sub`), because the audit log records it. */
export const zTokensMintBodyChecked = zTokensMintBody.refine(
  (body) => !body.scopes.includes('posts:approve') || body.sub !== undefined,
  {
    message: 'sub is required when scopes include posts:approve.',
    path: ['sub'],
  },
);

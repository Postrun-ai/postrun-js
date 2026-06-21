import type { PreviewConnection } from './types';

/**
 * The display name a preview header shows above the @handle. Our API stores the
 * account's `external_account_name`; fall back to the `username`, then empty —
 * the one piece of header identity that isn't a verbatim connection field. Shared
 * so X and LinkedIn derive the name the same way.
 */
export function authorName(connection: PreviewConnection): string {
  return connection.external_account_name ?? connection.username ?? '';
}

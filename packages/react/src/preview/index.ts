/**
 * Post-preview components — faithful, schema-driven previews of how a post will
 * look once published. Hooks do the data work; these render the platform card so
 * you don't have to reproduce it. X and LinkedIn ship today; the per-platform
 * input types are shared so the others slot in next.
 */
export { XPostPreview } from './x';
export type { XPostPreviewProps } from './x';
export { LinkedInPostPreview } from './linkedin';
export type { LinkedInPostPreviewProps } from './linkedin';
export type {
  XPreviewAuthor,
  LinkedInPreviewAuthor,
  PreviewMedia,
  XPreviewMedia,
  XPreviewQuotedTweet,
  PreviewMediaKind,
} from './types';

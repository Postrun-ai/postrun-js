/**
 * Post-preview components — faithful, schema-driven previews of how a post will
 * look once published. Hooks do the data work; these render the platform card so
 * you don't have to reproduce it. X (Twitter) ships first; the per-platform
 * input types are shared so the others slot in next.
 */
export { XPostPreview } from './x';
export type { XPostPreviewProps } from './x';
export type {
  XPreviewAuthor,
  XPreviewMedia,
  XPreviewQuotedTweet,
  PreviewMediaKind,
} from './types';

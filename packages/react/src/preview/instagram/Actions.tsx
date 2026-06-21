import type { CSSProperties } from 'react';
import { FiBookmark, FiHeart, FiMessageCircle, FiSend } from 'react-icons/fi';

import { IG_VAR, varRef } from './theme';

/**
 * The Instagram action row — Like / Comment / Share on the left, Save on the
 * right. Real Feather icons (outline, matching IG's), NO fabricated counts (a
 * draft has none), consistent with our X/LinkedIn previews.
 */
export function Actions() {
  return (
    <div style={rowStyle}>
      <div style={leftStyle}>
        <FiHeart size={24} aria-label="Like" role="img" />
        <FiMessageCircle size={24} aria-label="Comment" role="img" />
        <FiSend size={24} aria-label="Share" role="img" />
      </div>
      <FiBookmark size={24} aria-label="Save" role="img" />
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px 4px',
  color: varRef(IG_VAR.text),
};

const leftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

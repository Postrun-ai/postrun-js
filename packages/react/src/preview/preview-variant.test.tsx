import type { TikTokCreatorInfo } from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  InstagramPostPreview,
  LinkedInPostPreview,
  TikTokPostPreview,
  XPostPreview,
  type ReadPostVariant,
} from '../index';
import { connection, readyMedia } from './test-helpers';

// These cases are type tests as much as render tests: `pnpm typecheck` covers
// this file, and each variant below used to be rejected by the preview props.

const BODY = 'big news today';

const creatorInfo: TikTokCreatorInfo = {
  creator: { nickname: 'Acme Studio', username: 'acmestudio', avatar_url: null },
  privacy_options: ['SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

describe('a preview variant needs only what the preview reads', () => {
  it.each([
    ['X', <XPostPreview variant={{ platform: 'x', body: BODY }} connection={connection()} />],
    [
      'LinkedIn',
      <LinkedInPostPreview
        variant={{ platform: 'linkedin', body: BODY }}
        connection={connection({ platform: 'linkedin' })}
      />,
    ],
    [
      'Instagram',
      <InstagramPostPreview
        variant={{ platform: 'instagram', body: BODY }}
        connection={connection({ platform: 'instagram' })}
      />,
    ],
    [
      'TikTok',
      <TikTokPostPreview variant={{ platform: 'tiktok', body: BODY }} creatorInfo={creatorInfo} />,
    ],
  ])('%s renders without connection_id or required settings', (_, preview) => {
    render(preview);
    expect(screen.getByText(new RegExp(BODY))).toBeDefined();
  });

  it('renders a fetched variant with new draft media spread in', () => {
    const fetched: ReadPostVariant<'linkedin'> = {
      platform: 'linkedin',
      post_type: 'text',
      content_kind: 'text',
      id: 'pv_li1',
      object: 'post_variant',
      connection_id: null,
      body: BODY,
      status: 'draft',
      schedule_at: null,
      result: null,
      error: null,
      media: [],
      settings: { visibility: 'PUBLIC' },
    };
    render(
      <LinkedInPostPreview
        variant={{ ...fetched, media: [{ media_id: 'm2' }] }}
        connection={connection({ platform: 'linkedin' })}
        media={[readyMedia('m2', 'linkedin', { alt_text: 'new photo' })]}
      />,
    );
    expect(screen.getByAltText('new photo')).toBeDefined();
  });
});

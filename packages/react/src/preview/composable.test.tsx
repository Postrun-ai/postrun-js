import type {
  InstagramPostVariant,
  LinkedInPostVariant,
  TikTokCreatorInfo,
  TikTokPostVariant,
  XPostVariant,
} from '@postrun/js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  InstagramPreviewActions,
  InstagramPreviewContent,
  InstagramPreviewHeader,
  InstagramPreviewRoot,
  LinkedInPreviewActions,
  LinkedInPreviewContent,
  LinkedInPreviewHeader,
  LinkedInPreviewRoot,
  TikTokPreviewActions,
  TikTokPreviewContent,
  TikTokPreviewRoot,
  XPreviewActions,
  XPreviewContent,
  XPreviewHeader,
  XPreviewRoot,
  useInstagramPreview,
  useLinkedInPreview,
  useTikTokPreview,
  useXPreview,
} from '../index';
import { connection } from './test-helpers';

const BODY = 'big news today';

function xVariant(): XPostVariant {
  return { platform: 'x', connection_id: 'c1', body: BODY, media: [], settings: {} };
}

function liVariant(): LinkedInPostVariant {
  return {
    platform: 'linkedin',
    connection_id: 'c1',
    body: BODY,
    media: [],
    settings: { visibility: 'CONNECTIONS' },
  };
}

function igVariant(): InstagramPostVariant {
  return { platform: 'instagram', connection_id: 'c1', body: BODY, media: [], settings: {} };
}

function ttVariant(): TikTokPostVariant {
  return {
    platform: 'tiktok',
    connection_id: 'c1',
    body: BODY,
    media: [],
    settings: {},
  };
}

const creatorInfo: TikTokCreatorInfo = {
  creator: { nickname: 'Acme Studio', username: 'acmestudio', avatar_url: null },
  privacy_options: ['SELF_ONLY'],
  interaction: { comment: true, duet: true, stitch: false },
  max_video_duration_sec: 600,
};

describe('composable previews: a custom part replaces the default body', () => {
  it('X', () => {
    function CustomBody() {
      const { variant } = useXPreview();
      return <p>custom: {variant.body}</p>;
    }
    render(
      <XPreviewRoot variant={xVariant()} connection={connection()}>
        <XPreviewHeader />
        <CustomBody />
        <XPreviewContent />
        <XPreviewActions />
      </XPreviewRoot>,
    );
    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText(`custom: ${BODY}`)).toBeDefined();
    expect(screen.queryByText(BODY)).toBeNull();
  });

  it('LinkedIn', () => {
    function CustomBody() {
      const { variant, visibility } = useLinkedInPreview();
      return <p>custom: {variant.body} ({visibility})</p>;
    }
    render(
      <LinkedInPreviewRoot variant={liVariant()} connection={connection()}>
        <LinkedInPreviewHeader />
        <CustomBody />
        <LinkedInPreviewContent />
        <LinkedInPreviewActions />
      </LinkedInPreviewRoot>,
    );
    expect(screen.getByText('Acme Studio')).toBeDefined();
    expect(screen.getByText(`custom: ${BODY} (CONNECTIONS)`)).toBeDefined();
    expect(screen.queryByText(BODY)).toBeNull();
  });

  it('Instagram', () => {
    function CustomBody() {
      const { author, variant } = useInstagramPreview();
      return <p>custom: {author.username} {variant.body}</p>;
    }
    render(
      <InstagramPreviewRoot variant={igVariant()} connection={connection()}>
        <InstagramPreviewHeader />
        <InstagramPreviewContent />
        <InstagramPreviewActions />
        <CustomBody />
      </InstagramPreviewRoot>,
    );
    expect(screen.getByText(`custom: acmestudio ${BODY}`)).toBeDefined();
    expect(screen.queryByText(BODY)).toBeNull();
  });

  it('TikTok', () => {
    function CustomBody() {
      const { handle, variant } = useTikTokPreview();
      return <p>custom: {handle} {variant.body}</p>;
    }
    render(
      <TikTokPreviewRoot variant={ttVariant()} creatorInfo={creatorInfo}>
        <TikTokPreviewContent />
        <CustomBody />
        <TikTokPreviewActions />
      </TikTokPreviewRoot>,
    );
    expect(screen.getByText(`custom: acmestudio ${BODY}`)).toBeDefined();
    expect(screen.queryByText(BODY)).toBeNull();
  });
});

describe('composable previews: a part outside its root', () => {
  it('throws an error naming the root it needs', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<LinkedInPreviewHeader />)).toThrow(
      'must be rendered inside <LinkedInPreviewRoot>',
    );
    vi.restoreAllMocks();
  });
});

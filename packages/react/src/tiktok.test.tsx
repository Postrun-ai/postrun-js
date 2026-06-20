import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { useTikTokCreatorInfo } from './tiktok';
import { recordFetch, testWrapper } from './test-utils';

const CREATOR_INFO = {
  creator: {
    nickname: 'Creator',
    username: 'creator',
    avatar_url: 'https://p.tiktokcdn.com/avatar.jpeg',
  },
  privacy_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  interaction: { comment: true, duet: false, stitch: true },
  max_video_duration_sec: 600,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test('useTikTokCreatorInfo fetches the creator info for a connection', async () => {
  const calls = recordFetch(CREATOR_INFO);
  const { result } = renderHook(() => useTikTokCreatorInfo('conn_1'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.data).toEqual(CREATOR_INFO);
  expect(result.current.error).toBeNull();

  // Hits the connection-scoped creator-info read.
  const request = calls.find((c) => c.method === 'GET')!;
  expect(new URL(request.url).pathname).toBe(
    '/v1/connections/conn_1/tiktok/creator-info',
  );
});

test('useTikTokCreatorInfo is DISABLED when connectionId is null (no request fires)', async () => {
  const calls = recordFetch(CREATOR_INFO);
  const { result } = renderHook(() => useTikTokCreatorInfo(null), {
    wrapper: testWrapper(),
  });

  // A disabled query never fetches: it stays pending without loading, no data.
  expect(result.current.fetchStatus).toBe('idle');
  expect(result.current.data).toBeUndefined();
  expect(calls).toHaveLength(0);
});

test('useTikTokCreatorInfo surfaces a non-TikTok / missing connection as an error', async () => {
  recordFetch(
    {
      type: 'https://docs.postrun.ai/errors/not_found',
      title: 'The requested resource was not found.',
      status: 404,
      code: 'not_found',
    },
    404,
  );
  const { result } = renderHook(() => useTikTokCreatorInfo('conn_other'), {
    wrapper: testWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
});

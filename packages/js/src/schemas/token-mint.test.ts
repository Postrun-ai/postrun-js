import { describe, expect, it } from 'vitest';

import { zTokensMintBodyChecked } from './token-mint';

const base = { profile_scope: { type: 'all' as const } };

describe('zTokensMintBodyChecked', () => {
  it('rejects posts:approve without sub', () => {
    const result = zTokensMintBodyChecked.safeParse({
      ...base,
      scopes: ['posts:approve'],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['sub']);
  });

  it('accepts posts:approve with sub', () => {
    expect(
      zTokensMintBodyChecked.safeParse({
        ...base,
        scopes: ['posts:approve'],
        sub: 'user_1',
      }).success,
    ).toBe(true);
  });

  it('does not require sub for other scopes', () => {
    expect(
      zTokensMintBodyChecked.safeParse({ ...base, scopes: ['posts:write'] })
        .success,
    ).toBe(true);
  });
});

import { describe, expect, test, vi } from 'vitest';

import { createTokenCache } from './token-cache';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/** A promise whose settlers are captured so a test can fire them on demand. */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Yield to the microtask queue so an in-flight `getToken` has started. */
function tick(): Promise<void> {
  return Promise.resolve();
}

describe('createTokenCache', () => {
  test('first current() calls getToken once and returns the token', async () => {
    const getToken = vi.fn(async () => 'tok-a');
    const cache = createTokenCache(getToken);

    expect(await cache.current()).toBe('tok-a');
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  test('second current() reuses the cache without calling getToken', async () => {
    const getToken = vi.fn(async () => 'tok-a');
    const cache = createTokenCache(getToken);

    await cache.current();
    expect(await cache.current()).toBe('tok-a');
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  test('concurrent current() during a fetch dedupe to one getToken call', async () => {
    const gate = deferred<string>();
    const getToken = vi.fn(() => gate.promise);
    const cache = createTokenCache(getToken);

    const calls = Array.from({ length: 10 }, () => cache.current());
    await tick();
    gate.resolve('tok-a');
    const results = await Promise.all(calls);

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(results.every((token) => token === 'tok-a')).toBe(true);
  });

  test('refresh() discards the cache, mints again, and current() serves it', async () => {
    const getToken = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('tok-a')
      .mockResolvedValueOnce('tok-b');
    const cache = createTokenCache(getToken);

    expect(await cache.current()).toBe('tok-a');
    expect(await cache.refresh()).toBe('tok-b');
    expect(getToken).toHaveBeenCalledTimes(2);
    // A following current() serves the refreshed token without re-minting.
    expect(await cache.current()).toBe('tok-b');
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  test('concurrent refresh() calls dedupe to one getToken call', async () => {
    const gate = deferred<string>();
    const getToken = vi.fn(() => gate.promise);
    const cache = createTokenCache(getToken);

    const calls = [cache.refresh(), cache.refresh()];
    await tick();
    gate.resolve('tok-a');
    const results = await Promise.all(calls);

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['tok-a', 'tok-a']);
  });

  test('current() propagates a getToken rejection (no fallback token)', async () => {
    const getToken = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('mint down'));
    const cache = createTokenCache(getToken);

    await expect(cache.current()).rejects.toThrow('mint down');
  });

  test('refresh() propagates a getToken rejection', async () => {
    const getToken = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('tok-a')
      .mockRejectedValueOnce(new Error('mint down'));
    const cache = createTokenCache(getToken);

    await cache.current();
    await expect(cache.refresh()).rejects.toThrow('mint down');
  });

  test('a failed fetch clears the in-flight so the next call retries', async () => {
    const getToken = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('mint down'))
      .mockResolvedValueOnce('tok-a');
    const cache = createTokenCache(getToken);

    await expect(cache.current()).rejects.toThrow('mint down');
    expect(await cache.current()).toBe('tok-a');
    expect(getToken).toHaveBeenCalledTimes(2);
  });
});

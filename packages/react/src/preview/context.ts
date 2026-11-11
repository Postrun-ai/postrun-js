import { createContext, useContext } from 'react';

/** One network's preview context: the Root provides the derived data, and the
 * hook lets any part (ours or the customer's) read it. Outside its Root the hook
 * throws, so a misplaced part fails loudly instead of rendering blank. */
export function createPreviewContext<T>(rootName: string) {
  const Context = createContext<T | null>(null);

  function usePreviewContext(): T {
    const value = useContext(Context);
    if (!value) {
      throw new Error(
        `Postrun preview parts must be rendered inside <${rootName}>.`,
      );
    }
    return value;
  }

  return [Context.Provider, usePreviewContext] as const;
}

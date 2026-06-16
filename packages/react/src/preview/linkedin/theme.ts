'use client';

import { useEffect, useState } from 'react';

/**
 * LinkedIn preview theming. Unlike the X preview (which inherits react-tweet's
 * CSS), we own the LinkedIn card, so we expose a small set of CSS custom
 * properties on the wrapper. The resolved palette sets their default values;
 * a customer can override any of them via `style`/`className`. Components read
 * `var(--pr-li-*)`, so restyling needs no fork.
 */

export type LinkedInTheme = 'light' | 'dark' | 'auto';

export const LI_VAR = {
  bg: '--pr-li-bg',
  text: '--pr-li-text',
  muted: '--pr-li-muted',
  border: '--pr-li-border',
  accent: '--pr-li-accent',
};

interface Palette {
  bg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
}

const LIGHT: Palette = {
  bg: '#ffffff',
  text: 'rgba(0,0,0,0.9)',
  muted: 'rgba(0,0,0,0.6)',
  border: 'rgba(0,0,0,0.08)',
  accent: 'rgb(10,102,194)',
};

const DARK: Palette = {
  bg: '#1b1f23',
  text: 'rgba(255,255,255,0.9)',
  muted: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.15)',
  accent: 'rgb(112,181,249)',
};

/** A CSS `var(...)` reference to one of the LinkedIn theme variables. */
export function varRef(name: string): string {
  return `var(${name})`;
}

/** The CSS custom-property declarations for a resolved scheme. Typed as a plain
 * string record (React's `CSSProperties` doesn't model `--custom` keys); it is
 * spread into the card's `style`, where React forwards it to the DOM. */
export function paletteVars(dark: boolean): Record<string, string> {
  const p = dark ? DARK : LIGHT;
  return {
    '--pr-li-bg': p.bg,
    '--pr-li-text': p.text,
    '--pr-li-muted': p.muted,
    '--pr-li-border': p.border,
    '--pr-li-accent': p.accent,
  };
}

/** Track the OS color scheme for `theme="auto"`. Starts light (SSR-safe, no
 * hydration mismatch) and updates after mount. */
export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return dark;
}

/** Resolve whether the card should render dark for a given theme prop. */
export function useIsDark(theme: LinkedInTheme): boolean {
  const prefersDark = usePrefersDark();
  if (theme === 'auto') {
    return prefersDark;
  }
  return theme === 'dark';
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Theming for the TikTok publish PANEL. The preview card itself is always dark
 * (TikTok's video surface is always dark), so only the panel adapts. We expose a
 * small set of CSS custom properties on the panel root; controls read
 * `var(--pr-tt-*)`, so a customer can restyle via `style`/`className` without a
 * fork. Mirrors the LinkedIn preview's theme approach.
 */

export type TikTokTheme = 'light' | 'dark' | 'auto';

export const TT_VAR = {
  text: '--pr-tt-text',
  muted: '--pr-tt-muted',
  border: '--pr-tt-border',
  accent: '--pr-tt-accent',
  switchOff: '--pr-tt-switch-off',
} as const;

interface Palette {
  text: string;
  muted: string;
  border: string;
  accent: string;
  switchOff: string;
}

const LIGHT: Palette = {
  text: 'rgba(0,0,0,0.9)',
  muted: 'rgba(0,0,0,0.55)',
  border: 'rgba(0,0,0,0.12)',
  accent: '#fe2c55',
  switchOff: 'rgba(0,0,0,0.18)',
};

const DARK: Palette = {
  text: 'rgba(255,255,255,0.92)',
  muted: '#8a8a92',
  border: 'rgba(255,255,255,0.14)',
  accent: '#fe2c55',
  switchOff: 'rgba(255,255,255,0.22)',
};

/** A CSS `var(...)` reference to one of the panel theme variables. */
export function varRef(name: string): string {
  return `var(${name})`;
}

/** The CSS custom-property declarations for a resolved scheme — spread into the
 * panel root's `style`. (React's `CSSProperties` doesn't model `--custom` keys,
 * so this is a plain string record.) */
export function paletteVars(dark: boolean): Record<string, string> {
  const p = dark ? DARK : LIGHT;
  return {
    [TT_VAR.text]: p.text,
    [TT_VAR.muted]: p.muted,
    [TT_VAR.border]: p.border,
    [TT_VAR.accent]: p.accent,
    [TT_VAR.switchOff]: p.switchOff,
  };
}

/** Track the OS color scheme for `theme="auto"`. Starts light (SSR-safe) and
 * updates after mount. */
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

/** Resolve whether the panel should render dark for a given theme prop. */
export function useIsDark(theme: TikTokTheme): boolean {
  const prefersDark = usePrefersDark();
  if (theme === 'auto') {
    return prefersDark;
  }
  return theme === 'dark';
}

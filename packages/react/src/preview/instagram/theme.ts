/**
 * Instagram feed-card theming. We own the card, so we expose CSS custom
 * properties on the wrapper; components read `var(--pr-ig-*)`.
 *
 * `auto` follows the OS color scheme the SAME way every card does (X via
 * react-tweet's `@media (prefers-color-scheme)`): the vars use the CSS
 * `light-dark()` function and the card sets `color-scheme` (`light dark` for auto,
 * else the explicit scheme). This resolves in CSS — instant, SSR-safe, no
 * JS-after-mount flash — so all previews agree on what `auto` means.
 */

export type InstagramTheme = 'light' | 'dark' | 'auto';

export const IG_VAR = {
  bg: '--pr-ig-bg',
  text: '--pr-ig-text',
  muted: '--pr-ig-muted',
  border: '--pr-ig-border',
  accent: '--pr-ig-accent',
} as const;

export function varRef(name: string): string {
  return `var(${name})`;
}

/** The palette as `light-dark(light, dark)` so it tracks the resolved
 * `color-scheme`. A stable module const (no per-render allocation); spread onto
 * the card alongside `colorSchemeFor(theme)`. */
const PALETTE_VARS: Record<string, string> = {
  [IG_VAR.bg]: 'light-dark(#ffffff, #000000)',
  [IG_VAR.text]: 'light-dark(#000000, #f5f5f5)',
  [IG_VAR.muted]: 'light-dark(#737373, #a8a8a8)',
  [IG_VAR.border]: 'light-dark(#dbdbdb, #262626)',
  [IG_VAR.accent]: 'light-dark(#00376b, #e0f1ff)',
};

export function paletteVars(): Record<string, string> {
  return PALETTE_VARS;
}

/** The `color-scheme` for a theme: the explicit scheme, or `light dark` for
 * `auto` (which makes `light-dark()` follow the OS preference). */
export function colorSchemeFor(theme: InstagramTheme): 'light' | 'dark' | 'light dark' {
  return theme === 'auto' ? 'light dark' : theme;
}

/**
 * LinkedIn preview theming. We own the card, so we expose CSS custom properties
 * on the wrapper; components read `var(--pr-li-*)`.
 *
 * `auto` follows the OS color scheme the SAME way every card does (X via
 * react-tweet's `@media (prefers-color-scheme)`): the vars use the CSS
 * `light-dark()` function and the card sets `color-scheme` (`light dark` for auto,
 * else the explicit scheme). This resolves in CSS — instant, SSR-safe, no
 * JS-after-mount flash — so all previews agree on what `auto` means.
 */

export type LinkedInTheme = 'light' | 'dark' | 'auto';

export const LI_VAR = {
  bg: '--pr-li-bg',
  text: '--pr-li-text',
  muted: '--pr-li-muted',
  border: '--pr-li-border',
  accent: '--pr-li-accent',
} as const;

export function varRef(name: string): string {
  return `var(${name})`;
}

/** The palette as `light-dark(light, dark)` so it tracks the resolved
 * `color-scheme`. A stable module const (no per-render allocation); spread onto
 * the card alongside `colorSchemeFor(theme)`. */
const PALETTE_VARS: Record<string, string> = {
  [LI_VAR.bg]: 'light-dark(#ffffff, #1b1f23)',
  [LI_VAR.text]: 'light-dark(rgba(0,0,0,0.9), rgba(255,255,255,0.9))',
  [LI_VAR.muted]: 'light-dark(rgba(0,0,0,0.6), rgba(255,255,255,0.6))',
  [LI_VAR.border]: 'light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.15))',
  [LI_VAR.accent]: 'light-dark(rgb(10,102,194), rgb(112,181,249))',
};

export function paletteVars(): Record<string, string> {
  return PALETTE_VARS;
}

/** The `color-scheme` for a theme: explicit, or `light dark` for `auto`. */
export function colorSchemeFor(theme: LinkedInTheme): 'light' | 'dark' | 'light dark' {
  return theme === 'auto' ? 'light dark' : theme;
}

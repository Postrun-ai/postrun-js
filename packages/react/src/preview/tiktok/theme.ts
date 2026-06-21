/**
 * Theming for the TikTok publish PANEL. The preview card itself is always dark
 * (TikTok's video surface is always dark), so only the panel adapts. We expose a
 * small set of CSS custom properties on the panel root; controls read
 * `var(--pr-tt-*)`, so a customer can restyle via `style`/`className` without a
 * fork. `auto` follows the OS color scheme via CSS `light-dark()` — the same way
 * every preview card resolves `auto`.
 */

export type TikTokTheme = 'light' | 'dark' | 'auto';

export const TT_VAR = {
  text: '--pr-tt-text',
  muted: '--pr-tt-muted',
  border: '--pr-tt-border',
  accent: '--pr-tt-accent',
  switchOff: '--pr-tt-switch-off',
} as const;

/** A CSS `var(...)` reference to one of the panel theme variables. */
export function varRef(name: string): string {
  return `var(${name})`;
}

/** The palette as `light-dark(light, dark)` so it tracks the resolved
 * `color-scheme`. Spread onto the panel root alongside `colorSchemeFor(theme)`. */
export function paletteVars(): Record<string, string> {
  return {
    [TT_VAR.text]: 'light-dark(rgba(0,0,0,0.9), rgba(255,255,255,0.92))',
    [TT_VAR.muted]: 'light-dark(rgba(0,0,0,0.55), #8a8a92)',
    [TT_VAR.border]: 'light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.14))',
    [TT_VAR.accent]: '#fe2c55',
    [TT_VAR.switchOff]: 'light-dark(rgba(0,0,0,0.18), rgba(255,255,255,0.22))',
  };
}

/** The `color-scheme` for a theme: explicit, or `light dark` for `auto` (which
 * makes `light-dark()` follow the OS preference). */
export function colorSchemeFor(theme: TikTokTheme): 'light' | 'dark' | 'light dark' {
  return theme === 'auto' ? 'light dark' : theme;
}

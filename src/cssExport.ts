/**
 * Exports a palette as CSS custom properties, e.g.:
 *
 * :root {
 *   --palette-1: #FF6B6B;
 *   ...
 * }
 */

/** Builds a `:root` block of CSS custom properties for the given hex colors. */
export function buildCssVariables(colors: string[], prefix = 'palette'): string {
  const lines = colors.map((hex, i) => `  --${prefix}-${i + 1}: ${hex};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

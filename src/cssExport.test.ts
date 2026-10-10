import { describe, expect, it } from 'vitest';
import { buildCssVariables } from './cssExport';

describe('buildCssVariables', () => {
  it('emits a :root block with one variable per color', () => {
    const css = buildCssVariables(['#111111', '#222222', '#333333', '#444444', '#555555']);
    expect(css).toBe(
      ':root {\n' +
        '  --palette-1: #111111;\n' +
        '  --palette-2: #222222;\n' +
        '  --palette-3: #333333;\n' +
        '  --palette-4: #444444;\n' +
        '  --palette-5: #555555;\n' +
        '}',
    );
  });

  it('supports a custom variable prefix', () => {
    const css = buildCssVariables(['#ABCDEF'], 'brand');
    expect(css).toContain('--brand-1: #ABCDEF;');
  });

  it('handles an empty palette', () => {
    expect(buildCssVariables([])).toBe(':root {\n\n}');
  });
});

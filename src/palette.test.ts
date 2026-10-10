import { describe, expect, it } from 'vitest';
import {
  PALETTE_SIZE,
  applyLocks,
  generatePalette,
  generatePaletteName,
  getContrastText,
  hexToRgb,
  hslToHex,
  isValidHex,
  normalizeHex,
  toggleLock,
  type PaletteColor,
  type RandomFn,
} from './palette';

/** Deterministic PRNG (mulberry32) for reproducible tests. */
function seeded(seed: number): RandomFn {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unlockedPalette(hexes: string[]): PaletteColor[] {
  return hexes.map((hex) => ({ hex, locked: false }));
}

describe('generatePalette', () => {
  it(`returns exactly ${PALETTE_SIZE} valid hex colors`, () => {
    const { colors } = generatePalette(seeded(1));
    expect(colors).toHaveLength(PALETTE_SIZE);
    for (const hex of colors) {
      expect(isValidHex(hex)).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(generatePalette(seeded(42))).toEqual(generatePalette(seeded(42)));
  });

  it('differs between seeds', () => {
    expect(generatePalette(seeded(1)).colors).not.toEqual(generatePalette(seeded(2)).colors);
  });

  it('provides a name and harmony label', () => {
    const { name, harmony } = generatePalette(seeded(7));
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    expect(typeof harmony).toBe('string');
    expect(harmony.length).toBeGreaterThan(0);
  });
});

describe('generatePaletteName', () => {
  it('returns a two-word name deterministically', () => {
    const a = generatePaletteName(seeded(3));
    const b = generatePaletteName(seeded(3));
    expect(a).toBe(b);
    expect(a.split(' ')).toHaveLength(2);
  });
});

describe('applyLocks', () => {
  const fresh = ['#111111', '#222222', '#333333', '#444444', '#555555'];

  it('keeps locked colors untouched and regenerates the rest', () => {
    const current = unlockedPalette(['#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE']);
    current[1] = { hex: '#BBBBBB', locked: true };
    current[3] = { hex: '#DDDDDD', locked: true };

    const next = applyLocks(current, fresh);

    expect(next[1]).toEqual({ hex: '#BBBBBB', locked: true });
    expect(next[3]).toEqual({ hex: '#DDDDDD', locked: true });
    expect(next[0]).toEqual({ hex: '#111111', locked: false });
    expect(next[2]).toEqual({ hex: '#333333', locked: false });
    expect(next[4]).toEqual({ hex: '#555555', locked: false });
  });

  it('replaces everything when nothing is locked', () => {
    const current = unlockedPalette(['#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE']);
    const next = applyLocks(current, fresh);
    expect(next.map((c) => c.hex)).toEqual(fresh);
    expect(next.every((c) => !c.locked)).toBe(true);
  });

  it('does not mutate the input arrays', () => {
    const current = unlockedPalette(['#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE']);
    const snapshot = current.map((c) => ({ ...c }));
    applyLocks(current, fresh);
    expect(current).toEqual(snapshot);
  });

  it('treats a missing previous entry as unlocked', () => {
    const next = applyLocks([], fresh);
    expect(next.map((c) => c.hex)).toEqual(fresh);
  });
});

describe('toggleLock', () => {
  it('flips the lock flag of the targeted index only', () => {
    const colors = unlockedPalette(['#111111', '#222222', '#333333', '#444444', '#555555']);
    const next = toggleLock(colors, 2);
    expect(next[2].locked).toBe(true);
    expect(next.filter((_, i) => i !== 2).every((c) => !c.locked)).toBe(true);
    // toggling again unlocks
    expect(toggleLock(next, 2)[2].locked).toBe(false);
  });

  it('preserves hex values and does not mutate the input', () => {
    const colors = unlockedPalette(['#111111', '#222222', '#333333', '#444444', '#555555']);
    const next = toggleLock(colors, 0);
    expect(next.map((c) => c.hex)).toEqual(colors.map((c) => c.hex));
    expect(colors[0].locked).toBe(false);
  });
});

describe('isValidHex', () => {
  it.each(['#fff', '#FFF', '#123abc', '#A1B2C3', '#000000', '  #ff00ff  '])(
    'accepts %s',
    (hex) => {
      expect(isValidHex(hex)).toBe(true);
    },
  );

  it.each(['fff', '#ff', '#ffff', '#gggggg', '#12345', '', '#1234567', 'red', '#12 34 56'])(
    'rejects %s',
    (hex) => {
      expect(isValidHex(hex)).toBe(false);
    },
  );
});

describe('normalizeHex', () => {
  it('expands shorthand and uppercases', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('#a1b2c3')).toBe('#A1B2C3');
    expect(normalizeHex('#FFFFFF')).toBe('#FFFFFF');
  });

  it('throws on invalid input', () => {
    expect(() => normalizeHex('not-a-color')).toThrow();
    expect(() => normalizeHex('#12')).toThrow();
  });
});

describe('hslToHex', () => {
  it('converts primary colors correctly', () => {
    expect(hslToHex(0, 100, 50)).toBe('#FF0000');
    expect(hslToHex(120, 100, 50)).toBe('#00FF00');
    expect(hslToHex(240, 100, 50)).toBe('#0000FF');
  });

  it('handles grayscale and hue wrapping', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
    expect(hslToHex(0, 0, 100)).toBe('#FFFFFF');
    expect(hslToHex(360, 100, 50)).toBe(hslToHex(0, 100, 50));
    expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50));
  });
});

describe('hexToRgb / getContrastText', () => {
  it('parses hex into rgb channels', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#0a141e')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('picks dark text on light colors and white text on dark colors', () => {
    expect(getContrastText('#FFFFFF')).toBe('#141414');
    expect(getContrastText('#FFD166')).toBe('#141414');
    expect(getContrastText('#000000')).toBe('#FFFFFF');
    expect(getContrastText('#1A237E')).toBe('#FFFFFF');
  });
});

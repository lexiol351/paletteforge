/**
 * Color utilities and harmonious palette generation.
 *
 * All randomness flows through an injectable `RandomFn` so generation is
 * deterministic and unit-testable (pass a seeded PRNG in tests).
 */

export const PALETTE_SIZE = 5;

export interface PaletteColor {
  hex: string;
  locked: boolean;
}

export type RandomFn = () => number;

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Returns true for `#RGB` / `#RRGGBB` strings (case-insensitive). */
export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** Expands `#RGB` to `#RRGGBB` and uppercases. Throws on invalid input. */
export function normalizeHex(value: string): string {
  const v = value.trim();
  if (!isValidHex(v)) {
    throw new Error(`Invalid hex color: ${value}`);
  }
  let h = v.slice(1);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${h.toUpperCase()}`;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex).slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

/** Converts HSL (h: 0-359, s/l: 0-100) to an uppercase `#RRGGBB` string. */
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;

  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number): string =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * Picks a readable text color (near-black or white) for overlaying on `hex`.
 * Uses the perceived-brightness formula, which is cheap and good enough for UI.
 */
export function getContrastText(hex: string): '#141414' | '#FFFFFF' {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brightness > 0.6 ? '#141414' : '#FFFFFF';
}

interface Harmony {
  name: string;
  /** Hue offsets (degrees) applied to the random base hue, one per slot. */
  offsets: number[];
  /** Base lightness per slot, giving each harmony its characteristic depth. */
  lightness: number[];
}

const HARMONIES: Harmony[] = [
  { name: 'Analogous', offsets: [-36, -18, 0, 18, 36], lightness: [58, 48, 66, 40, 74] },
  { name: 'Complementary', offsets: [0, 12, 180, 192, 0], lightness: [55, 38, 62, 45, 72] },
  { name: 'Triadic', offsets: [0, 120, 240, 8, 128], lightness: [56, 50, 60, 36, 70] },
  { name: 'Split-Complementary', offsets: [0, 150, 210, 24, 174], lightness: [58, 46, 64, 40, 72] },
  { name: 'Monochromatic', offsets: [0, 0, 0, 0, 0], lightness: [30, 44, 58, 70, 80] },
  { name: 'Pastel', offsets: [-24, -12, 0, 12, 24], lightness: [78, 72, 82, 68, 76] },
];

export interface GeneratedPalette {
  name: string;
  harmony: string;
  colors: string[];
}

const NAME_A = [
  'Velvet', 'Neon', 'Amber', 'Coral', 'Indigo', 'Jade', 'Ember', 'Frost',
  'Golden', 'Midnight', 'Crimson', 'Azure', 'Saffron', 'Moss', 'Opal', 'Rust',
];

const NAME_B = [
  'Dusk', 'Tide', 'Bloom', 'Drift', 'Glow', 'Haze', 'Meadow', 'Storm',
  'Sunrise', 'Lagoon', 'Ember', 'Cascade', 'Mirage', 'Harbor', 'Grove', 'Comet',
];

/** Generates a friendly two-word name like "Velvet Dusk". */
export function generatePaletteName(random: RandomFn = Math.random): string {
  const a = NAME_A[Math.floor(random() * NAME_A.length)];
  const b = NAME_B[Math.floor(random() * NAME_B.length)];
  return `${a} ${b}`;
}

/** Generates a harmonious 5-color palette using a random harmony rule. */
export function generatePalette(random: RandomFn = Math.random): GeneratedPalette {
  const harmony = HARMONIES[Math.floor(random() * HARMONIES.length)];
  const baseHue = Math.floor(random() * 360);
  const baseSat = 52 + Math.floor(random() * 32); // 52..83 — vivid but not garish

  const colors = harmony.offsets.map((offset, i) => {
    const hue = baseHue + offset;
    const sat = baseSat + (random() * 16 - 8);
    const light = harmony.lightness[i] + (random() * 6 - 3);
    return hslToHex(hue, sat, light);
  });

  return { name: generatePaletteName(random), harmony: harmony.name, colors };
}

/**
 * Merges freshly generated hexes into the current palette, preserving locked
 * colors (both their hex and lock flag). Slots without a previous entry —
 * or without a lock — take the fresh color, unlocked.
 */
export function applyLocks(current: PaletteColor[], freshHexes: string[]): PaletteColor[] {
  return freshHexes.map((hex, i) => {
    const prev = current[i];
    if (prev && prev.locked) {
      return { hex: prev.hex, locked: true };
    }
    return { hex, locked: false };
  });
}

/** Toggles the lock flag of the color at `index` (pure, returns a new array). */
export function toggleLock(colors: PaletteColor[], index: number): PaletteColor[] {
  return colors.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c));
}

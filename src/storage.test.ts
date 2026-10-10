import { describe, expect, it } from 'vitest';
import {
  createId,
  getTheme,
  loadFavorites,
  saveFavorites,
  setTheme,
  type SavedPalette,
  type StorageLike,
} from './storage';

/** In-memory StorageLike fake. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const sample: SavedPalette = {
  id: 'abc123',
  name: 'Velvet Dusk',
  colors: ['#111111', '#222222', '#333333', '#444444', '#555555'],
  createdAt: 1728500000000,
};

describe('favorites persistence', () => {
  it('round-trips saved palettes', () => {
    const storage = fakeStorage();
    saveFavorites(storage, [sample]);
    expect(loadFavorites(storage)).toEqual([sample]);
  });

  it('returns [] when nothing is stored', () => {
    expect(loadFavorites(fakeStorage())).toEqual([]);
  });

  it('returns [] for corrupt JSON', () => {
    expect(loadFavorites(fakeStorage({ 'paletteforge:favorites:v1': '{oops' }))).toEqual([]);
  });

  it('returns [] for non-array payloads', () => {
    expect(
      loadFavorites(fakeStorage({ 'paletteforge:favorites:v1': '{"a":1}' })),
    ).toEqual([]);
  });

  it('filters out malformed entries but keeps valid ones', () => {
    const storage = fakeStorage({
      'paletteforge:favorites:v1': JSON.stringify([sample, { bogus: true }, null]),
    });
    expect(loadFavorites(storage)).toEqual([sample]);
  });

  it('persists an empty list', () => {
    const storage = fakeStorage();
    saveFavorites(storage, []);
    expect(loadFavorites(storage)).toEqual([]);
  });
});

describe('theme persistence', () => {
  it('defaults to dark when nothing is stored', () => {
    expect(getTheme(fakeStorage())).toBe('dark');
  });

  it('defaults to dark for unexpected values', () => {
    expect(getTheme(fakeStorage({ 'paletteforge:theme:v1': 'neon' }))).toBe('dark');
  });

  it('round-trips the light theme', () => {
    const storage = fakeStorage();
    setTheme(storage, 'light');
    expect(getTheme(storage)).toBe('light');
    setTheme(storage, 'dark');
    expect(getTheme(storage)).toBe('dark');
  });
});

describe('createId', () => {
  it('generates non-empty unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

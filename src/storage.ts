/**
 * Persistence layer (localStorage) for saved palettes and the UI theme.
 *
 * Accepts a minimal `StorageLike` interface instead of touching
 * `window.localStorage` directly, so the logic is unit-testable with an
 * in-memory fake.
 */

export interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
  createdAt: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Theme = 'light' | 'dark';

const FAVORITES_KEY = 'paletteforge:favorites:v1';
const THEME_KEY = 'paletteforge:theme:v1';

function isSavedPalette(value: unknown): value is SavedPalette {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    Array.isArray(o.colors) &&
    o.colors.length === 5 &&
    (o.colors as unknown[]).every((c) => typeof c === 'string') &&
    typeof o.createdAt === 'number'
  );
}

/** Loads saved palettes; returns [] for missing or corrupt data. */
export function loadFavorites(storage: StorageLike): SavedPalette[] {
  try {
    const raw = storage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPalette);
  } catch {
    return [];
  }
}

export function saveFavorites(storage: StorageLike, favorites: SavedPalette[]): void {
  storage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/** Returns the stored theme, defaulting to dark. */
export function getTheme(storage: StorageLike): Theme {
  return storage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function setTheme(storage: StorageLike, theme: Theme): void {
  storage.setItem(THEME_KEY, theme);
}

/** Generates a short unique id for a saved palette. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

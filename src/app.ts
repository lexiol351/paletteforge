import {
  PALETTE_SIZE,
  applyLocks,
  generatePalette,
  getContrastText,
  toggleLock,
  type PaletteColor,
} from './palette';
import {
  createId,
  getTheme,
  loadFavorites,
  saveFavorites,
  setTheme,
  type SavedPalette,
  type StorageLike,
  type Theme,
} from './storage';
import { buildCssVariables } from './cssExport';

const LOCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const UNLOCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.8-1.3"/></svg>';
const SUN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const MAX_FAVORITES = 30;

interface AppState {
  colors: PaletteColor[];
  name: string;
  harmony: string;
  theme: Theme;
  favorites: SavedPalette[];
}

/** Copies text to the clipboard, with a fallback for non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function createApp(root: HTMLElement): void {
  const storage: StorageLike = window.localStorage;

  const state: AppState = {
    colors: [],
    name: '',
    harmony: '',
    theme: getTheme(storage),
    favorites: loadFavorites(storage),
  };

  root.innerHTML = `
    <div class="ambient" id="ambient"></div>
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <i style="--d:#FF6B6B"></i><i style="--d:#FFD166"></i><i style="--d:#4ECDC4"></i><i style="--d:#6C5CE7"></i>
        </span>
        <div class="brand-text">
          <h1>PaletteForge</h1>
          <p>Harmonious palettes, forged in one click</p>
        </div>
      </div>
      <nav class="actions" aria-label="Palette actions">
        <button id="themeBtn" class="icon-btn" type="button" title="Toggle light / dark theme" aria-label="Toggle theme"></button>
        <button id="exportBtn" class="btn ghost" type="button" title="Copy palette as CSS custom properties">Export CSS</button>
        <button id="saveBtn" class="btn ghost" type="button" title="Save this palette to your favorites">Save</button>
        <button id="generateBtn" class="btn primary" type="button" title="Generate a new palette (Space)">Generate</button>
      </nav>
    </header>

    <main class="content">
      <section class="palette-head">
        <div>
          <h2 id="paletteName"></h2>
          <p id="paletteMeta" class="muted"></p>
        </div>
        <p class="hint"><kbd>Space</kbd> to generate &middot; click a color to copy its HEX</p>
      </section>

      <section id="strip" class="strip" aria-label="Generated color palette"></section>

      <section class="favorites" aria-label="Saved palettes">
        <div class="fav-head">
          <h3>Saved palettes</h3>
          <button id="clearFavBtn" class="link-btn" type="button">Clear all</button>
        </div>
        <div id="favList" class="fav-list"></div>
      </section>

      <footer class="footer">
        <p>Palettes and theme are stored locally in your browser &middot; no account, no tracking.</p>
      </footer>
    </main>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;

  const strip = root.querySelector<HTMLElement>('#strip')!;
  const nameEl = root.querySelector<HTMLElement>('#paletteName')!;
  const metaEl = root.querySelector<HTMLElement>('#paletteMeta')!;
  const favList = root.querySelector<HTMLElement>('#favList')!;
  const toastEl = root.querySelector<HTMLElement>('#toast')!;
  const themeBtn = root.querySelector<HTMLButtonElement>('#themeBtn')!;
  const ambient = root.querySelector<HTMLElement>('#ambient')!;
  const clearFavBtn = root.querySelector<HTMLButtonElement>('#clearFavBtn')!;

  let toastTimer = 0;
  function toast(message: string): void {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function applyTheme(): void {
    document.documentElement.dataset.theme = state.theme;
    themeBtn.innerHTML = state.theme === 'dark' ? SUN_SVG : MOON_SVG;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#0e1013' : '#f6f7f9');
  }

  function renderAmbient(): void {
    if (state.colors.length !== PALETTE_SIZE) return;
    const [a, , , , b] = state.colors.map((c) => c.hex);
    ambient.style.background =
      `radial-gradient(42rem 30rem at 8% -4%, ${a}2e, transparent 60%),` +
      `radial-gradient(46rem 32rem at 96% 4%, ${b}26, transparent 60%)`;
  }

  function renderPalette(animate: boolean): void {
    nameEl.textContent = state.name;
    metaEl.textContent = `${state.harmony} harmony · ${PALETTE_SIZE} colors`;

    strip.innerHTML = state.colors
      .map(
        (c, i) => `
        <div class="card${c.locked ? ' is-locked' : ''}${animate ? ' pop' : ''}"
             data-index="${i}"
             style="--card:${c.hex}; --on-card:${getContrastText(c.hex)}; --i:${i}"
             role="button" tabindex="0"
             title="Click to copy ${c.hex}"
             aria-label="Color ${c.hex}${c.locked ? ', locked' : ''}. Activate to copy.">
          <button class="lock-btn" type="button" data-lock="${i}"
                  title="${c.locked ? 'Unlock this color' : 'Lock this color'}"
                  aria-label="${c.locked ? 'Unlock' : 'Lock'} color ${c.hex}"
                  aria-pressed="${c.locked}">${c.locked ? LOCK_SVG : UNLOCK_SVG}</button>
          <div class="card-info">
            <span class="hex">${c.hex}</span>
            <span class="copy-hint">${CHECK_SVG}<em>copied</em></span>
          </div>
        </div>`,
      )
      .join('');

    renderAmbient();
  }

  function renderFavorites(): void {
    clearFavBtn.style.visibility = state.favorites.length ? 'visible' : 'hidden';

    if (!state.favorites.length) {
      favList.innerHTML = `<p class="fav-empty">Nothing saved yet — forge a palette you love and hit <strong>Save</strong>.</p>`;
      return;
    }

    favList.innerHTML = state.favorites
      .map(
        (f) => `
        <article class="fav-card" data-id="${f.id}">
          <div class="fav-swatches" aria-hidden="true">
            ${f.colors.map((hex) => `<span style="background:${hex}" title="${hex}"></span>`).join('')}
          </div>
          <div class="fav-meta">
            <strong>${escapeHtml(f.name)}</strong>
            <span>${new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          <div class="fav-actions">
            <button class="btn small" type="button" data-load="${f.id}">Load</button>
            <button class="btn small danger-ghost" type="button" data-del="${f.id}">Delete</button>
          </div>
        </article>`,
      )
      .join('');
  }

  function generate(): void {
    const fresh = generatePalette();
    state.colors = applyLocks(state.colors, fresh.colors);
    state.name = fresh.name;
    state.harmony = fresh.harmony;
    renderPalette(true);
  }

  async function copyColor(index: number, card: HTMLElement): Promise<void> {
    const color = state.colors[index];
    if (!color) return;
    const ok = await copyText(color.hex);
    if (ok) {
      card.classList.add('just-copied');
      window.setTimeout(() => card.classList.remove('just-copied'), 900);
      toast(`Copied ${color.hex} to clipboard`);
    } else {
      toast('Copy failed — your browser blocked clipboard access');
    }
  }

  function toggleTheme(): void {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    setTheme(storage, state.theme);
    applyTheme();
  }

  async function exportCss(): Promise<void> {
    const css = buildCssVariables(state.colors.map((c) => c.hex));
    const ok = await copyText(css);
    toast(ok ? 'CSS variables copied to clipboard' : 'Copy failed — your browser blocked clipboard access');
  }

  function saveCurrent(): void {
    const fav: SavedPalette = {
      id: createId(),
      name: state.name || 'Untitled palette',
      colors: state.colors.map((c) => c.hex),
      createdAt: Date.now(),
    };
    state.favorites.unshift(fav);
    if (state.favorites.length > MAX_FAVORITES) state.favorites.length = MAX_FAVORITES;
    saveFavorites(storage, state.favorites);
    renderFavorites();
    toast(`Saved “${fav.name}”`);
  }

  function loadFavorite(id: string): void {
    const fav = state.favorites.find((f) => f.id === id);
    if (!fav) return;
    state.colors = fav.colors.map((hex) => ({ hex, locked: false }));
    state.name = fav.name;
    state.harmony = 'Saved';
    renderPalette(true);
    toast(`Loaded “${fav.name}”`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteFavorite(id: string): void {
    state.favorites = state.favorites.filter((f) => f.id !== id);
    saveFavorites(storage, state.favorites);
    renderFavorites();
    toast('Palette deleted');
  }

  // --- events -------------------------------------------------------------

  root.querySelector('#generateBtn')!.addEventListener('click', generate);
  root.querySelector('#exportBtn')!.addEventListener('click', () => void exportCss());
  root.querySelector('#saveBtn')!.addEventListener('click', saveCurrent);
  themeBtn.addEventListener('click', toggleTheme);
  clearFavBtn.addEventListener('click', () => {
    state.favorites = [];
    saveFavorites(storage, state.favorites);
    renderFavorites();
    toast('All saved palettes cleared');
  });

  strip.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const lockBtn = target.closest<HTMLButtonElement>('[data-lock]');
    if (lockBtn) {
      e.stopPropagation();
      const index = Number(lockBtn.dataset.lock);
      state.colors = toggleLock(state.colors, index);
      renderPalette(false);
      return;
    }
    const card = target.closest<HTMLElement>('.card');
    if (card && card.dataset.index !== undefined) {
      void copyColor(Number(card.dataset.index), card);
    }
  });

  strip.addEventListener('keydown', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.card');
    if (card && (e.key === 'Enter' || e.key === ' ') && card.dataset.index !== undefined) {
      e.preventDefault();
      void copyColor(Number(card.dataset.index), card);
    }
  });

  favList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const loadBtn = target.closest<HTMLButtonElement>('[data-load]');
    const delBtn = target.closest<HTMLButtonElement>('[data-del]');
    if (loadBtn) loadFavorite(loadBtn.dataset.load!);
    else if (delBtn) deleteFavorite(delBtn.dataset.del!);
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
    if (e.code === 'Space' && !typing) {
      e.preventDefault();
      generate();
    }
  });

  // --- init ---------------------------------------------------------------
  applyTheme();
  generate();
  renderFavorites();
}

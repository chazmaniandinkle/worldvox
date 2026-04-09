import { UITheme, BUILTIN_THEMES, THEME_EARTHEN } from './themes';

const STORAGE_KEY = 'worldvox-theme';
const CUSTOM_THEMES_KEY = 'worldvox-custom-themes';

/**
 * ThemeManager owns the mapping from UITheme tokens → CSS custom properties.
 *
 * Usage:
 *   const tm = new ThemeManager();
 *   tm.apply('earthen');            // switch to a built-in theme
 *   tm.register(myTheme);          // add a custom theme at runtime
 *   tm.apply(myTheme.id);
 *   const all = tm.listThemes();   // [{ id, name, description, builtin }]
 */
export class ThemeManager {
  private themes = new Map<string, UITheme>();
  private activeId: string;
  private styleEl: HTMLStyleElement;

  /** Fired after every theme change. Listeners receive the new theme. */
  onChange: ((theme: UITheme) => void) | null = null;

  constructor() {
    // Register built-ins
    for (const t of BUILTIN_THEMES) {
      this.themes.set(t.id, t);
    }

    // Load any saved custom themes from localStorage
    this.loadCustomThemes();

    // Determine initial theme
    const saved = localStorage.getItem(STORAGE_KEY);
    this.activeId = saved && this.themes.has(saved) ? saved : THEME_EARTHEN.id;

    // Create a <style> element for CSS variable injection
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'worldvox-theme-vars';
    document.head.appendChild(this.styleEl);

    this.apply(this.activeId);
  }

  /** Get the current active theme */
  get current(): UITheme {
    return this.themes.get(this.activeId)!;
  }

  /** Apply a theme by id. Persists choice to localStorage. */
  apply(id: string): void {
    const theme = this.themes.get(id);
    if (!theme) {
      console.warn(`[ThemeManager] Unknown theme: "${id}"`);
      return;
    }

    this.activeId = id;
    localStorage.setItem(STORAGE_KEY, id);
    this.injectCSS(theme);
    this.onChange?.(theme);
  }

  /** Register a custom theme. Overwrites if id already exists. */
  register(theme: UITheme): void {
    this.themes.set(theme.id, theme);
    this.saveCustomThemes();
  }

  /** Remove a custom theme by id. Cannot remove built-ins. */
  unregister(id: string): boolean {
    if (BUILTIN_THEMES.some((t) => t.id === id)) return false;
    const removed = this.themes.delete(id);
    if (removed) {
      this.saveCustomThemes();
      if (this.activeId === id) this.apply(THEME_EARTHEN.id);
    }
    return removed;
  }

  /** List all available themes with metadata. */
  listThemes(): { id: string; name: string; description: string; builtin: boolean }[] {
    const result: { id: string; name: string; description: string; builtin: boolean }[] = [];
    for (const [, t] of this.themes) {
      result.push({
        id: t.id,
        name: t.name,
        description: t.description,
        builtin: BUILTIN_THEMES.some((b) => b.id === t.id),
      });
    }
    return result;
  }

  /** Export the current theme as a JSON string (for sharing). */
  exportTheme(id?: string): string {
    const theme = this.themes.get(id ?? this.activeId);
    if (!theme) return '{}';
    return JSON.stringify(theme, null, 2);
  }

  /** Import a theme from a JSON string. Returns the theme id or null on failure. */
  importTheme(json: string): string | null {
    try {
      const theme = JSON.parse(json) as UITheme;
      if (!theme.id || !theme.name) return null;
      // Prevent overwriting built-ins
      if (BUILTIN_THEMES.some((b) => b.id === theme.id)) {
        theme.id = `custom_${theme.id}_${Date.now()}`;
      }
      this.register(theme);
      return theme.id;
    } catch {
      return null;
    }
  }

  // ─── Private ───

  private injectCSS(t: UITheme): void {
    this.styleEl.textContent = `
:root {
  /* Surfaces */
  --wv-panel-bg: ${t.panelBg};
  --wv-panel-border: ${t.panelBorder};
  --wv-panel-shadow: ${t.panelShadow};
  --wv-panel-radius: ${t.panelRadius}px;
  --wv-panel-backdrop: ${t.panelBackdrop};
  --wv-panel-inset: ${t.panelInset};
  --wv-panel-bg-pattern: ${t.panelBgPattern};

  /* Typography */
  --wv-font: ${t.fontFamily};
  --wv-text: ${t.textPrimary};
  --wv-text-secondary: ${t.textSecondary};
  --wv-text-dim: ${t.textDim};
  --wv-text-heading: ${t.textHeading};
  --wv-label-spacing: ${t.labelSpacing}px;

  /* Buttons */
  --wv-btn-bg: ${t.btnBg};
  --wv-btn-border: ${t.btnBorder};
  --wv-btn-text: ${t.btnText};
  --wv-btn-hover-bg: ${t.btnHoverBg};
  --wv-btn-active-bg: ${t.btnActiveBg};
  --wv-btn-active-border: ${t.btnActiveBorder};
  --wv-btn-active-text: ${t.btnActiveText};
  --wv-btn-radius: ${t.btnRadius}px;

  /* Swatches */
  --wv-swatch-border: ${t.swatchBorder};
  --wv-swatch-active-border: ${t.swatchActiveBorder};
  --wv-swatch-active-glow: ${t.swatchActiveGlow};
  --wv-swatch-radius: ${t.swatchRadius}px;

  /* Inputs */
  --wv-input-bg: ${t.inputBg};
  --wv-input-border: ${t.inputBorder};
  --wv-accent: ${t.accentColor};

  /* Primary action */
  --wv-primary-bg: ${t.primaryBtnBg};
  --wv-primary-border: ${t.primaryBtnBorder};
  --wv-primary-hover-bg: ${t.primaryBtnHoverBg};

  /* Misc */
  --wv-divider: ${t.dividerColor};
  --wv-bar-track: ${t.barTrackBg};
  --wv-scrollbar: ${t.scrollbarThumb};

  /* Picker */
  --wv-picker-overlay: ${t.pickerOverlayBg};
  --wv-picker-card-bg: ${t.pickerCardBg};
  --wv-picker-card-border: ${t.pickerCardBorder};
  --wv-picker-card-hover-bg: ${t.pickerCardHoverBg};
  --wv-picker-card-hover-border: ${t.pickerCardHoverBorder};
}`;
  }

  private loadCustomThemes(): void {
    try {
      const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as UITheme[];
      for (const t of arr) {
        if (t.id && t.name) this.themes.set(t.id, t);
      }
    } catch {
      // ignore corrupt data
    }
  }

  private saveCustomThemes(): void {
    const custom: UITheme[] = [];
    for (const [, t] of this.themes) {
      if (!BUILTIN_THEMES.some((b) => b.id === t.id)) {
        custom.push(t);
      }
    }
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(custom));
  }
}

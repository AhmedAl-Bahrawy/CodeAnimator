import { create } from 'zustand';
import type { CodeTheme } from '@/types/domain';
import { codeThemes } from '@/data/codeThemes';
import {
  saveCustomTheme as persistCustomTheme,
  loadCustomThemes as persistLoadCustomThemes,
  deleteCustomTheme as persistDeleteCustomTheme,
} from '@/persistence/themeRepo';

interface ThemeStore {
  themes: CodeTheme[];

  // Actions
  addCustomTheme: (theme: CodeTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (id: string, updates: Partial<CodeTheme>) => void;

  // Getters
  getThemesByCategory: (category: CodeTheme['category']) => CodeTheme[];
  getThemeById: (id: string) => CodeTheme | undefined;

  // Persistence
  loadCustomThemes: () => Promise<void>;
  saveUpdatedCustomTheme: (theme: CodeTheme) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themes: codeThemes,

  addCustomTheme: (theme) => {
    set(state => ({
      themes: [...state.themes, theme],
    }));
    // Persist custom themes to IndexedDB so they survive page reloads (BLK-08).
    void persistCustomTheme(theme);
  },

  removeCustomTheme: (id) => {
    set(state => ({
      themes: state.themes.filter(t => t.id !== id),
    }));
    void persistDeleteCustomTheme(id);
  },

  /** Hydrate custom themes from IndexedDB — call once on app mount. */
  loadCustomThemes: async () => {
    try {
      const custom = await persistLoadCustomThemes();
      set({
        themes: [
          ...codeThemes,
          ...custom.filter(c => !codeThemes.some(builtin => builtin.id === c.id)),
        ],
      });
    } catch {
      // Persistence unavailable — keep built-in themes only
    }
  },

  updateCustomTheme: (id, updates) => set(state => ({
    themes: state.themes.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ),
  })),

  /** Persist an updated custom theme to IndexedDB. */
  saveUpdatedCustomTheme: async (theme: CodeTheme) => {
    void persistCustomTheme(theme);
  },

  getThemesByCategory: (category) => {
    return get().themes.filter(t => t.category === category);
  },

  /** Find a theme by id (built-in + hydrated custom themes). */
  getThemeById: (id: string) => {
    return get().themes.find(t => t.id === id);
  },
}));

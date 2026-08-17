import { create } from 'zustand';
import type { CodeTheme } from '@/core/types';
import { codeThemes, getThemeById } from '@/data/codeThemes';

interface ThemeStore {
  themes: CodeTheme[];
  currentThemeId: string;

  // Actions
  setTheme: (id: string) => void;
  addCustomTheme: (theme: CodeTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (id: string, updates: Partial<CodeTheme>) => void;

  // Getters
  getCurrentTheme: () => CodeTheme;
  getThemesByCategory: (category: CodeTheme['category']) => CodeTheme[];
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themes: codeThemes,
  currentThemeId: 'dracula',

  setTheme: (id) => set({ currentThemeId: id }),

  addCustomTheme: (theme) => set(state => ({
    themes: [...state.themes, theme],
  })),

  removeCustomTheme: (id) => set(state => ({
    themes: state.themes.filter(t => t.id !== id),
  })),

  updateCustomTheme: (id, updates) => set(state => ({
    themes: state.themes.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ),
  })),

  getCurrentTheme: () => {
    const { themes, currentThemeId } = get();
    return getThemeById(currentThemeId) || themes[0];
  },

  getThemesByCategory: (category) => {
    return get().themes.filter(t => t.category === category);
  },
}));

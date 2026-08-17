import { create } from 'zustand';
import type { UISkin, BrandKit } from '@/core/types';
import { uiSkins, getUISkinById } from '@/data/uiSkins';
import { generateId } from '@/lib/utils';

interface UISkinStore {
  skins: UISkin[];
  currentSkinId: string;
  brandKits: BrandKit[];
  currentBrandKitId: string | null;

  setSkin: (id: string) => void;
  addCustomSkin: (skin: UISkin) => void;
  removeCustomSkin: (id: string) => void;

  createBrandKit: (name: string) => BrandKit;
  setBrandKit: (id: string) => void;
  updateBrandKit: (id: string, updates: Partial<BrandKit>) => void;
  deleteBrandKit: (id: string) => void;
  applyBrandKit: (id: string) => void;

  getCurrentSkin: () => UISkin;
}

export const useUISkinStore = create<UISkinStore>((set, get) => ({
  skins: uiSkins,
  currentSkinId: 'midnight',
  brandKits: [],
  currentBrandKitId: null,

  setSkin: (id) => {
    set({ currentSkinId: id });
    const skin = getUISkinById(id);
    applySkinToDocument(skin);
  },

  addCustomSkin: (skin) => set(state => ({
    skins: [...state.skins, skin],
  })),

  removeCustomSkin: (id) => set(state => ({
    skins: state.skins.filter(s => s.id !== id),
  })),

  createBrandKit: (name) => {
    const { currentSkinId } = get();
    const brandKit: BrandKit = {
      id: generateId(),
      name,
      uiSkinId: currentSkinId,
      codeThemeId: 'dracula',
      backgroundPresetId: 'mesh-gradient-1',
      defaultAspectRatio: '9:16',
    };
    set(state => ({
      brandKits: [...state.brandKits, brandKit],
      currentBrandKitId: brandKit.id,
    }));
    return brandKit;
  },

  setBrandKit: (id) => set({ currentBrandKitId: id }),

  updateBrandKit: (id, updates) => set(state => ({
    brandKits: state.brandKits.map(bk =>
      bk.id === id ? { ...bk, ...updates } : bk
    ),
  })),

  deleteBrandKit: (id) => set(state => ({
    brandKits: state.brandKits.filter(bk => bk.id !== id),
    currentBrandKitId: state.currentBrandKitId === id ? null : state.currentBrandKitId,
  })),

  applyBrandKit: (id) => {
    const { brandKits } = get();
    const kit = brandKits.find(bk => bk.id === id);
    if (!kit) return;

    get().setSkin(kit.uiSkinId);
    set({ currentBrandKitId: id });
  },

  getCurrentSkin: () => {
    const { skins, currentSkinId } = get();
    return getUISkinById(currentSkinId);
  },
}));

export function applySkinToDocument(skin: UISkin): void {
  const root = document.documentElement;
  const t = skin.tokens;

  root.style.setProperty('--bg-base', t.bgBase);
  root.style.setProperty('--bg-elevated', t.bgElevated);
  root.style.setProperty('--bg-panel', t.bgPanel);
  root.style.setProperty('--bg-surface', adjustColor(t.bgElevated, 10));
  root.style.setProperty('--text-primary', t.textPrimary);
  root.style.setProperty('--text-secondary', t.textSecondary);
  root.style.setProperty('--text-muted', t.textMuted);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-foreground', t.accentForeground);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--border-strong', t.borderStrong);
  root.style.setProperty('--danger', t.danger);
  root.style.setProperty('--success', t.success);
  root.style.setProperty('--warning', t.warning);
  root.style.setProperty('--radius-sm', t.radiusSm);
  root.style.setProperty('--radius-md', t.radiusMd);
  root.style.setProperty('--radius-lg', t.radiusLg);
  root.style.setProperty('--font-ui', t.fontUI);
  root.style.setProperty('--font-mono', t.fontMono);
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

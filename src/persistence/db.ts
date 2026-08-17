import Dexie, { type EntityTable } from 'dexie';
import type { Project, CodeTheme, UISkin, BrandKit } from '@/core/types';

interface SavedProject {
  id: string;
  data: Project;
  updatedAt: number;
}

interface SavedTheme {
  id: string;
  data: CodeTheme;
}

interface SavedSkin {
  id: string;
  data: UISkin;
}

interface SavedBrandKit {
  id: string;
  data: BrandKit;
}

const db = new Dexie('CodeReelDB') as Dexie & {
  projects: EntityTable<SavedProject, 'id'>;
  themes: EntityTable<SavedTheme, 'id'>;
  skins: EntityTable<SavedSkin, 'id'>;
  brandKits: EntityTable<SavedBrandKit, 'id'>;
};

db.version(1).stores({
  projects: 'id, updatedAt',
  themes: 'id',
  skins: 'id',
  brandKits: 'id',
});

export default db;

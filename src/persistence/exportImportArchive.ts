import db from './db';
import type { Project, CodeTheme, UISkin, BrandKit } from '@/types/domain';

export interface ArchiveData {
  version: 1;
  exportedAt: number;
  projects: Project[];
  customThemes: CodeTheme[];
  customSkins: UISkin[];
  brandKits: BrandKit[];
}

export async function exportAllData(): Promise<Blob> {
  const [projects, themes, skins, brandKits] = await Promise.all([
    db.projects.toArray(),
    db.themes.toArray(),
    db.skins.toArray(),
    db.brandKits.toArray(),
  ]);

  const archive: ArchiveData = {
    version: 1,
    exportedAt: Date.now(),
    projects: projects.map(p => p.data),
    customThemes: themes.map(t => t.data),
    customSkins: skins.map(s => s.data),
    brandKits: brandKits.map(b => b.data),
  };

  return new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
}

export async function importAllData(file: File): Promise<{
  projects: number;
  themes: number;
  skins: number;
  brandKits: number;
}> {
  const text = await file.text();
  const archive: ArchiveData = JSON.parse(text);

  if (archive.version !== 1) {
    throw new Error('Unsupported archive version');
  }

  let projects = 0;
  let themes = 0;
  let skins = 0;
  let brandKitsCount = 0;

  if (archive.projects) {
    await db.projects.bulkPut(
      archive.projects.map(p => ({
        id: p.id,
        data: p,
        updatedAt: p.updatedAt,
      }))
    );
    projects = archive.projects.length;
  }

  if (archive.customThemes) {
    await db.themes.bulkPut(
      archive.customThemes.map(t => ({
        id: t.id,
        data: t,
      }))
    );
    themes = archive.customThemes.length;
  }

  if (archive.customSkins) {
    await db.skins.bulkPut(
      archive.customSkins.map(s => ({
        id: s.id,
        data: s,
      }))
    );
    skins = archive.customSkins.length;
  }

  if (archive.brandKits) {
    await db.brandKits.bulkPut(
      archive.brandKits.map(b => ({
        id: b.id,
        data: b,
      }))
    );
    brandKitsCount = archive.brandKits.length;
  }

  return { projects, themes, skins, brandKits: brandKitsCount };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

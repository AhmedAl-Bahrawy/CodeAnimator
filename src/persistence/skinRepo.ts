import db from './db';
import type { UISkin } from '@/core/types';

export async function saveCustomSkin(skin: UISkin): Promise<void> {
  await db.skins.put({
    id: skin.id,
    data: skin,
  });
}

export async function loadCustomSkins(): Promise<UISkin[]> {
  const saved = await db.skins.toArray();
  return saved.map(s => s.data);
}

export async function deleteCustomSkin(id: string): Promise<void> {
  await db.skins.delete(id);
}

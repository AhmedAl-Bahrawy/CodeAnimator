import db from './db';
import type { CodeTheme } from '@/core/types';

export async function saveCustomTheme(theme: CodeTheme): Promise<void> {
  await db.themes.put({
    id: theme.id,
    data: theme,
  });
}

export async function loadCustomThemes(): Promise<CodeTheme[]> {
  const saved = await db.themes.toArray();
  return saved.map(s => s.data);
}

export async function deleteCustomTheme(id: string): Promise<void> {
  await db.themes.delete(id);
}

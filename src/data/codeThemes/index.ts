import type { CodeTheme } from '@/types/domain';
import { codeThemes } from './themes';

export { codeThemes };

export function getThemeById(id: string): CodeTheme | undefined {
  return codeThemes.find((t) => t.id === id);
}

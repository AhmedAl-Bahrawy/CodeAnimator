import { backgroundPresets } from './presets';

export { backgroundPresets };

export function getBackgroundById(id: string) {
  return backgroundPresets.find(p => p.id === id) || backgroundPresets[0];
}

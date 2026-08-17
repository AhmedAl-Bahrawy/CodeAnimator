import { snippetPresets } from './presets';

export { snippetPresets };

export function getSnippetsByCategory(category: string) {
  return snippetPresets.filter(s => s.category === category);
}

export function searchSnippets(query: string) {
  const q = query.toLowerCase();
  return snippetPresets.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description?.toLowerCase().includes(q) ||
    s.tags?.some(t => t.toLowerCase().includes(q))
  );
}

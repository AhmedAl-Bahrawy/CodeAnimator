import { useState } from 'react';
import { snippetPresets, searchSnippets } from '@/data/snippetPresets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface PresetLibraryDrawerProps {
  onSelect: (code: string, language: string) => void;
  open: boolean;
  onClose: () => void;
}

export function PresetLibraryDrawer({ onSelect, open, onClose }: PresetLibraryDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(snippetPresets.map(s => s.category))];

  const filtered = search
    ? searchSnippets(search)
    : selectedCategory
      ? snippetPresets.filter(s => s.category === selectedCategory)
      : snippetPresets;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-panel)] rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Snippet Library
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              Close
            </Button>
          </div>
          
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 py-2 border-b border-[var(--border)] overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              !selectedCategory
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Snippets list */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filtered.map(snippet => (
              <button
                key={snippet.id}
                onClick={() => {
                  onSelect(snippet.code, snippet.language);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {snippet.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
                    {snippet.language}
                  </span>
                </div>
                {snippet.description && (
                  <p className="text-xs text-[var(--text-muted)]">{snippet.description}</p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

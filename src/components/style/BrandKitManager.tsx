import { useState } from 'react';
import { useUISkinStore } from '@/stores/uiSkinStore';
import { Button } from '@/components/ui/button';

export function BrandKitManager() {
  const { brandKits, currentBrandKitId, createBrandKit, deleteBrandKit, applyBrandKit } = useUISkinStore();
  const [newKitName, setNewKitName] = useState('');

  const handleCreate = () => {
    if (!newKitName.trim()) return;
    createBrandKit(newKitName.trim());
    setNewKitName('');
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Brand Kits
      </h4>

      <div className="flex gap-2">
        <input
          type="text"
          value={newKitName}
          onChange={(e) => setNewKitName(e.target.value)}
          placeholder="Brand name..."
          className="flex-1 h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} className="h-8 text-xs">
          Create
        </Button>
      </div>

      <div className="space-y-2">
        {brandKits.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">
            No brand kits yet. Create one to save your visual identity.
          </p>
        ) : (
          brandKits.map((kit) => (
            <div
              key={kit.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                currentBrandKitId === kit.id
                  ? 'border-[var(--accent)] bg-[var(--bg-surface)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
              onClick={() => applyBrandKit(kit.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)] font-medium">
                  {kit.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBrandKit(kit.id);
                  }}
                  className="h-6 text-xs text-[var(--danger)]"
                >
                  Delete
                </Button>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-muted)]">
                  {kit.defaultAspectRatio}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

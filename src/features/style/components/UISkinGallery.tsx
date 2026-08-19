import { useUISkinStore } from '@/state/uiSkinStore';
import { cn } from '@/lib/utils';

export function UISkinGallery() {
  const { skins, currentSkinId, setSkin } = useUISkinStore();

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        UI Skin
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {skins.map((skin) => (
          <button
            key={skin.id}
            onClick={() => setSkin(skin.id)}
            className={cn(
              'relative rounded-lg p-2 text-left transition-all cursor-pointer border-2',
              currentSkinId === skin.id
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                : 'border-transparent hover:border-[var(--border)]'
            )}
          >
            <div
              className="w-full h-12 rounded-md mb-1.5 overflow-hidden flex"
              style={{ backgroundColor: skin.tokens.bgBase }}
            >
              <div className="w-1/3 h-full" style={{ backgroundColor: skin.tokens.bgElevated }} />
              <div className="w-1/3 h-full flex flex-col justify-center px-1">
                <div className="h-1 rounded-sm mb-0.5" style={{ backgroundColor: skin.tokens.accent, width: '70%' }} />
                <div className="h-1 rounded-sm" style={{ backgroundColor: skin.tokens.textSecondary, width: '50%' }} />
              </div>
              <div className="w-1/3 h-full flex items-end justify-end p-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: skin.tokens.accent }} />
              </div>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] leading-tight block">
              {skin.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

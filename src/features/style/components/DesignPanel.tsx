import { AspectRatioSelector } from '@/features/export';
import { BackgroundPicker } from './BackgroundPicker';
import { BrandKitManager } from './BrandKitManager';
import { CodeThemeGallery } from './CodeThemeGallery';
import { TypographyControls } from './TypographyControls';
import { UISkinGallery } from './UISkinGallery';
import { WindowChromeControls } from './WindowChromeControls';
import type { Project, Scene, TypographySettings, WindowChromeConfig } from '@/types/domain';

interface DesignPanelProps {
  scene: Scene;
  aspectRatio: Project['aspectRatio'];
  onBackgroundChange: (backgroundPresetId: string) => void;
  onWindowChromeChange: (updates: Partial<WindowChromeConfig>) => void;
  onTypographyChange: (updates: Partial<TypographySettings>) => void;
  onAspectRatioChange: (aspectRatio: Project['aspectRatio']) => void;
}

export function DesignPanel({
  scene,
  aspectRatio,
  onBackgroundChange,
  onWindowChromeChange,
  onTypographyChange,
  onAspectRatioChange,
}: DesignPanelProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Canvas</h3>
          <p className="text-[10px] text-[var(--text-muted)]">Set the output shape and the visual surface behind the code.</p>
        </div>
        <AspectRatioSelector value={aspectRatio} onChange={onAspectRatioChange} />
        <BackgroundPicker currentBackgroundId={scene.backgroundPresetId} onChange={onBackgroundChange} />
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Code window</h3>
          <p className="text-[10px] text-[var(--text-muted)]">Control the window chrome, title bar, and code typography.</p>
        </div>
        <WindowChromeControls config={scene.windowChrome} onChange={onWindowChromeChange} />
        <TypographyControls settings={scene.typography} onChange={onTypographyChange} />
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Theme & identity</h3>
          <p className="text-[10px] text-[var(--text-muted)]">Choose syntax colors, application skin, and brand styling.</p>
        </div>
        <CodeThemeGallery />
        <UISkinGallery />
        <BrandKitManager />
      </section>
    </div>
  );
}

export default DesignPanel;

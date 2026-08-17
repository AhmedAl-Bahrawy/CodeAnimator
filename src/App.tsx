import { useEffect, useCallback, useState } from 'react';
import { AppShell } from './app/AppShell';
import { CodeInput } from './components/editor/CodeInput';
import { LanguagePicker } from './components/editor/LanguagePicker';
import { CanvasPreview } from './components/preview/CanvasPreview';
import { CodeThemeGallery } from './components/style/CodeThemeGallery';
import { BackgroundPicker } from './components/style/BackgroundPicker';
import { WindowChromeControls } from './components/style/WindowChromeControls';
import { TypingBehaviorControls } from './components/style/TypingBehaviorControls';
import { TypographyControls } from './components/style/TypographyControls';
import { ExportPanel } from './components/export/ExportPanel';
import { AspectRatioSelector } from './components/export/AspectRatioSelector';
import { useProjectStore, useTimelineStore } from './stores';
import { buildTimelineFromSource } from './core/timeline';
import { parseMarkup } from './core/markup/parser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { UISkinGallery } from './components/style/UISkinGallery';
import { BrandKitManager } from './components/style/BrandKitManager';
import { PresetLibraryDrawer } from './components/editor/PresetLibraryDrawer';
import { MarkupLintPanel } from './components/editor/MarkupLintPanel';
import { ProjectManager } from './components/projects/ProjectManager';
import { startAutosaveSubscription } from './persistence/autosave';

function App() {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const createProject = useProjectStore(s => s.createProject);
  const updateScene = useProjectStore(s => s.updateScene);
  const setTimeline = useTimelineStore(s => s.setTimeline);

  const [mobileTab, setMobileTab] = useState<'editor' | 'style' | 'preview'>('editor');
  const [showPresets, setShowPresets] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);

  // Derive current project and scene from state (reactive selectors)
  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] || null : null;

  // Auto-create a project if none exists
  useEffect(() => {
    if (!currentProjectId || !currentProject) {
      createProject('My First Project');
    }
  }, [currentProjectId, currentProject, createProject]);

  // Wire autosave subscription (HIGH-01)
  useEffect(() => {
    startAutosaveSubscription(() => useProjectStore.getState().getCurrentProject());
  }, []);

  // Build timeline when source changes (strip markup first)
  useEffect(() => {
    if (!currentScene) return;
    const { cleanSource, events: markupEvents } = parseMarkup(currentScene.sourceWithMarkup);
    const timeline = buildTimelineFromSource({
      source: cleanSource,
      typingConfig: currentScene.typingConfig,
      fps: 30,
      markupEvents,
    });
    setTimeline(timeline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene?.sourceWithMarkup, currentScene?.typingConfig, setTimeline]);

  const handleCodeChange = useCallback((value: string) => {
    if (!currentProject) return;
    updateScene(currentProject.id, currentSceneIndex, {
      sourceWithMarkup: value,
    });
  }, [currentProject, currentSceneIndex, updateScene]);

  const handleLanguageChange = useCallback((lang: string) => {
    if (!currentProject) return;
    updateScene(currentProject.id, currentSceneIndex, {
      language: lang,
    });
  }, [currentProject, currentSceneIndex, updateScene]);

  const handleBackgroundChange = useCallback((id: string) => {
    if (!currentProject) return;
    updateScene(currentProject.id, currentSceneIndex, {
      backgroundPresetId: id,
    });
  }, [currentProject, currentSceneIndex, updateScene]);

  const handleWindowChromeChange = useCallback((updates: Record<string, unknown>) => {
    if (!currentProject || !currentScene) return;
    updateScene(currentProject.id, currentSceneIndex, {
      windowChrome: { ...currentScene.windowChrome, ...updates },
    });
  }, [currentProject, currentScene, currentSceneIndex, updateScene]);

  const handleTypingChange = useCallback((updates: Record<string, unknown>) => {
    if (!currentProject || !currentScene) return;
    updateScene(currentProject.id, currentSceneIndex, {
      typingConfig: { ...currentScene.typingConfig, ...updates },
    });
  }, [currentProject, currentScene, currentSceneIndex, updateScene]);

  const handleTypographyChange = useCallback((updates: Record<string, unknown>) => {
    if (!currentProject || !currentScene) return;
    updateScene(currentProject.id, currentSceneIndex, {
      typography: { ...currentScene.typography, ...updates },
    });
  }, [currentProject, currentScene, currentSceneIndex, updateScene]);

  const handleAspectRatioChange = useCallback((value: string) => {
    if (!currentProject) return;
    useProjectStore.getState().updateProject(currentProject.id, { aspectRatio: value as '9:16' | '1:1' | '16:9' | 'custom' });
  }, [currentProject]);

  if (!currentScene) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Setting up project...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Desktop layout */}
      <div className="hidden md:flex h-full">
        {/* Left panel - Editor */}
        <div className="w-[380px] flex flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
            <LanguagePicker
              value={currentScene.language}
              onChange={handleLanguageChange}
            />
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowPresets(true)} className="text-[10px] h-7">
              Presets
            </Button>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {currentScene.sourceWithMarkup.split('\n').length} lines
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeInput
              value={currentScene.sourceWithMarkup}
              onChange={handleCodeChange}
              language={currentScene.language}
            />
          </div>
          <MarkupLintPanel source={currentScene.sourceWithMarkup} />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4">
            <CanvasPreview />
          </div>
        </div>

        {/* Right panel - Style & Export */}
        <div className="w-[300px] flex flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shrink-0 overflow-hidden">
          <Tabs defaultValue="theme" className="flex flex-col h-full">
            <TabsList className="mx-3 mt-3">
              <TabsTrigger value="theme" className="text-xs flex-1">Theme</TabsTrigger>
              <TabsTrigger value="style" className="text-xs flex-1">Style</TabsTrigger>
              <TabsTrigger value="skins" className="text-xs flex-1">Skins</TabsTrigger>
              <TabsTrigger value="export" className="text-xs flex-1">Export</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="theme" className="p-3 m-0">
                <CodeThemeGallery />
              </TabsContent>

              <TabsContent value="style" className="p-3 m-0 space-y-5">
                <BackgroundPicker
                  currentBackgroundId={currentScene.backgroundPresetId}
                  onChange={handleBackgroundChange}
                />
                <WindowChromeControls
                  config={currentScene.windowChrome}
                  onChange={handleWindowChromeChange}
                />
                <TypingBehaviorControls
                  config={currentScene.typingConfig}
                  onChange={handleTypingChange}
                />
                <TypographyControls
                  settings={currentScene.typography}
                  onChange={(updates) => handleTypographyChange(updates)}
                />
                <AspectRatioSelector
                  value={currentProject?.aspectRatio || '9:16'}
                  onChange={handleAspectRatioChange}
                />
              </TabsContent>

              <TabsContent value="skins" className="p-3 m-0 space-y-5">
                <UISkinGallery />
                <BrandKitManager />
              </TabsContent>

              <TabsContent value="export" className="m-0 p-0">
                <ExportPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'editor' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
                <LanguagePicker
                  value={currentScene.language}
                  onChange={handleLanguageChange}
                />
              </div>
              <div className="flex-1">
                <CodeInput
                  value={currentScene.sourceWithMarkup}
                  onChange={handleCodeChange}
                  language={currentScene.language}
                />
              </div>
            </div>
          )}
          {mobileTab === 'style' && (
            <div className="h-full overflow-y-auto p-3 space-y-5">
              <CodeThemeGallery />
              <BackgroundPicker
                currentBackgroundId={currentScene.backgroundPresetId}
                onChange={handleBackgroundChange}
              />
              <WindowChromeControls
                config={currentScene.windowChrome}
                onChange={handleWindowChromeChange}
              />
              <TypingBehaviorControls
                config={currentScene.typingConfig}
                onChange={handleTypingChange}
              />
            </div>
          )}
          {mobileTab === 'preview' && (
            <div className="h-full p-3">
              <CanvasPreview />
            </div>
          )}
        </div>

        {/* Mobile tab bar */}
        <div className="flex border-t border-[var(--border)] bg-[var(--bg-elevated)]">
          {(['editor', 'style', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-3 text-xs font-medium text-center cursor-pointer ${
                mobileTab === tab
                  ? 'text-[var(--accent)] border-t-2 border-[var(--accent)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <ProjectManager open={showProjectManager} onClose={() => setShowProjectManager(false)} />
      <PresetLibraryDrawer
        open={showPresets}
        onClose={() => setShowPresets(false)}
        onSelect={(code, lang) => {
          handleCodeChange(code);
          handleLanguageChange(lang);
        }}
      />
    </AppShell>
  );
}

export default App;

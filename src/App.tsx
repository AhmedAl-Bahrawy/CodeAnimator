import { useMemo, useState } from 'react';
import { AppShell } from './shell/AppShell';
import { TopBar } from './shell/TopBar';
import { CodeInput, LanguagePicker, MarkupLintPanel, PresetLibraryDrawer, useSceneEditor } from './features/editor';
import { CanvasPreview } from './features/preview';
import { DesignPanel } from './features/style';
import { AnimationPanel, useAnimationTransport } from './features/animation';
import { ExportPanel } from './features/export';
import { useProjectStore, useUISkinStore } from './state';
import { resolveSceneRenderModel } from './services/render/sceneModel';
import { useApplicationRuntime } from './shell/useApplicationRuntime';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { ProjectManager } from './features/projects';

function App() {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const createProject = useProjectStore(s => s.createProject);
  const updateScene = useProjectStore(s => s.updateScene);
  const updateProject = useProjectStore(s => s.updateProject);

  const [mobileTab, setMobileTab] = useState<'editor' | 'design' | 'animations' | 'preview' | 'export'>('editor');
  const [showPresets, setShowPresets] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);

  // Derive current project and scene from state (reactive selectors)
  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] || null : null;
  const skins = useUISkinStore(s => s.skins);
  const currentSkinId = useUISkinStore(s => s.currentSkinId);
  const {
    timeline,
    currentTimeMs,
    isPlaying,
    play: playTimeline,
    pause: pauseTimeline,
    reset: resetAnimation,
    seek: seekTimeline,
  } = useAnimationTransport();
  const currentSkin = useMemo(
    () => skins.find(skin => skin.id === currentSkinId) || skins[0],
    [skins, currentSkinId],
  );
  const sceneModel = useMemo(() => {
    if (!currentProject || !currentScene || !currentSkin) return null;
    return resolveSceneRenderModel(currentProject, currentScene, { skin: currentSkin, fps: 30 });
  }, [currentProject, currentScene, currentSkin]);
  const visibleSource = sceneModel?.source || '';

  const { hydrated } = useApplicationRuntime({
    project: currentProject,
    scene: currentScene,
    sceneModel,
    currentSkin,
    createProject,
  });

  const {
    handleCodeChange,
    handleLanguageChange,
    handleBackgroundChange,
    handleWindowChromeChange,
    handleTypingChange,
    handleTypographyChange,
    handlePresentationChange,
    handleAudioChange,
    handleAnimationChange,
    handleAspectRatioChange,
  } = useSceneEditor({
    project: currentProject,
    scene: currentScene,
    sceneIndex: currentSceneIndex,
    sceneModel,
    updateScene,
    updateProject,
  });

  if (!hydrated || !currentScene) {
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
    <AppShell topBar={<TopBar onOpenProjects={() => setShowProjectManager(true)} />}>
      {/* Desktop layout */}
      <div className="hidden md:flex h-full">
        {/* Left panel - Editor */}
        <div className="w-[380px] flex flex-col min-h-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
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
              {visibleSource.split('\n').length} lines
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeInput
              value={visibleSource}
              onChange={handleCodeChange}
              language={currentScene.language}
              codeThemeId={currentScene.codeThemeId}
              skin={currentSkin}
              typography={currentScene.typography}
              appearance={sceneModel?.appearance}
            />
          </div>
          <MarkupLintPanel source={currentScene.sourceWithMarkup} />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 p-4">
            <CanvasPreview />
          </div>
        </div>

        {/* Right panel - Style & Export */}
        <div className="w-[300px] flex flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shrink-0 overflow-hidden">
          <Tabs defaultValue="design" className="flex flex-col h-full">
            <TabsList className="mx-3 mt-3">
              <TabsTrigger value="design" className="text-xs flex-1">Design</TabsTrigger>
              <TabsTrigger value="animations" className="text-xs flex-1">Animate</TabsTrigger>
              <TabsTrigger value="export" className="text-xs flex-1">Export</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="design" className="p-3 m-0">
                <DesignPanel
                  scene={currentScene}
                  aspectRatio={currentProject?.aspectRatio || '9:16'}
                  onBackgroundChange={handleBackgroundChange}
                  onWindowChromeChange={handleWindowChromeChange}
                  onTypographyChange={handleTypographyChange}
                  onAspectRatioChange={handleAspectRatioChange}
                />
              </TabsContent>

              <TabsContent value="animations" className="p-3 m-0">
                {sceneModel && (
                  <AnimationPanel
                    animation={sceneModel.animation}
                    presentation={sceneModel.presentation}
                    typing={sceneModel.typingConfig}
                    audio={sceneModel.audio}
                    onAnimationChange={handleAnimationChange}
                    onPresentationChange={handlePresentationChange}
                    onTypingChange={handleTypingChange}
                    onAudioChange={handleAudioChange}
                    timeline={timeline}
                    currentTimeMs={currentTimeMs}
                    isPlaying={isPlaying}
                    onPlay={playTimeline}
                    onPause={pauseTimeline}
                    onReset={resetAnimation}
                    onSeek={seekTimeline}
                  />
                )}
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
                  value={visibleSource}
                  onChange={handleCodeChange}
                  language={currentScene.language}
                  codeThemeId={currentScene.codeThemeId}
                  skin={currentSkin}
                  typography={currentScene.typography}
                />
              </div>
            </div>
          )}
          {mobileTab === 'design' && (
            <div className="h-full overflow-y-auto p-3">
              <DesignPanel
                scene={currentScene}
                aspectRatio={currentProject?.aspectRatio || '9:16'}
                onBackgroundChange={handleBackgroundChange}
                onWindowChromeChange={handleWindowChromeChange}
                onTypographyChange={handleTypographyChange}
                onAspectRatioChange={handleAspectRatioChange}
              />
            </div>
          )}
          {mobileTab === 'export' && (
            <div className="h-full overflow-y-auto">
              <ExportPanel />
            </div>
          )}
          {mobileTab === 'preview' && sceneModel && (
            <div className="h-full overflow-y-auto p-3">
              <AnimationPanel
                animation={sceneModel.animation}
                presentation={sceneModel.presentation}
                typing={sceneModel.typingConfig}
                audio={sceneModel.audio}
                onAnimationChange={handleAnimationChange}
                onPresentationChange={handlePresentationChange}
                onTypingChange={handleTypingChange}
                onAudioChange={handleAudioChange}
                timeline={timeline}
                currentTimeMs={currentTimeMs}
                isPlaying={isPlaying}
                onPlay={playTimeline}
                onPause={pauseTimeline}
                onReset={resetAnimation}
                onSeek={seekTimeline}
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
          {(['editor', 'design', 'animations', 'preview', 'export'] as const).map((tab) => (
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

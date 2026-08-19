import { useCallback } from 'react';
import type {
  AspectRatio,
  Project,
  Scene,
  SceneAudioSettings,
  SceneAnimationSettings,
  ScenePresentationSettings,
  TypographySettings,
  TypingConfig,
  WindowChromeConfig,
} from '@/types/domain';
import { mergeVisibleSourceWithMarkup, type SceneRenderModel } from '@/services/render/sceneModel';

export interface UseSceneEditorOptions {
  project: Project | null;
  scene: Scene | null;
  sceneIndex: number;
  sceneModel: SceneRenderModel | null;
  updateScene: (projectId: string, sceneIndex: number, updates: Partial<Scene>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
}

/**
 * Feature-level adapter between editor/style controls and the project store.
 *
 * Components only deal with user-facing values; this hook owns scene selection,
 * markup preservation, nested configuration merges, and project-level settings.
 */
export function useSceneEditor({
  project,
  scene,
  sceneIndex,
  sceneModel,
  updateScene,
  updateProject,
}: UseSceneEditorOptions) {
  const updateCurrentScene = useCallback((updates: Partial<Scene>) => {
    if (!project || !scene) return;
    updateScene(project.id, sceneIndex, updates);
  }, [project, scene, sceneIndex, updateScene]);

  const handleCodeChange = useCallback((value: string) => {
    if (!scene) return;
    updateCurrentScene({
      sourceWithMarkup: mergeVisibleSourceWithMarkup(scene.sourceWithMarkup, value),
    });
  }, [scene, updateCurrentScene]);

  const handleLanguageChange = useCallback((language: string) => {
    updateCurrentScene({ language });
  }, [updateCurrentScene]);

  const handleBackgroundChange = useCallback((backgroundPresetId: string) => {
    updateCurrentScene({ backgroundPresetId });
  }, [updateCurrentScene]);

  const handleWindowChromeChange = useCallback((updates: Record<string, unknown>) => {
    if (!scene) return;
    const next = updates as Partial<WindowChromeConfig>;
    updateCurrentScene({ windowChrome: { ...scene.windowChrome, ...next } });
  }, [scene, updateCurrentScene]);

  const handleTypingChange = useCallback((updates: Record<string, unknown>) => {
    if (!scene) return;
    const next = updates as Partial<TypingConfig>;
    updateCurrentScene({ typingConfig: { ...scene.typingConfig, ...next } });
  }, [scene, updateCurrentScene]);

  const handleTypographyChange = useCallback((updates: Record<string, unknown>) => {
    if (!scene) return;
    const next = updates as Partial<TypographySettings>;
    updateCurrentScene({ typography: { ...scene.typography, ...next } });
  }, [scene, updateCurrentScene]);

  const handlePresentationChange = useCallback((updates: Record<string, unknown>) => {
    if (!sceneModel) return;
    const next = updates as Partial<ScenePresentationSettings>;
    updateCurrentScene({ presentation: { ...sceneModel.presentation, ...next } });
  }, [sceneModel, updateCurrentScene]);

  const handleAudioChange = useCallback((updates: Record<string, unknown>) => {
    if (!sceneModel) return;
    const next = updates as Partial<SceneAudioSettings>;
    updateCurrentScene({ audio: { ...sceneModel.audio, ...next } });
  }, [sceneModel, updateCurrentScene]);

  const handleAnimationChange = useCallback((updates: Record<string, unknown>) => {
    if (!sceneModel) return;
    const next = updates as Partial<SceneAnimationSettings>;
    updateCurrentScene({ animation: { ...sceneModel.animation, ...next } });
  }, [sceneModel, updateCurrentScene]);

  const handleAspectRatioChange = useCallback((value: string) => {
    if (!project) return;
    updateProject(project.id, { aspectRatio: value as AspectRatio });
  }, [project, updateProject]);

  return {
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
  };
}

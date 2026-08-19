import { useEffect, useState } from 'react';
import { loadAllProjects } from '@/persistence/projectRepo';
import { startAutosaveSubscription } from '@/persistence/autosave';
import { getUISkinById } from '@/data/uiSkins';
import type { SceneRenderModel } from '@/services/render/sceneModel';
import type { Project, Scene, UISkin } from '@/types/domain';
import { useProjectStore, useThemeStore, useTimelineStore, useUISkinStore } from '@/state';
import { applySkinToDocument } from '@/state/uiSkinStore';

export interface UseApplicationRuntimeOptions {
  project: Project | null;
  scene: Scene | null;
  sceneModel: SceneRenderModel | null;
  currentSkin: UISkin | undefined;
  createProject: (name: string) => Project;
}

/**
 * Owns the application-level runtime effects that connect persistence and
 * canonical services to the UI shell. Feature components remain effect-light.
 */
export function useApplicationRuntime({
  project,
  scene,
  sceneModel,
  currentSkin,
  createProject,
}: UseApplicationRuntimeOptions) {
  const setTimeline = useTimelineStore(s => s.setTimeline);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      applySkinToDocument(getUISkinById('midnight'));
      try {
        const saved = await loadAllProjects();
        if (cancelled) return;
        if (saved.length > 0) {
          const framingMigrationKey = 'codereel-edge-to-edge-framing-v1';
          const shouldMigrateFraming = localStorage.getItem(framingMigrationKey) !== '1';
          const hydratedProjects = shouldMigrateFraming
            ? saved.map(savedProject => ({
                ...savedProject,
                scenes: savedProject.scenes.map(savedScene => ({
                  ...savedScene,
                  presentation: {
                    framingMode: 'fill-canvas' as const,
                    maxZoom: Math.max(3.2, savedScene.presentation?.maxZoom || 0),
                    motionPreset: savedScene.presentation?.motionPreset || 'typewriter',
                    fxPreset: savedScene.presentation?.fxPreset || 'none',
                    fxIntensity: savedScene.presentation?.fxIntensity ?? 0.55,
                  },
                })),
              }))
            : saved;
          if (shouldMigrateFraming) localStorage.setItem(framingMigrationKey, '1');
          useProjectStore.setState({
            projects: hydratedProjects,
            currentProjectId: hydratedProjects[0].id,
            currentSceneIndex: 0,
          });
          await useUISkinStore.getState().loadCustomSkins();
          await useThemeStore.getState().loadCustomThemes();

          const savedSkinId = localStorage.getItem('codereel-skin-id');
          if (savedSkinId && useUISkinStore.getState().skins.some(skin => skin.id === savedSkinId)) {
            useUISkinStore.setState({ currentSkinId: savedSkinId });
          }
        } else {
          createProject('My First Project');
        }
      } catch {
        createProject('My First Project');
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  // Bootstrap intentionally runs once; store hydration actions are accessed through stable Zustand APIs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentSkin) return;
    applySkinToDocument(currentSkin);
    if (hydrated) localStorage.setItem('codereel-skin-id', currentSkin.id);
  }, [currentSkin, hydrated]);

  useEffect(() => {
    if (hydrated) {
      return startAutosaveSubscription(() => useProjectStore.getState().getCurrentProject());
    }
    return undefined;
  }, [hydrated]);

  useEffect(() => {
    if (!project || !scene || !sceneModel) return;
    setTimeline(sceneModel.timeline, sceneModel.source);
  }, [project, scene, sceneModel, setTimeline]);

  return { hydrated };
}


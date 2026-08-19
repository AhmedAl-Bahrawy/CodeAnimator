import { create } from 'zustand';
import type { Project, Scene, TypingConfig, WindowChromeConfig, TypographySettings } from '@/types/domain';
import { generateId } from '@/lib/utils';

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  currentSceneIndex: number;

  // Actions
  createProject: (name: string) => Project;
  setCurrentProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;

  // Scene actions
  addScene: (projectId: string) => void;
  updateScene: (projectId: string, sceneIndex: number, updates: Partial<Scene>) => void;
  removeScene: (projectId: string, sceneIndex: number) => void;
  setCurrentScene: (index: number) => void;

  // Getters
  getCurrentProject: () => Project | null;
}

const defaultTypingConfig: TypingConfig = {
  mode: 'character',
  baseSpeed: 40,
  cursorStyle: 'bar',
  cursorBlinkRate: 530,
  autoScroll: true,
};

const defaultWindowChrome: WindowChromeConfig = {
  style: 'macos',
  title: 'untitled',
  borderRadius: 12,
  shadowIntensity: 0.4,
  padding: 24,
  margin: 20,
  marginFill: 'transparent',
};

const defaultTypography: TypographySettings = {
  fontSize: 15,
  fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
  lineHeight: 1.6,
  letterSpacing: 0,
};

const defaultPresentation = {
  framingMode: 'fit-code' as const,
  maxZoom: 3.2,
  motionPreset: 'typewriter' as const,
  fxPreset: 'none' as const,
  fxIntensity: 0.55,
};

const defaultAudio = {
  enabled: false,
  cueId: 'none' as const,
  volume: 0.35,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  currentSceneIndex: 0,

  createProject: (name) => {
    const project: Project = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [{
        id: generateId(),
        language: 'javascript',
        sourceWithMarkup: '// Welcome to CodeReel!\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));',
        codeThemeId: 'dracula',
        backgroundPresetId: 'mesh-gradient-1',
        windowChrome: { ...defaultWindowChrome },
        typingConfig: { ...defaultTypingConfig },
        typography: { ...defaultTypography },
        presentation: { ...defaultPresentation },
        audio: { ...defaultAudio },
      }],
      aspectRatio: '9:16',
    };

    set(state => ({
      projects: [...state.projects, project],
      currentProjectId: project.id,
      currentSceneIndex: 0,
    }));

    return project;
  },

  setCurrentProject: (id) => set({ currentProjectId: id, currentSceneIndex: 0 }),

  updateProject: (id, updates) => set(state => ({
    projects: state.projects.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ),
  })),

  deleteProject: (id) => set(state => ({
    projects: state.projects.filter(p => p.id !== id),
    currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
  })),

  duplicateProject: (id) => {
    const { projects } = get();
    const original = projects.find(p => p.id === id);
    if (!original) return null;

    const duplicate: Project = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: original.scenes.map(s => ({
        ...s,
        id: generateId(),
      })),
    };

    set(state => ({
      projects: [...state.projects, duplicate],
    }));

    return duplicate;
  },

  addScene: (projectId) => set(state => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        scenes: [...p.scenes, {
          id: generateId(),
          language: 'javascript',
          sourceWithMarkup: '',
          codeThemeId: p.scenes[0]?.codeThemeId || 'dracula',
          backgroundPresetId: p.scenes[0]?.backgroundPresetId || 'mesh-gradient-1',
          windowChrome: { ...defaultWindowChrome },
          typingConfig: { ...defaultTypingConfig },
          typography: { ...defaultTypography },
          presentation: { ...defaultPresentation },
          audio: { ...defaultAudio },
        }],
      };
    }),
  })),

  updateScene: (projectId, sceneIndex, updates) => set(state => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        scenes: p.scenes.map((s, i) =>
          i === sceneIndex ? { ...s, ...updates } : s
        ),
      };
    }),
  })),

  removeScene: (projectId, sceneIndex) => set(state => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      if (p.scenes.length <= 1) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        scenes: p.scenes.filter((_, i) => i !== sceneIndex),
      };
    }),
  })),

  setCurrentScene: (index) => set({ currentSceneIndex: index }),

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find(p => p.id === currentProjectId) || null;
  },
}));

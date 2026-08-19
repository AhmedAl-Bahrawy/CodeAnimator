import db from './db';
import type { Project } from '@/types/domain';

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({
    id: project.id,
    data: project,
    updatedAt: Date.now(),
  });
}

export async function loadProject(id: string): Promise<Project | null> {
  const saved = await db.projects.get(id);
  return saved?.data || null;
}

export async function loadAllProjects(): Promise<Project[]> {
  const saved = await db.projects.orderBy('updatedAt').reverse().toArray();
  return saved.map(s => s.data);
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export async function saveAllProjects(projects: Project[]): Promise<void> {
  await db.projects.bulkPut(
    projects.map(p => ({
      id: p.id,
      data: p,
      updatedAt: p.updatedAt,
    }))
  );
}

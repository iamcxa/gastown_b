/**
 * @deprecated These operations use the old custom bd file format.
 * Use bd CLI commands instead via src/bd-cli/mod.ts.
 * This module will be removed in v0.2.0.
 */
import type { BdFile, BdTask, TaskStatus } from '../types.ts';

export function findTaskById(bd: BdFile, taskId: string): BdTask | undefined {
  const normalizedId = taskId.toLowerCase();
  for (const section of bd.sections) {
    const task = section.tasks.find((t) => t.id.toLowerCase() === normalizedId);
    if (task) return task;
  }
  return undefined;
}

export function updateTaskStatus(bd: BdFile, taskId: string, status: TaskStatus): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) =>
        task.id.toLowerCase() === taskId.toLowerCase() ? { ...task, status } : task
      ),
    })),
  };
}

export function updateTaskNote(bd: BdFile, taskId: string, key: string, value: string): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) => {
        if (task.id.toLowerCase() !== taskId.toLowerCase()) return task;

        const existingNoteIndex = task.notes.findIndex((n) => n.key === key);
        const newNotes = [...task.notes];

        if (existingNoteIndex >= 0) {
          newNotes[existingNoteIndex] = { key, value };
        } else {
          newNotes.push({ key, value });
        }

        return { ...task, notes: newNotes };
      }),
    })),
  };
}

export function addTask(bd: BdFile, sectionName: string, task: BdTask): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) =>
      section.name === sectionName ? { ...section, tasks: [...section.tasks, task] } : section
    ),
  };
}

export function getTaskDependencies(bd: BdFile, taskId: string): string[] {
  const task = findTaskById(bd, taskId);
  if (!task) return [];

  const dependsNote = task.notes.find((n) => n.key === 'depends');
  if (!dependsNote) return [];

  return dependsNote.value
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^(\w+)-(\d+)$/, '$1-$2'))
    .filter((d) => d.length > 0);
}

export function isTaskCompleted(task: BdTask): boolean {
  return task.status === '✅';
}

export function isTaskBlocked(task: BdTask): boolean {
  return task.status === '⚠️';
}

export function isTaskActive(task: BdTask): boolean {
  return task.status === '🟡';
}

export function isTaskPending(task: BdTask): boolean {
  return task.status === '🔵';
}

export function areDependenciesSatisfied(bd: BdFile, taskId: string): boolean {
  const deps = getTaskDependencies(bd, taskId);
  if (deps.length === 0) return true;

  return deps.every((depId) => {
    const depTask = findTaskById(bd, depId);
    return depTask && isTaskCompleted(depTask);
  });
}

export function getReadyTasks(bd: BdFile): BdTask[] {
  const ready: BdTask[] = [];

  for (const section of bd.sections) {
    for (const task of section.tasks) {
      if (isTaskPending(task) && areDependenciesSatisfied(bd, task.id)) {
        ready.push(task);
      }
    }
  }

  return ready;
}

export function getActiveWorkerCount(bd: BdFile): number {
  let count = 0;
  for (const section of bd.sections) {
    for (const task of section.tasks) {
      if (isTaskActive(task)) {
        count++;
      }
    }
  }
  return count;
}

export function getAllTasks(bd: BdFile): BdTask[] {
  return bd.sections.flatMap((s) => s.tasks);
}

export function getTasksByRole(bd: BdFile, role: string): BdTask[] {
  return getAllTasks(bd).filter((t) => t.role === role);
}

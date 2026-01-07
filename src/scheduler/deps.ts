import type { BdFile, BdTask } from '../types.ts';
import {
  getTaskDependencies,
  getAllTasks,
  isTaskPending,
  isTaskActive,
  isTaskCompleted,
  findTaskById,
} from '../bd/operations.ts';

export type DependencyGraph = Map<string, string[]>;

export function buildDependencyGraph(bd: BdFile): DependencyGraph {
  const graph = new Map<string, string[]>();

  for (const task of getAllTasks(bd)) {
    const deps = getTaskDependencies(bd, task.id);
    graph.set(task.id, deps);
  }

  return graph;
}

export function areDependenciesMet(bd: BdFile, taskId: string): boolean {
  const deps = getTaskDependencies(bd, taskId);

  for (const depId of deps) {
    const depTask = findTaskById(bd, depId);
    if (!depTask || !isTaskCompleted(depTask)) {
      return false;
    }
  }

  return true;
}

export function getReadyToRunTasks(bd: BdFile): BdTask[] {
  return getAllTasks(bd).filter(
    (task) => isTaskPending(task) && areDependenciesMet(bd, task.id)
  );
}

export function getNextTasks(bd: BdFile, maxWorkers: number): BdTask[] {
  const activeCount = getAllTasks(bd).filter(isTaskActive).length;
  const availableSlots = maxWorkers - activeCount;

  if (availableSlots <= 0) return [];

  const ready = getReadyToRunTasks(bd);
  return ready.slice(0, availableSlots);
}

export function hasCircularDependency(bd: BdFile): boolean {
  const graph = buildDependencyGraph(bd);
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(taskId: string): boolean {
    visited.add(taskId);
    recStack.add(taskId);

    const deps = graph.get(taskId) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (dfs(dep)) return true;
      } else if (recStack.has(dep)) {
        return true;
      }
    }

    recStack.delete(taskId);
    return false;
  }

  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      if (dfs(taskId)) return true;
    }
  }

  return false;
}

export function getBlockedTasks(bd: BdFile): BdTask[] {
  const blocked: BdTask[] = [];

  for (const task of getAllTasks(bd)) {
    if (!isTaskPending(task)) continue;

    const deps = getTaskDependencies(bd, task.id);
    for (const depId of deps) {
      const depTask = findTaskById(bd, depId);
      if (depTask && depTask.status === '⚠️') {
        blocked.push(task);
        break;
      }
    }
  }

  return blocked;
}

import type { BdFile, BdTask, RoleName } from '../types.ts';
import { getNextTasks, hasCircularDependency, getBlockedTasks } from './deps.ts';
import { updateTaskStatus, updateTaskNote, findTaskById } from '../bd/operations.ts';
import { writeBdFile } from '../bd/writer.ts';
import { launchWorker, respawnWorker } from '../claude/launcher.ts';

export interface SchedulerConfig {
  sessionName: string;
  projectDir: string;
  bdPath: string;
  convoyName: string;
  maxWorkers: number;
}

export interface SchedulerState {
  bd: BdFile;
  config: SchedulerConfig;
  activeWorkers: Map<string, { paneIndex: string }>;
}

export function createSchedulerState(bd: BdFile, config: SchedulerConfig): SchedulerState {
  return {
    bd,
    config,
    activeWorkers: new Map(),
  };
}

export async function scheduleNextTasks(state: SchedulerState): Promise<SchedulerState> {
  const { bd, config, activeWorkers } = state;

  // Check for circular dependencies
  if (hasCircularDependency(bd)) {
    console.error('Circular dependency detected in task graph');
    return state;
  }

  // Get next tasks to run
  const nextTasks = getNextTasks(bd, config.maxWorkers);

  if (nextTasks.length === 0) {
    return state;
  }

  let updatedBd = bd;

  for (const task of nextTasks) {
    // Mark task as active
    updatedBd = updateTaskStatus(updatedBd, task.id, '🟡');

    // Launch worker
    const success = await launchWorker(
      config.sessionName,
      task.role,
      task.roleInstance || 1,
      config.projectDir,
      config.bdPath,
      config.convoyName,
      task.description
    );

    if (success) {
      activeWorkers.set(task.id, { paneIndex: String(activeWorkers.size + 1) });
    } else {
      // Mark as blocked if launch failed
      updatedBd = updateTaskStatus(updatedBd, task.id, '⚠️');
      updatedBd = updateTaskNote(updatedBd, task.id, 'error', 'Failed to launch worker');
    }
  }

  // Save updated bd
  await writeBdFile(updatedBd);

  return {
    ...state,
    bd: updatedBd,
  };
}

export async function handleTaskCompletion(
  state: SchedulerState,
  taskId: string
): Promise<SchedulerState> {
  let { bd, activeWorkers } = state;

  // Mark task as completed
  bd = updateTaskStatus(bd, taskId, '✅');
  bd = updateTaskNote(bd, taskId, 'completed', new Date().toISOString());

  // Remove from active workers
  activeWorkers.delete(taskId);

  // Save bd
  await writeBdFile(bd);

  // Schedule next tasks
  return await scheduleNextTasks({ ...state, bd });
}

export async function handleRespawnRequest(
  state: SchedulerState,
  taskId: string,
  checkpoint: string
): Promise<SchedulerState> {
  const { bd, config, activeWorkers } = state;

  const task = findTaskById(bd, taskId);
  if (!task) return state;

  // Kill existing pane (would need pane tracking)
  // For now, just launch new worker

  const success = await respawnWorker(
    config.sessionName,
    task.role,
    task.roleInstance || 1,
    config.projectDir,
    config.bdPath,
    config.convoyName,
    task.description,
    checkpoint
  );

  if (!success) {
    let updatedBd = updateTaskStatus(bd, taskId, '⚠️');
    updatedBd = updateTaskNote(updatedBd, taskId, 'error', 'Respawn failed');
    await writeBdFile(updatedBd);
    return { ...state, bd: updatedBd };
  }

  return state;
}

export function isConvoyComplete(bd: BdFile): boolean {
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection || executionSection.tasks.length === 0) return false;

  return executionSection.tasks.every((task) => task.status === '✅');
}

export function getConvoyProgress(bd: BdFile): { completed: number; total: number; percent: number } {
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection) return { completed: 0, total: 0, percent: 0 };

  const total = executionSection.tasks.length;
  const completed = executionSection.tasks.filter((t) => t.status === '✅').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}

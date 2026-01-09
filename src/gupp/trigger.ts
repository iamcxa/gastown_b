// src/gupp/trigger.ts
// GUPP trigger logic - spawns workers for ready work

import type { GuppCheckResult } from './check.ts';
import { spawnAgent } from '../spawn/mod.ts';
import type { TaskInfo } from '../bd-cli/task.ts';

/**
 * Result of triggering work
 */
export interface TriggerResult {
  /** Whether any action was taken */
  triggered: boolean;
  /** Message describing what happened */
  message: string;
  /** Tasks that were assigned to workers */
  assignedTasks: TaskInfo[];
  /** Number of workers spawned */
  workersSpawned: number;
  /** Whether the convoy is complete (all tasks done) */
  convoyComplete: boolean;
}

/**
 * Trigger work based on GUPP check result
 *
 * @param checkResult - Result from checkForReadyWork
 * @param dryRun - If true, only report what would be done without taking action
 * @returns TriggerResult describing actions taken
 */
export async function triggerWork(
  checkResult: GuppCheckResult,
  dryRun = false,
): Promise<TriggerResult> {
  // If no convoy, nothing to do
  if (!checkResult.convoyId || !checkResult.convoy) {
    return {
      triggered: false,
      message: 'No convoy context - GASTOWN_BD not set',
      assignedTasks: [],
      workersSpawned: 0,
      convoyComplete: false,
    };
  }

  // If all tasks are done, notify for finishing workflow
  if (checkResult.allTasksDone && checkResult.readyTasks.length === 0) {
    const message =
      'All tasks complete! Mayor should run /finishing-a-development-branch to wrap up the convoy.';
    if (!dryRun) {
      console.log(`[GUPP] ${message}`);
    }
    return {
      triggered: true,
      message,
      assignedTasks: [],
      workersSpawned: 0,
      convoyComplete: true,
    };
  }

  // If no work or no slots, nothing to do
  if (!checkResult.hasWork) {
    const reason = checkResult.readyTasks.length === 0
      ? 'No ready tasks'
      : 'No available worker slots';
    return {
      triggered: false,
      message: reason,
      assignedTasks: [],
      workersSpawned: 0,
      convoyComplete: false,
    };
  }

  // Determine how many workers to spawn
  const tasksToAssign = checkResult.readyTasks.slice(0, checkResult.idleWorkerSlots);

  if (dryRun) {
    return {
      triggered: false,
      message: `[DRY RUN] Would spawn ${tasksToAssign.length} polecat worker(s) for tasks: ${
        tasksToAssign.map((t) => t.id).join(', ')
      }`,
      assignedTasks: tasksToAssign,
      workersSpawned: 0,
      convoyComplete: false,
    };
  }

  // Spawn polecat workers for each ready task
  const assignedTasks: TaskInfo[] = [];
  let workersSpawned = 0;

  for (const task of tasksToAssign) {
    try {
      const convoyName = Deno.env.get('GASTOWN_CONVOY') || checkResult.convoy.title;
      await spawnAgent({
        role: 'polecat',
        task: `${task.title}\n\nTask ID: ${task.id}\n\n${task.description}`,
        convoyId: checkResult.convoyId,
        convoyName: convoyName,
      });
      assignedTasks.push(task);
      workersSpawned++;
      console.log(`[GUPP] Spawned polecat for task ${task.id}: ${task.title}`);
    } catch (error) {
      console.error(
        `[GUPP] Failed to spawn polecat for task ${task.id}:`,
        (error as Error).message,
      );
    }
  }

  return {
    triggered: workersSpawned > 0,
    message: `Spawned ${workersSpawned} polecat worker(s)`,
    assignedTasks,
    workersSpawned,
    convoyComplete: false,
  };
}

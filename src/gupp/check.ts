// src/gupp/check.ts
// GUPP = "Gastown Universal Propulsion Principle"
// "If there is work on your hook, YOU MUST RUN IT"

import { getReadyTasks, type TaskInfo } from '../bd-cli/task.ts';
import { type AgentBead, listAgentBeads } from '../bd-cli/agent.ts';
import { type ConvoyInfo, getConvoy } from '../bd-cli/convoy.ts';

/**
 * Result of checking for ready work in a convoy
 */
export interface GuppCheckResult {
  /** Whether there is actionable work available */
  hasWork: boolean;
  /** Tasks that are ready to be worked on */
  readyTasks: TaskInfo[];
  /** Whether all tasks in the convoy are done */
  allTasksDone: boolean;
  /** Number of available worker slots */
  idleWorkerSlots: number;
  /** The convoy ID being checked */
  convoyId: string | null;
  /** Convoy info if found */
  convoy: ConvoyInfo | null;
  /** Current agents in the convoy */
  agents: AgentBead[];
}

/**
 * Get the maximum number of workers from convoy labels
 */
function getMaxWorkersFromLabels(labels: string[]): number {
  const maxWorkersLabel = labels.find((l) => l.startsWith('max-workers:'));
  if (maxWorkersLabel) {
    const value = parseInt(maxWorkersLabel.split(':')[1], 10);
    if (!isNaN(value)) return value;
  }
  return 3; // Default max workers
}

/**
 * Check for ready work in a convoy
 *
 * @param convoyId - Optional convoy ID. If not provided, uses GASTOWN_BD env var
 * @returns GuppCheckResult with work availability information
 */
export async function checkForReadyWork(convoyId?: string): Promise<GuppCheckResult> {
  // Resolve convoy ID from parameter or environment
  const resolvedConvoyId = convoyId || Deno.env.get('GASTOWN_BD');

  // If no convoy ID, return empty result
  if (!resolvedConvoyId) {
    return {
      hasWork: false,
      readyTasks: [],
      allTasksDone: false,
      idleWorkerSlots: 0,
      convoyId: null,
      convoy: null,
      agents: [],
    };
  }

  // Fetch convoy, tasks, and agents
  let convoy: ConvoyInfo | null = null;
  let readyTasks: TaskInfo[] = [];
  let agents: AgentBead[] = [];

  try {
    convoy = await getConvoy(resolvedConvoyId);
  } catch {
    // Convoy not found
    return {
      hasWork: false,
      readyTasks: [],
      allTasksDone: false,
      idleWorkerSlots: 0,
      convoyId: resolvedConvoyId,
      convoy: null,
      agents: [],
    };
  }

  try {
    // Get ready tasks for this convoy
    readyTasks = await getReadyTasks(resolvedConvoyId);
  } catch {
    readyTasks = [];
  }

  try {
    // Get agents for this convoy
    agents = await listAgentBeads(resolvedConvoyId);
  } catch {
    agents = [];
  }

  // Calculate available worker slots
  const maxWorkers = getMaxWorkersFromLabels(convoy.labels);
  // Worker roles: polecat, witness, dog, refinery (not mayor, planner, foreman, prime)
  const workerRoles = ['polecat', 'witness', 'dog', 'refinery'];
  const activeWorkers = agents.filter((a) => workerRoles.includes(a.role)).length;
  const idleWorkerSlots = Math.max(0, maxWorkers - activeWorkers);

  // Check if all tasks are done (convoy has closed status or no open tasks)
  const allTasksDone = convoy.status === 'closed' ||
    (readyTasks.length === 0 && agents.length > 0);

  // There is work if we have ready tasks AND available slots
  const hasWork = readyTasks.length > 0 && idleWorkerSlots > 0;

  return {
    hasWork,
    readyTasks,
    allTasksDone,
    idleWorkerSlots,
    convoyId: resolvedConvoyId,
    convoy,
    agents,
  };
}

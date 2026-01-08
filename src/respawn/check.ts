// src/respawn/check.ts
import { setAgentState, updateHeartbeat } from '../bd-cli/agent.ts';
import { addTaskComment, setTaskState } from '../bd-cli/task.ts';
import { getSlot } from '../bd-cli/slot.ts';

// State and slot key constants
export const STATE_CONTEXT = 'context';
export const STATE_STUCK = 'stuck';
export const SLOT_HOOK = 'hook';

// Reason constants
export const REASON_CONTEXT_THRESHOLD = 'context_threshold';
export const REASON_STUCK = 'stuck';
export const REASON_ERROR = 'error';
export const STATE_RESPAWN_TRIGGERED = 'respawn_triggered';

export interface RespawnCheckOptions {
  contextUsage: number;
  threshold: number;
}

export interface RespawnDecision {
  shouldRespawn: boolean;
  reason?: 'context_threshold' | 'stuck' | 'error';
  contextUsage: number;
}

export function shouldRespawn(options: RespawnCheckOptions): RespawnDecision {
  const { contextUsage, threshold } = options;

  // Input validation
  if (typeof contextUsage !== 'number' || isNaN(contextUsage) || contextUsage < 0) {
    throw new Error(`Invalid contextUsage: must be a non-negative number, got ${contextUsage}`);
  }
  if (typeof threshold !== 'number' || isNaN(threshold) || threshold < 0) {
    throw new Error(`Invalid threshold: must be a non-negative number, got ${threshold}`);
  }

  if (contextUsage > threshold) {
    return {
      shouldRespawn: true,
      reason: REASON_CONTEXT_THRESHOLD,
      contextUsage,
    };
  }

  return {
    shouldRespawn: false,
    contextUsage,
  };
}

export interface CheckpointData {
  agentId: string;
  taskId?: string;
  contextUsage: number;
  state: string;
  currentFile?: string;
  nextAction?: string;
}

export async function recordCheckpoint(data: CheckpointData): Promise<void> {
  const { agentId, taskId, contextUsage, state, currentFile, nextAction } = data;

  try {
    // 1. Update agent context state
    await setTaskState(agentId, STATE_CONTEXT, `${contextUsage}%`);

    // 2. Record checkpoint to task if attached
    if (taskId) {
      const checkpoint = [
        `CHECKPOINT: context=${contextUsage}%`,
        `state: ${state}`,
        currentFile ? `current-file: ${currentFile}` : '',
        nextAction ? `next-action: ${nextAction}` : '',
        'pending-respawn: true',
      ]
        .filter(Boolean)
        .join('\n');

      await addTaskComment(taskId, checkpoint);
    }

    // 3. Update agent state to stuck
    await setAgentState(agentId, STATE_STUCK);
  } catch (error) {
    console.error(`[recordCheckpoint] Failed for agent ${agentId}:`, error);
    throw error;
  }
}

export async function performRespawnCheck(
  agentId: string,
  contextUsage: number,
  threshold: number
): Promise<RespawnDecision> {
  try {
    // 1. Update heartbeat
    await updateHeartbeat(agentId);

    // 2. Update context state
    await setTaskState(agentId, STATE_CONTEXT, `${contextUsage}%`);

    // 3. Check if respawn needed
    const decision = shouldRespawn({ contextUsage, threshold });

    if (decision.shouldRespawn) {
      // 4. Get current task
      const taskId = await getSlot(agentId, SLOT_HOOK);

      // 5. Record checkpoint
      await recordCheckpoint({
        agentId,
        taskId: taskId || undefined,
        contextUsage,
        state: STATE_RESPAWN_TRIGGERED,
      });
    }

    return decision;
  } catch (error) {
    console.error(`[performRespawnCheck] Failed for agent ${agentId}:`, error);
    throw error;
  }
}

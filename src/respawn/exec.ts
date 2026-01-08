// src/respawn/exec.ts
import { getAgentBead, setAgentState, type RoleName } from '../bd-cli/agent.ts';
import { getSlot } from '../bd-cli/slot.ts';
import { addTaskComment } from '../bd-cli/task.ts';
import { SLOT_HOOK } from './check.ts';

// State constants
export const STATE_SPAWNING = 'spawning';
export const STATE_WORKING = 'working';
export const STATE_DEAD = 'dead';

// Claude command constants
export const CLAUDE_AGENT_FLAG = '--agent';
export const CLAUDE_RESUME_FLAG = '--resume';

export interface RespawnContext {
  agentId: string;
  role: RoleName;
  taskId: string | null;
  sessionName: string;
  paneId?: string;
}

export async function prepareRespawn(agentId: string): Promise<RespawnContext> {
  const agent = await getAgentBead(agentId);
  const taskId = await getSlot(agentId, SLOT_HOOK);

  return {
    agentId,
    role: agent.role,
    taskId,
    sessionName: '', // Will be set by caller
  };
}

export async function executeRespawn(
  context: RespawnContext,
  projectDir: string
): Promise<boolean> {
  const { agentId, role, taskId, sessionName, paneId } = context;

  try {
    // 1. Update state to spawning
    await setAgentState(agentId, STATE_SPAWNING);

    // 2. Record respawn in task
    if (taskId) {
      await addTaskComment(taskId, `RESPAWN: Agent ${agentId} respawning`);
    }

    // 3. Build Claude command (placeholder - actual tmux integration depends on tmux module)
    const claudeCmd = buildClaudeCommand(agentId, role, taskId, projectDir);

    console.log(`Respawn command: ${claudeCmd}`);

    // 4. Update state to working (in real implementation, this would be after tmux pane created)
    await setAgentState(agentId, STATE_WORKING);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`Respawn failed for ${agentId}:`, {
      message: errorMessage,
      stack: errorStack,
      agentId,
      role,
      taskId,
    });
    await setAgentState(agentId, STATE_DEAD);
    return false;
  }
}

export function buildClaudeCommand(
  agentId: string,
  role: RoleName,
  taskId: string | null,
  projectDir: string
): string {
  const envVars = [
    `GASTOWN_AGENT=${agentId}`,
    `GASTOWN_ROLE=${role}`,
    taskId ? `GASTOWN_BD=${taskId}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `cd ${projectDir} && ${envVars} claude ${CLAUDE_AGENT_FLAG} ${role} ${CLAUDE_RESUME_FLAG} ${agentId}`;
}

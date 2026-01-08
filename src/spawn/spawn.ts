import type { RoleName } from '../types.ts';
import { createAgentBead, setAgentState } from '../bd-cli/agent.ts';
import { buildClaudeCommand, buildRolePrompt } from '../claude/command.ts';
import { splitWindowAndGetIndex } from '../tmux/operations.ts';

export interface SpawnOptions {
  role: RoleName;
  task: string;
  convoyId?: string;
  convoyName?: string;
  contextPath?: string;
  projectDir?: string;
  paneDirection?: 'h' | 'v';
  agentsDir?: string;
}

export interface SpawnResult {
  agentId: string;
  convoyId: string;
  paneIndex: number;
  role: RoleName;
}

export async function spawnAgent(options: SpawnOptions): Promise<SpawnResult> {
  // 1. Resolve convoy from options or environment
  const convoyId = options.convoyId || Deno.env.get('GASTOWN_BD');
  const convoyName = options.convoyName || Deno.env.get('GASTOWN_CONVOY');

  if (!convoyId) {
    throw new Error('Missing convoy ID. Provide --convoy or set GASTOWN_BD environment variable.');
  }
  if (!convoyName) {
    throw new Error('Missing convoy name. Provide --convoy-name or set GASTOWN_CONVOY environment variable.');
  }

  // 2. Create agent bead as child of convoy
  const agent = await createAgentBead({
    role: options.role,
    convoyId: convoyId,
  });
  await setAgentState(agent.id, 'spawning');

  // 3. Build Claude command with both convoy and agent IDs
  const prompt = buildRolePrompt(options.role, options.task);
  const agentsDir = options.agentsDir || '.gastown/agents';
  const command = buildClaudeCommand({
    role: options.role,
    agentDir: agentsDir,
    convoyId: convoyId,
    convoyName: convoyName,
    agentId: agent.id,
    contextPath: options.contextPath,
    prompt: prompt,
    workingDir: options.projectDir,
  });

  // 4. Launch in new tmux pane
  const direction = options.paneDirection === 'v' ? 'vertical' : 'horizontal';
  const { success, paneIndex } = await splitWindowAndGetIndex(convoyName, command, direction);

  if (!success) {
    await setAgentState(agent.id, 'dead');
    throw new Error(`Failed to create tmux pane for ${options.role}`);
  }

  // 5. Update state and return result
  await setAgentState(agent.id, 'running');

  return {
    agentId: agent.id,
    convoyId: convoyId,
    paneIndex: paneIndex,
    role: options.role,
  };
}

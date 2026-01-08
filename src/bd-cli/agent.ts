// src/bd-cli/agent.ts
import { execBd, execBdJson } from './executor.ts';

export type AgentState = 'idle' | 'spawning' | 'running' | 'working' | 'stuck' | 'done' | 'stopped' | 'dead';
export type RoleName = 'mayor' | 'planner' | 'foreman' | 'polecat' | 'witness' | 'dog' | 'refinery' | 'prime';

export interface AgentCreateOptions {
  role: RoleName;
  convoyId?: string;
  roleInstance?: number;
}

export interface AgentBead {
  id: string;
  role: RoleName;
  roleInstance?: number;
  state: AgentState;
  lastActivity?: string;
}

interface BdAgentShowResult {
  id: string;
  title: string;
  labels?: string[];
  agent_state?: string;
  last_activity?: string;
  role_type?: string;
}

interface BdListResult {
  id: string;
  title: string;
  status: string;
  labels?: string[];
}

export async function createAgentBead(options: AgentCreateOptions): Promise<AgentBead> {
  const instanceStr = options.roleInstance ? `-${options.roleInstance}` : '';
  const title = `${options.role}${instanceStr}`;

  // Use 'task' type with agent labels since 'agent' type requires special db setup
  // The gt:agent label marks this as an agent bead, role:<name> identifies the role
  const labels = [`gt:agent`, `role:${options.role}`];

  const args = [
    'create',
    title,
    '--type', 'task',
    '--labels', labels.join(','),
    '--silent',
  ];

  if (options.convoyId) {
    args.push('--parent', options.convoyId);
  }

  const id = await execBd(args);

  return {
    id: id.trim(),
    role: options.role,
    roleInstance: options.roleInstance,
    state: 'idle',
  };
}

export async function setAgentState(agentId: string, state: AgentState): Promise<void> {
  await execBd(['agent', 'state', agentId, state]);
}

export async function getAgentState(agentId: string): Promise<AgentState> {
  const result = await execBdJson<BdAgentShowResult>(['agent', 'show', agentId]);
  return (result.agent_state as AgentState) || 'idle';
}

export async function updateHeartbeat(agentId: string): Promise<void> {
  await execBd(['agent', 'heartbeat', agentId]);
}

export async function getAgentBead(agentId: string): Promise<AgentBead> {
  const result = await execBdJson<BdAgentShowResult>(['agent', 'show', agentId]);

  // Try role_type first (from bd agent show), fallback to label parsing
  let role: RoleName = 'polecat';
  if (result.role_type) {
    role = result.role_type as RoleName;
  } else if (result.labels) {
    const roleLabel = result.labels.find((l) => l.startsWith('role:'));
    if (roleLabel) {
      role = roleLabel.split(':')[1] as RoleName;
    }
  }

  return {
    id: result.id,
    role,
    state: (result.agent_state as AgentState) || 'idle',
    lastActivity: result.last_activity,
  };
}

export async function listAgentBeads(convoyId?: string): Promise<AgentBead[]> {
  const args = ['list', '--label', 'gt:agent'];
  if (convoyId) {
    args.push('--parent', convoyId);
  }

  const results = await execBdJson<BdListResult[]>(args);

  // For each agent, we need to call getAgentBead to get the full state
  // but for listing, we'll use a simpler approach: parse labels and default state
  return results.map((r) => {
    const roleLabel = r.labels?.find((l) => l.startsWith('role:'));
    const role = (roleLabel?.split(':')[1] || 'polecat') as RoleName;

    return {
      id: r.id,
      role,
      state: 'idle' as AgentState, // Default; use getAgentBead for accurate state
    };
  });
}

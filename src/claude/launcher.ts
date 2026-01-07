import type { RoleName } from '../types.ts';
import { buildClaudeCommand, buildRolePrompt, type ClaudeCommandOptions } from './command.ts';
import { splitPane, createSession } from '../tmux/operations.ts';

export interface LaunchConfig {
  role: RoleName;
  roleInstance?: number;
  projectDir: string;
  bdPath: string;
  convoyName: string;
  task: string;
  checkpoint?: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
  agentsDir?: string; // Override agent directory
  mayorPaneIndex?: string; // Pane index where Mayor is running (for Prime Minister)
  primeMode?: boolean; // Whether Prime Minister mode is active (affects Mayor's prompt)
  dangerouslySkipPermissions?: boolean; // Skip all permission prompts (use with caution!)
}

/**
 * Get the gastown installation directory by resolving from import.meta.url.
 * This allows gastown to find its bundled agents regardless of where it's run from.
 */
export function getGastownInstallDir(): string {
  // import.meta.url is file:///path/to/src/claude/launcher.ts
  // We need to go up 2 levels to get the gastown root
  const url = new URL(import.meta.url);
  const filePath = url.pathname;
  // Go from src/claude/launcher.ts to gastown root
  const parts = filePath.split('/');
  parts.pop(); // remove launcher.ts
  parts.pop(); // remove claude
  parts.pop(); // remove src
  return parts.join('/');
}

/**
 * Get the agent directory, checking multiple locations in order:
 * 1. Explicitly provided agentsDir (must contain the agent file)
 * 2. Project-local .gastown/agents (for custom agents, if agent file exists)
 * 3. Gastown installation directory agents/ (bundled agents)
 *
 * @param projectDir - The project directory
 * @param role - The role to look for (e.g., 'mayor', 'polecat')
 * @param agentsDir - Optional explicit agent directory override
 */
export function getDefaultAgentDir(projectDir: string, role: string = 'mayor', agentsDir?: string): string {
  // If explicitly set, use it
  if (agentsDir) {
    return agentsDir;
  }

  // Check project-local agents first (only if the agent file exists)
  const projectAgentsDir = `${projectDir}/.gastown/agents`;
  const projectAgentFile = `${projectAgentsDir}/${role}.md`;
  try {
    const stat = Deno.statSync(projectAgentFile);
    if (stat.isFile) {
      return projectAgentsDir;
    }
  } catch {
    // Agent file doesn't exist in project, continue
  }

  // Fall back to gastown installation directory
  const installDir = getGastownInstallDir();
  return `${installDir}/.gastown/agents`;
}

export function getRoleAgentPath(role: RoleName, agentDir: string): string {
  return `${agentDir}/${role}.md`;
}

export function buildLaunchConfig(config: LaunchConfig): ClaudeCommandOptions {
  const agentDir = getDefaultAgentDir(config.projectDir, config.role, config.agentsDir);
  const prompt = buildRolePrompt(config.role, config.task, config.checkpoint, config.contextPath, config.primeMode);

  return {
    role: config.role,
    agentDir,
    bdPath: config.bdPath,
    convoyName: config.convoyName,
    contextPath: config.contextPath,
    mayorPaneIndex: config.mayorPaneIndex,
    prompt,
    resume: config.checkpoint !== undefined,
    workingDir: config.projectDir,
    dangerouslySkipPermissions: config.dangerouslySkipPermissions,
  };
}

export async function launchRole(
  sessionName: string,
  config: LaunchConfig,
  isFirstPane: boolean = false
): Promise<boolean> {
  const cmdOptions = buildLaunchConfig(config);
  const command = buildClaudeCommand(cmdOptions);

  if (isFirstPane) {
    return await createSession(sessionName, command);
  } else {
    return await splitPane(sessionName, command);
  }
}

export async function launchMayor(
  sessionName: string,
  projectDir: string,
  bdPath: string,
  convoyName: string,
  task: string,
  contextPath?: string,
  primeMode?: boolean
): Promise<boolean> {
  return await launchRole(
    sessionName,
    {
      role: 'mayor',
      projectDir,
      bdPath,
      convoyName,
      task,
      contextPath,
      primeMode,
    },
    true
  );
}

/**
 * Launch Prime Minister in a split pane after Mayor.
 * Prime Minister monitors Mayor's pane and answers questions from workers.
 *
 * @param sessionName - tmux session name
 * @param projectDir - project directory
 * @param bdPath - path to bd file
 * @param convoyName - convoy name
 * @param task - task description
 * @param contextPath - path to convoy-context.md (required for PM to answer questions)
 * @param mayorPaneIndex - pane index where Mayor is running (default: '0')
 */
export async function launchPrime(
  sessionName: string,
  projectDir: string,
  bdPath: string,
  convoyName: string,
  task: string,
  contextPath: string,
  mayorPaneIndex: string = '0'
): Promise<boolean> {
  return await launchRole(
    sessionName,
    {
      role: 'prime',
      projectDir,
      bdPath,
      convoyName,
      task,
      contextPath,
      mayorPaneIndex,
      dangerouslySkipPermissions: true, // PM operates autonomously without permission prompts
    },
    false // Not first pane - splits from existing session
  );
}

export async function launchWorker(
  sessionName: string,
  role: RoleName,
  roleInstance: number,
  projectDir: string,
  bdPath: string,
  convoyName: string,
  task: string,
  checkpoint?: string
): Promise<boolean> {
  return await launchRole(sessionName, {
    role,
    roleInstance,
    projectDir,
    bdPath,
    convoyName,
    task,
    checkpoint,
  });
}

export async function respawnWorker(
  sessionName: string,
  role: RoleName,
  roleInstance: number,
  projectDir: string,
  bdPath: string,
  convoyName: string,
  task: string,
  checkpoint: string
): Promise<boolean> {
  return await launchWorker(
    sessionName,
    role,
    roleInstance,
    projectDir,
    bdPath,
    convoyName,
    task,
    checkpoint
  );
}

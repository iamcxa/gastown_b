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
}

export function getDefaultAgentDir(projectDir: string): string {
  return `${projectDir}/.gastown/agents`;
}

export function getRoleAgentPath(role: RoleName, agentDir: string): string {
  return `${agentDir}/${role}.md`;
}

export function buildLaunchConfig(config: LaunchConfig): ClaudeCommandOptions {
  const agentDir = getDefaultAgentDir(config.projectDir);
  const prompt = buildRolePrompt(config.role, config.task, config.checkpoint);

  return {
    role: config.role,
    agentDir,
    bdPath: config.bdPath,
    convoyName: config.convoyName,
    prompt,
    resume: config.checkpoint !== undefined,
    workingDir: config.projectDir,
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
  task: string
): Promise<boolean> {
  return await launchRole(
    sessionName,
    {
      role: 'mayor',
      projectDir,
      bdPath,
      convoyName,
      task,
    },
    true
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

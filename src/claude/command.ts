import type { RoleName } from '../types.ts';

export interface ClaudeCommandOptions {
  role: RoleName;
  agentDir: string;
  bdPath: string;
  convoyName: string;
  prompt?: string;
  resume?: boolean;
  workingDir?: string;
  extraArgs?: string[];
}

export function buildAgentFlag(role: RoleName, agentDir: string): string {
  return `--agent ${agentDir}/${role}.md`;
}

export function buildClaudeEnvVars(
  role: RoleName,
  bdPath: string,
  convoyName: string
): Record<string, string> {
  return {
    GASTOWN_ROLE: role,
    GASTOWN_BD: bdPath,
    GASTOWN_CONVOY: convoyName,
  };
}

export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    agentDir,
    bdPath,
    convoyName,
    prompt,
    resume,
    workingDir,
    extraArgs = [],
  } = options;

  const envVars = buildClaudeEnvVars(role, bdPath, convoyName);
  const envString = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  const args: string[] = ['claude'];

  // Agent flag
  args.push(buildAgentFlag(role, agentDir));

  // Resume flag
  if (resume) {
    args.push('--resume');
  }

  // Prompt
  if (prompt) {
    args.push('--prompt', `"${prompt.replace(/"/g, '\\"')}"`);
  }

  // Extra args
  args.push(...extraArgs);

  // Build full command
  let command = `${envString} ${args.join(' ')}`;

  // Wrap with cd if working directory specified
  if (workingDir) {
    command = `cd ${workingDir} && ${command}`;
  }

  return command;
}

export function buildRolePrompt(role: RoleName, task: string, checkpoint?: string): string {
  const prompts: Record<RoleName, (task: string, checkpoint?: string) => string> = {
    mayor: (task) =>
      `You are the Mayor coordinating this convoy. The task is: "${task}". ` +
      `Read the bd file at $GASTOWN_BD to understand current state. ` +
      `Delegate to Planner for brainstorming, then Foreman for implementation planning.`,

    planner: (task) =>
      `You are the Planner. Use superpowers:brainstorming to design: "${task}". ` +
      `Update the bd file with your progress. Output design doc to docs/plans/.`,

    foreman: (task, checkpoint) =>
      checkpoint
        ? `You are the Foreman. Continue from checkpoint: "${checkpoint}". ` +
          `Read the design doc and create implementation tasks in the bd file.`
        : `You are the Foreman. Read the design doc and use superpowers:writing-plans ` +
          `to create detailed implementation tasks. Update the bd file with tasks.`,

    polecat: (task, checkpoint) =>
      checkpoint
        ? `You are Polecat (implementation). Continue from: "${checkpoint}". ` +
          `Update bd file with progress after each step.`
        : `You are Polecat (implementation). Your task: "${task}". ` +
          `Follow TDD. Update bd file with progress after each step.`,

    witness: (task) =>
      `You are Witness (code review). Review the implementation for: "${task}". ` +
      `Check code quality, tests, and adherence to patterns. Update bd file with findings.`,

    dog: (task) =>
      `You are Dog (testing). Run and verify tests for: "${task}". ` +
      `Ensure all tests pass. Update bd file with test results.`,

    refinery: (task) =>
      `You are Refinery (code quality). Audit and refactor: "${task}". ` +
      `Look for improvements, security issues, and code smells. Update bd file.`,
  };

  return prompts[role](task, checkpoint);
}

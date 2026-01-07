import type { RoleName } from '../types.ts';

/**
 * Escape a string for safe use in shell single quotes.
 * Uses the pattern: replace ' with '\'' (end quote, escaped quote, start quote)
 */
export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Escape a string for use in shell double quotes.
 * Escapes: $ ` \ " !
 */
export function shellEscapeDouble(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/!/g, '\\!');
}

export interface ClaudeCommandOptions {
  role: RoleName;
  agentDir: string;
  bdPath: string;
  convoyName: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
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
  convoyName: string,
  contextPath?: string
): Record<string, string> {
  const vars: Record<string, string> = {
    GASTOWN_ROLE: role,
    GASTOWN_BD: bdPath,
    GASTOWN_CONVOY: convoyName,
  };
  if (contextPath) {
    vars.GASTOWN_CONTEXT = contextPath;
  }
  return vars;
}

export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    agentDir,
    bdPath,
    convoyName,
    contextPath,
    prompt,
    resume,
    workingDir,
    extraArgs = [],
  } = options;

  const envVars = buildClaudeEnvVars(role, bdPath, convoyName, contextPath);
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

  // Prompt - pass as positional argument at the end
  // (added later after other args)

  // Extra args
  args.push(...extraArgs);

  // Prompt as positional argument (must be last)
  if (prompt) {
    args.push(shellEscape(prompt));
  }

  // Build full command
  let command = `${envString} ${args.join(' ')}`;

  // Wrap with cd if working directory specified
  if (workingDir) {
    command = `cd ${shellEscape(workingDir)} && ${command}`;
  }

  return command;
}

export function buildRolePrompt(role: RoleName, task: string, checkpoint?: string, contextPath?: string): string {
  const prompts: Record<RoleName, (task: string, checkpoint?: string, contextPath?: string) => string> = {
    mayor: (task, _checkpoint, contextPath) =>
      contextPath
        ? `You are the Mayor coordinating this convoy in AUTOPILOT MODE. The task is: "${task}". ` +
          `Read the context file at $GASTOWN_CONTEXT for pre-defined answers and decision principles. ` +
          `Read the bd file at $GASTOWN_BD for current state. Proceed without asking user unless blocked.`
        : `You are the Mayor coordinating this convoy. The task is: "${task}". ` +
          `Read the bd file at $GASTOWN_BD to understand current state. ` +
          `Delegate to Planner for brainstorming, then Foreman for implementation planning.`,

    planner: (task) =>
      `You are the Planner. Use superpowers:brainstorming to design: "${task}". ` +
      `Update the bd file with your progress. Output design doc to docs/plans/.`,

    foreman: (_task, checkpoint) =>
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

    prime: (task, _checkpoint, contextPath) =>
      contextPath
        ? `You are the Prime Minister in AUTONOMOUS MODE. The task is: "${task}". ` +
          `Read the context file at $GASTOWN_CONTEXT for decision principles. ` +
          `Read the bd file at $GASTOWN_BD for current state and pending questions. ` +
          `Answer questions from workers based on context and your judgment.`
        : `You are the Prime Minister. The task is: "${task}". ` +
          `Read the bd file at $GASTOWN_BD to understand current state and pending questions. ` +
          `Answer questions from workers to unblock them. Use your judgment when context is insufficient.`,
  };

  return prompts[role](task, checkpoint, contextPath);
}

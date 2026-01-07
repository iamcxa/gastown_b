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

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface ClaudeCommandOptions {
  role: RoleName;
  agentDir: string;
  bdPath: string;
  convoyName: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
  mayorPaneIndex?: string; // Pane index where Mayor is running (for Prime Minister)
  prompt?: string;
  resume?: boolean;
  workingDir?: string;
  extraArgs?: string[];
  dangerouslySkipPermissions?: boolean; // Skip all permission prompts (use with caution!)
  model?: ClaudeModel; // Model to use (opus, sonnet, haiku). Default: sonnet
  allowedTools?: string[]; // Pre-approved tools (e.g., 'Edit:*.bd', 'Read:*.bd')
}

export function buildAgentFlag(role: RoleName, agentDir: string): string {
  return `--agent ${agentDir}/${role}.md`;
}

export function buildClaudeEnvVars(
  role: RoleName,
  bdPath: string,
  convoyName: string,
  contextPath?: string,
  mayorPaneIndex?: string
): Record<string, string> {
  const vars: Record<string, string> = {
    GASTOWN_ROLE: role,
    GASTOWN_BD: bdPath,
    GASTOWN_CONVOY: convoyName,
  };
  if (contextPath) {
    vars.GASTOWN_CONTEXT = contextPath;
  }
  if (mayorPaneIndex !== undefined) {
    vars.GASTOWN_MAYOR_PANE = mayorPaneIndex;
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
    mayorPaneIndex,
    prompt,
    resume,
    workingDir,
    extraArgs = [],
    dangerouslySkipPermissions,
    model,
    allowedTools = [],
  } = options;

  const envVars = buildClaudeEnvVars(role, bdPath, convoyName, contextPath, mayorPaneIndex);
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

  // Dangerously skip permissions flag (for autonomous operation)
  if (dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  // Model flag (opus, sonnet, haiku)
  if (model) {
    args.push(`--model ${model}`);
  }

  // Allowed tools flag (pre-approved tools, e.g., 'Edit:*.bd', 'Read:*.bd')
  if (allowedTools.length > 0) {
    for (const tool of allowedTools) {
      args.push(`--allowedTools ${shellEscape(tool)}`);
    }
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

/**
 * Build the Prime Minister prompt.
 * Keep it SHORT - detailed instructions are in the agent .md file.
 */
export function buildPrimePrompt(task: string, contextPath?: string, mayorPaneIndex?: string): string {
  const paneIndex = mayorPaneIndex ?? '0';

  // Short prompt - agent file has detailed workflow
  return `Convoy task: "${task}". Mayor pane: ${paneIndex}. ${contextPath ? 'Context: $GASTOWN_CONTEXT. ' : ''}BD: $GASTOWN_BD. Start monitoring now.`;
}

/**
 * Build Mayor prompt when Prime Minister mode is active.
 * Keep it SHORT - detailed instructions are in the agent .md file.
 */
export function buildPrimeMayorPrompt(task: string, _contextPath?: string): string {
  // Short prompt - agent file has detailed workflow
  return `Convoy task: "${task}". PM mode ACTIVE - write questions to $GASTOWN_BD. Read bd file to start.`;
}

/**
 * Build role-specific prompts for convoy workers.
 *
 * @param role - The role to build prompt for
 * @param task - The convoy task
 * @param checkpoint - Optional checkpoint for resuming
 * @param contextPath - Optional context file path
 * @param primeMode - Whether Prime Minister mode is active (affects Mayor prompt)
 */
export function buildRolePrompt(
  role: RoleName,
  task: string,
  checkpoint?: string,
  contextPath?: string,
  primeMode?: boolean
): string {
  // Prime role uses dedicated prompt builder
  if (role === 'prime') {
    return buildPrimePrompt(task, contextPath);
  }

  // Mayor in prime mode uses PM-aware prompt
  if (role === 'mayor' && primeMode) {
    return buildPrimeMayorPrompt(task, contextPath);
  }

  // Keep prompts SHORT - detailed instructions are in agent .md files
  const prompts: Record<RoleName, (task: string, checkpoint?: string, contextPath?: string) => string> = {
    mayor: (task, _checkpoint, contextPath) =>
      contextPath
        ? `Task: "${task}". AUTOPILOT MODE. Context: $GASTOWN_CONTEXT. BD: $GASTOWN_BD. Start now.`
        : `Task: "${task}". BD: $GASTOWN_BD. Read bd file and start coordinating.`,

    planner: (task) =>
      `Task: "${task}". BD: $GASTOWN_BD. Design and output to docs/plans/.`,

    foreman: (_task, checkpoint) =>
      checkpoint
        ? `Continue from: "${checkpoint}". BD: $GASTOWN_BD. Create tasks.`
        : `BD: $GASTOWN_BD. Read design doc and create implementation tasks.`,

    polecat: (task, checkpoint) =>
      checkpoint
        ? `Continue from: "${checkpoint}". BD: $GASTOWN_BD.`
        : `Task: "${task}". BD: $GASTOWN_BD. Follow TDD.`,

    witness: (task) =>
      `Review: "${task}". BD: $GASTOWN_BD.`,

    dog: (task) =>
      `Test: "${task}". BD: $GASTOWN_BD.`,

    refinery: (task) =>
      `Audit: "${task}". BD: $GASTOWN_BD.`,

    prime: (task, _checkpoint, contextPath) =>
      // This is a fallback - should use buildPrimePrompt() instead
      buildPrimePrompt(task, contextPath),
  };

  return prompts[role](task, checkpoint, contextPath);
}

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
  mayorPaneIndex?: string; // Pane index where Mayor is running (for Prime Minister)
  prompt?: string;
  resume?: boolean;
  workingDir?: string;
  extraArgs?: string[];
  dangerouslySkipPermissions?: boolean; // Skip all permission prompts (use with caution!)
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
 * Build the Prime Minister prompt with detailed workflow instructions.
 *
 * PM monitors Mayor's pane, answers questions from context, and escalates to human when uncertain.
 */
export function buildPrimePrompt(task: string, contextPath?: string, mayorPaneIndex?: string): string {
  const paneIndex = mayorPaneIndex ?? '0';

  return `You are the Prime Minister (PM) - the human's decision proxy for this convoy.

## Your Mission
The convoy task is: "${task}"
Your role is to answer Mayor's questions based on context and decision principles, so the convoy can proceed autonomously.

## Environment
- Context file: ${contextPath ? '$GASTOWN_CONTEXT' : '(not provided - use your judgment)'}
- BD file: $GASTOWN_BD
- Mayor's pane index: ${paneIndex}
- Your tmux session: $GASTOWN_CONVOY (or use 'gastown-' prefix)

## PM Workflow

### 1. On Start
${contextPath ? `- Read the context file at $GASTOWN_CONTEXT
- Load decision principles into memory` : `- No context file provided - use general best practices`}
- Read the bd file at $GASTOWN_BD for current state
- Begin monitoring Mayor's pane for questions

### 2. Monitoring Mayor's Pane
Use tmux capture-pane to read Mayor's output:
\`\`\`bash
tmux capture-pane -t "$GASTOWN_CONVOY:0.${paneIndex}" -p -l 100
\`\`\`
Poll every 2-3 seconds for new questions.

### 3. Question Detection
Look for:
- Lines ending with "?"
- Keywords: "which", "should", "how", "what", "prefer", "recommend"
- Explicit markers: "pending-question:" in bd file
- Decision points: "Option A vs Option B"

### 4. Answering Questions

**Confidence Levels:**

| Level | Meaning | Action |
|-------|---------|--------|
| **high** | Direct match in context file | Answer immediately: "📗 From context: [answer]" |
| **medium** | Inferred from principles | Answer with reasoning: "🧠 Inferred: [answer] (based on [principle])" |
| **low** | Weak inference, could be wrong | Escalate: "👑 Need your decision: [question]" |
| **none** | No idea, not covered | Must ask human |

**Answer Format in BD File:**
\`\`\`
answer: |
  [Your answer here]
answer-from: prime
answer-at: [ISO timestamp]
answer-confidence: high|medium
answer-reasoning: [Why you're confident]
\`\`\`

### 5. Escalating to Human
When confidence is low or none:
- Log: "👑 Need your decision: [question]"
- Wait for human input in this pane
- When human responds, write to bd file with answer-from: human

### 6. Decision Logging
After each answer, append to decision-log in bd file:
\`\`\`
decision-log:
  - q: [question]
    a: [answer]
    source: context|inferred|human
    confidence: high|medium|low
\`\`\`

## Important Rules
- Do NOT ask the user directly unless confidence is low/none
- Always provide reasoning for medium-confidence answers
- Update the bd file after each decision
- Keep monitoring - Mayor may have multiple questions
- If Mayor writes "pending-question:" to bd file, prioritize that over pane scanning`;
}

/**
 * Build Mayor prompt when Prime Minister mode is active.
 *
 * Mayor should write questions to bd file and wait for PM's answers.
 */
export function buildPrimeMayorPrompt(task: string, _contextPath?: string): string {
  return `You are the Mayor coordinating this convoy. The task is: "${task}".

## IMPORTANT: Prime Minister Mode is ACTIVE

Prime Minister (PM) is running in a separate pane to handle decisions.
You do NOT ask the user directly. Instead:

### Asking Questions

1. **Write questions to the bd file** at $GASTOWN_BD:
\`\`\`
pending-question: |
  [Your question here - be specific and provide context]
question-type: decision|clarification|approval
question-options:
  - Option A (with brief explanation)
  - Option B (with brief explanation)
question-from: mayor
question-at: [ISO timestamp]
\`\`\`

2. **Wait for PM's answer** - poll the bd file for "answer:" field
3. **Proceed** once you see the answer

### Example Flow
\`\`\`
# You write:
pending-question: |
  Which authentication provider should we use?
  Context: We need user login for the admin panel.
question-type: decision
question-options:
  - Supabase Auth (integrates with our stack)
  - Firebase Auth (more features)
  - Custom JWT (more control)
question-from: mayor

# Wait... PM responds:
answer: |
  Use Supabase Auth.
  Reasoning: Integrates with existing Supabase setup.
answer-from: prime
answer-confidence: high

# You proceed with Supabase Auth
\`\`\`

### Key Rules
- Do NOT ask the user directly - PM handles all decisions
- Do NOT use AskFollowupQuestion tool - write to bd file instead
- Always provide question-options when asking for a decision
- Wait for answer before proceeding with decisions
- Clear the pending-question after receiving answer

### Normal Mayor Duties
- Read the bd file at $GASTOWN_BD to understand current state
- Delegate to Planner for brainstorming, then Foreman for implementation
- Update the bd file with convoy progress
- Coordinate workers and track task completion`;
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
      // This is a fallback - should use buildPrimePrompt() instead
      buildPrimePrompt(task, contextPath),
  };

  return prompts[role](task, checkpoint, contextPath);
}

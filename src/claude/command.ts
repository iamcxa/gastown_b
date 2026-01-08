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
  convoyId: string;
  convoyName: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
  mayorPaneIndex?: string; // Pane index where Mayor is running (for Prime Minister)
  agentId?: string; // Agent's own bead ID for lifecycle tracking
  gastownBinPath?: string; // Absolute path to gastown binary for spawning agents
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
  convoyId: string,
  convoyName: string,
  contextPath?: string,
  mayorPaneIndex?: string,
  agentId?: string,
  gastownBinPath?: string
): Record<string, string> {
  const vars: Record<string, string> = {
    GASTOWN_ROLE: role,
    GASTOWN_BD: convoyId,
    GASTOWN_CONVOY: convoyName,
    // Full tmux session name (gastown-{convoyId})
    GASTOWN_SESSION: `gastown-${convoyId}`,
  };
  // Path to gastown binary for spawning agents
  if (gastownBinPath) {
    vars.GASTOWN_BIN = gastownBinPath;
  }
  if (contextPath) {
    vars.GASTOWN_CONTEXT = contextPath;
  }
  if (mayorPaneIndex !== undefined) {
    vars.GASTOWN_MAYOR_PANE = mayorPaneIndex;
  }
  if (agentId) {
    vars.GASTOWN_AGENT_ID = agentId;
  }
  return vars;
}

export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    agentDir,
    convoyId,
    convoyName,
    contextPath,
    mayorPaneIndex,
    agentId,
    gastownBinPath,
    prompt,
    resume,
    workingDir,
    extraArgs = [],
    dangerouslySkipPermissions,
  } = options;

  const envVars = buildClaudeEnvVars(role, convoyId, convoyName, contextPath, mayorPaneIndex, agentId, gastownBinPath);
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
 * PM monitors bd comments for questions and answers via bd CLI.
 * PM is a PASSIVE MONITOR - it does NOT do any task work itself.
 */
export function buildPrimePrompt(task: string, contextPath?: string, mayorPaneIndex?: string): string {
  const paneIndex = mayorPaneIndex ?? '0';

  return `You are the Prime Minister (PM) - the human's DECISION PROXY for this convoy.

## CRITICAL: You Are a PASSIVE MONITOR

**DO NOT:**
- Investigate or understand the task itself
- Search for code, files, or documentation related to the task
- Do any implementation or planning work
- Act like a worker agent

**YOUR ONLY JOB:**
- Monitor for QUESTION comments from Mayor
- Answer questions or escalate to human
- Auto-approve Mayor's permission prompts

The convoy task is "${task}" - but YOU DO NOT WORK ON IT.
Mayor and other agents work on the task. You just answer their questions.

## Environment
- Context file: ${contextPath ? '$GASTOWN_CONTEXT' : '(not provided - use your judgment)'}
- Convoy ID: $GASTOWN_BD
- tmux session: $GASTOWN_SESSION (full session name, e.g., gastown-abc123)
- Mayor's pane index: ${paneIndex}

## PM Workflow

### 1. On Start (Do These Steps ONLY)
1. Display your greeting (character art from prime.md)
${contextPath ? `2. Read the context file at $GASTOWN_CONTEXT and load decision principles
3. Log: "📄 Context loaded: [X] Q&As, [Y] decision principles"` : `2. No context file - will use general best practices`}
${contextPath ? '4' : '3'}. **Wait for Mayor's pane to be ready** (2-3 seconds)
${contextPath ? '5' : '4'}. Begin the monitoring loop (step 2 below)

**IMPORTANT:**
- Do NOT explore the codebase, search for task-related info, or try to understand the task.
- If tmux capture-pane fails initially, wait a few seconds and retry - Mayor may still be starting up.

### 2. Monitoring Loop (Your Main Job)
Run this loop continuously:
\`\`\`bash
# Check for QUESTION comments every 2-3 seconds
bd comments $GASTOWN_BD

# Also check Mayor's pane for permission prompts
tmux capture-pane -t "$GASTOWN_SESSION:0.${paneIndex}" -p -S -30
\`\`\`

If you see a QUESTION: comment → go to step 3
If you see a permission prompt → go to step 6
Otherwise → wait 2-3 seconds and check again

### 3. Question Detection
Look for bd comments with:
- \`QUESTION [decision]:\` - Choose between options
- \`QUESTION [clarification]:\` - Need more info
- \`QUESTION [approval]:\` - Confirm before proceeding

### 4. Answering Questions

**Confidence Levels:**

| Level | Meaning | Action |
|-------|---------|--------|
| **high** | Direct match in context file | Answer immediately |
| **medium** | Inferred from principles | Answer with reasoning |
| **low** | Weak inference, could be wrong | Escalate to human |
| **none** | No idea, not covered | Must ask human |

**Answer via bd CLI:**
\`\`\`bash
bd comments add $GASTOWN_BD "ANSWER [high]: Use Supabase Auth.
Reasoning: Integrates with existing Supabase setup (from context)."
\`\`\`

### 5. Escalating to Human
When confidence is low or none:
\`\`\`bash
bd comments add $GASTOWN_BD "ESCALATE: Need human decision on [question]"
\`\`\`
- Display: "👑 Need your decision: [question]"
- Wait for human input in this pane
- When human responds, write answer via bd CLI

### 6. Permission Proxy (Auto-Approve Mayor's Tools)
When you see permission prompts in Mayor's pane:
- Type A (\`[Y/n]\`, \`Allow Edit/Write/Bash\`): Send \`y\` Enter
- Type B (numbered with "don't ask again"): Send \`2\` Enter

\`\`\`bash
# For Type A:
tmux send-keys -t "$GASTOWN_SESSION:0.${paneIndex}" "y" Enter

# For Type B (MCP/plugin prompts):
tmux send-keys -t "$GASTOWN_SESSION:0.${paneIndex}" "2" Enter
\`\`\`

## Important Rules
- **DO NOT** investigate or work on the task itself
- **DO NOT** search the codebase or external resources
- **DO** stay in the monitoring loop
- **DO** answer questions from context/principles or escalate
- **DO** auto-approve permission prompts for Mayor
- Use bd comments for ALL communication with Mayor`;
}

/**
 * Build Mayor prompt when Prime Minister mode is active.
 *
 * Mayor should write questions via bd CLI and wait for PM's answers.
 */
export function buildPrimeMayorPrompt(task: string, _contextPath?: string): string {
  return `You are the Mayor coordinating this convoy. The task is: "${task}".

## IMPORTANT: Prime Minister Mode is ACTIVE

Prime Minister (PM) is running in a separate pane to handle decisions.
You do NOT ask the user directly. Instead:

### Asking Questions via bd CLI

1. **Write questions as bd comments**:
\`\`\`bash
bd comments add $GASTOWN_BD "QUESTION [decision]: Which authentication provider should we use?
OPTIONS:
- Supabase Auth (integrates with our stack)
- Firebase Auth (more features)
- Custom JWT (more control)"
\`\`\`

2. **Wait for PM's answer** - poll via: \`bd comments $GASTOWN_BD\`
3. **Proceed** once you see \`ANSWER [confidence]:\` comment

### Example Flow
\`\`\`bash
# You write a question:
bd comments add $GASTOWN_BD "QUESTION [decision]: Which auth provider?
OPTIONS:
- Supabase Auth
- Firebase Auth"

# Poll for answer:
bd comments $GASTOWN_BD

# PM responds with comment:
# ANSWER [high]: Use Supabase Auth.
# Reasoning: Integrates with existing Supabase setup.

# You proceed with Supabase Auth
\`\`\`

### Question Types
- \`QUESTION [decision]:\` - Choose between options (PM can decide)
- \`QUESTION [clarification]:\` - Need more info (PM may ask human)
- \`QUESTION [approval]:\` - Confirm before proceeding (usually needs human)

### Key Rules
- Do NOT ask the user directly - PM handles all decisions
- Do NOT use AskFollowupQuestion tool - use bd comments instead
- Always provide OPTIONS when asking for a decision
- Wait for ANSWER comment before proceeding
- Use \`gastown spawn\` to delegate work to specialists

### Normal Mayor Duties
- Check state via: \`bd show $GASTOWN_BD\`
- Spawn planner: \`gastown spawn planner --task "Design: ..."\`
- Spawn foreman: \`gastown spawn foreman --task "Create tasks from ..."\`
- Update progress via: \`bd comments add $GASTOWN_BD "PROGRESS: ..."\`
- Monitor agents via: \`bd list --label gt:agent --parent $GASTOWN_BD\``;
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
          `Check state via: bd show $GASTOWN_BD. Proceed without asking user unless blocked.`
        : `You are the Mayor coordinating this convoy. The task is: "${task}". ` +
          `Check state via: bd show $GASTOWN_BD. ` +
          `Delegate to Planner for brainstorming, then Foreman for implementation planning.`,

    planner: (task) =>
      `You are the Planner. Use superpowers:brainstorming to design: "${task}". ` +
      `Update progress via: bd comments add $GASTOWN_BD "...". Output design doc to docs/plans/.`,

    foreman: (_task, checkpoint) =>
      checkpoint
        ? `You are the Foreman. Continue from checkpoint: "${checkpoint}". ` +
          `Read the design doc and create implementation tasks via bd CLI.`
        : `You are the Foreman. Read the design doc and use superpowers:writing-plans ` +
          `to create detailed implementation tasks. Update via: bd comments add $GASTOWN_BD "..."`,

    polecat: (task, checkpoint) =>
      checkpoint
        ? `You are Polecat (implementation). Continue from: "${checkpoint}". ` +
          `Update progress via: bd comments add $GASTOWN_BD "..."`
        : `You are Polecat (implementation). Your task: "${task}". ` +
          `Follow TDD. Update progress via: bd comments add $GASTOWN_BD "..."`,

    witness: (task) =>
      `You are Witness (code review). Review the implementation for: "${task}". ` +
      `Check code quality, tests, and adherence to patterns. Log via: bd comments add $GASTOWN_BD "..."`,

    dog: (task) =>
      `You are Dog (testing). Run and verify tests for: "${task}". ` +
      `Ensure all tests pass. Log results via: bd comments add $GASTOWN_BD "..."`,

    refinery: (task) =>
      `You are Refinery (code quality). Audit and refactor: "${task}". ` +
      `Look for improvements, security issues, and code smells. Log via: bd comments add $GASTOWN_BD "..."`,

    prime: (task, _checkpoint, contextPath) =>
      // This is a fallback - should use buildPrimePrompt() instead
      buildPrimePrompt(task, contextPath),
  };

  return prompts[role](task, checkpoint, contextPath);
}

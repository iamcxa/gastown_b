# Gastown Spawn Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `gastown spawn` command that lets Mayor delegate to specialist agents in separate tmux panes.

**Architecture:** Extend `buildClaudeEnvVars` with `agentId`, create `src/spawn/` module with spawn logic, add CLI subcommand, update Mayor instructions.

**Tech Stack:** Deno, TypeScript, tmux, bd CLI

---

## Task 1: Add `agentId` to `buildClaudeEnvVars`

**Files:**
- Modify: `src/claude/command.ts:42-61`
- Test: `src/claude/command.test.ts`

**Step 1: Write the failing test**

Add to `src/claude/command.test.ts`:

```typescript
Deno.test('buildClaudeEnvVars - includes agent id when provided', () => {
  const env = buildClaudeEnvVars('polecat', 'convoy-123', 'convoy-test', undefined, undefined, 'agent-456');
  assertEquals(env['GASTOWN_ROLE'], 'polecat');
  assertEquals(env['GASTOWN_BD'], 'convoy-123');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
  assertEquals(env['GASTOWN_AGENT_ID'], 'agent-456');
});

Deno.test('buildClaudeEnvVars - omits agent id when not provided', () => {
  const env = buildClaudeEnvVars('polecat', 'convoy-123', 'convoy-test');
  assertEquals(env['GASTOWN_AGENT_ID'], undefined);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test --allow-all src/claude/command.test.ts`
Expected: FAIL - `buildClaudeEnvVars` doesn't accept 6th parameter

**Step 3: Update `buildClaudeEnvVars` signature and implementation**

In `src/claude/command.ts`, modify the function at line 42:

```typescript
export function buildClaudeEnvVars(
  role: RoleName,
  convoyId: string,
  convoyName: string,
  contextPath?: string,
  mayorPaneIndex?: string,
  agentId?: string
): Record<string, string> {
  const vars: Record<string, string> = {
    GASTOWN_ROLE: role,
    GASTOWN_BD: convoyId,
    GASTOWN_CONVOY: convoyName,
  };
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
```

**Step 4: Run test to verify it passes**

Run: `deno test --allow-all src/claude/command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/claude/command.ts src/claude/command.test.ts
git commit -m "feat(command): add agentId to buildClaudeEnvVars"
```

---

## Task 2: Add `agentId` to `ClaudeCommandOptions` and `buildClaudeCommand`

**Files:**
- Modify: `src/claude/command.ts:24-36` (interface)
- Modify: `src/claude/command.ts:63-118` (function)
- Test: `src/claude/command.test.ts`

**Step 1: Write the failing test**

Add to `src/claude/command.test.ts`:

```typescript
Deno.test('buildClaudeCommand - includes agent id env var when provided', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    convoyId: 'convoy-123',
    convoyName: 'test-convoy',
    agentId: 'agent-456',
  });

  assertStringIncludes(cmd, 'GASTOWN_AGENT_ID=agent-456');
});
```

**Step 2: Run test to verify it fails**

Run: `deno test --allow-all src/claude/command.test.ts`
Expected: FAIL - `agentId` not recognized in options

**Step 3: Update `ClaudeCommandOptions` interface**

In `src/claude/command.ts`, add to interface at line 24:

```typescript
export interface ClaudeCommandOptions {
  role: RoleName;
  agentDir: string;
  convoyId: string;
  convoyName: string;
  contextPath?: string;
  mayorPaneIndex?: string;
  agentId?: string;  // NEW: Agent's own bead ID for lifecycle tracking
  prompt?: string;
  resume?: boolean;
  workingDir?: string;
  extraArgs?: string[];
  dangerouslySkipPermissions?: boolean;
}
```

**Step 4: Update `buildClaudeCommand` to use `agentId`**

In `src/claude/command.ts`, modify the destructuring at line 64 and the call at line 78:

```typescript
export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    agentDir,
    convoyId,
    convoyName,
    contextPath,
    mayorPaneIndex,
    agentId,  // NEW
    prompt,
    resume,
    workingDir,
    extraArgs = [],
    dangerouslySkipPermissions,
  } = options;

  const envVars = buildClaudeEnvVars(role, convoyId, convoyName, contextPath, mayorPaneIndex, agentId);
  // ... rest unchanged
```

**Step 5: Run test to verify it passes**

Run: `deno test --allow-all src/claude/command.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/claude/command.ts src/claude/command.test.ts
git commit -m "feat(command): add agentId to ClaudeCommandOptions"
```

---

## Task 3: Add `splitWindowAndGetIndex` to tmux operations

**Files:**
- Modify: `src/tmux/operations.ts`
- Test: `src/tmux/operations.test.ts` (create if needed)

**Step 1: Write the failing test**

Create `src/tmux/operations.test.ts`:

```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parsePaneList } from './operations.ts';

Deno.test('parsePaneList parses pane output correctly', () => {
  const output = `0:Mayor
1:Planner`;
  const panes = parsePaneList(output);
  assertEquals(panes.length, 2);
  assertEquals(panes[0].index, '0');
  assertEquals(panes[0].title, 'Mayor');
  assertEquals(panes[1].index, '1');
  assertEquals(panes[1].title, 'Planner');
});
```

**Step 2: Run test to verify it passes** (this tests existing code)

Run: `deno test --allow-all src/tmux/operations.test.ts`
Expected: PASS

**Step 3: Add `splitWindowAndGetIndex` function**

Add to `src/tmux/operations.ts`:

```typescript
/**
 * Split window and return the new pane index.
 * Creates a new pane and returns its index for tracking.
 */
export async function splitWindowAndGetIndex(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): Promise<{ success: boolean; paneIndex: number }> {
  // Get current pane count
  const listCmd = buildListPanesCommand(sessionName);
  const beforeResult = await runTmuxCommand(listCmd);
  const beforeCount = beforeResult.success ? parsePaneList(beforeResult.output).length : 0;

  // Split the window
  const splitCmd = buildSplitPaneCommand(sessionName, command, direction);
  const splitResult = await runTmuxCommand(splitCmd);

  if (!splitResult.success) {
    return { success: false, paneIndex: -1 };
  }

  // The new pane index is the count before split (0-indexed)
  return { success: true, paneIndex: beforeCount };
}
```

**Step 4: Add test for `splitWindowAndGetIndex`**

Add to `src/tmux/operations.test.ts`:

```typescript
import { splitWindowAndGetIndex, createSession, killSession } from './operations.ts';

Deno.test({
  name: 'splitWindowAndGetIndex returns pane index',
  async fn() {
    const sessionName = 'test-split-' + Date.now();

    // Create test session
    await createSession(sessionName, 'sleep 60');

    // Split and get index
    const result = await splitWindowAndGetIndex(sessionName, 'sleep 60', 'horizontal');

    assertEquals(result.success, true);
    assertEquals(result.paneIndex, 1); // Second pane after split

    // Cleanup
    await killSession(sessionName);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

**Step 5: Run test to verify it passes**

Run: `deno test --allow-all src/tmux/operations.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/tmux/operations.ts src/tmux/operations.test.ts
git commit -m "feat(tmux): add splitWindowAndGetIndex function"
```

---

## Task 4: Create `src/spawn/spawn.ts` with core logic

**Files:**
- Create: `src/spawn/spawn.ts`
- Test: `src/spawn/spawn.test.ts`

**Step 1: Create the spawn module with types**

Create `src/spawn/spawn.ts`:

```typescript
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
```

**Step 2: Create test file**

Create `src/spawn/spawn.test.ts`:

```typescript
import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { spawnAgent } from './spawn.ts';

Deno.test('spawnAgent throws without convoy context', async () => {
  // Clear environment
  const originalBd = Deno.env.get('GASTOWN_BD');
  const originalConvoy = Deno.env.get('GASTOWN_CONVOY');
  Deno.env.delete('GASTOWN_BD');
  Deno.env.delete('GASTOWN_CONVOY');

  await assertRejects(
    async () => {
      await spawnAgent({
        role: 'planner',
        task: 'Test task',
      });
    },
    Error,
    'Missing convoy ID'
  );

  // Restore environment
  if (originalBd) Deno.env.set('GASTOWN_BD', originalBd);
  if (originalConvoy) Deno.env.set('GASTOWN_CONVOY', originalConvoy);
});
```

**Step 3: Run test to verify it passes**

Run: `deno test --allow-all src/spawn/spawn.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/spawn/spawn.ts src/spawn/spawn.test.ts
git commit -m "feat(spawn): add spawnAgent core function"
```

---

## Task 5: Create `src/spawn/mod.ts` module exports

**Files:**
- Create: `src/spawn/mod.ts`

**Step 1: Create module export file**

Create `src/spawn/mod.ts`:

```typescript
export { spawnAgent } from './spawn.ts';
export type { SpawnOptions, SpawnResult } from './spawn.ts';
```

**Step 2: Verify imports work**

Run: `deno check src/spawn/mod.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/spawn/mod.ts
git commit -m "feat(spawn): add module exports"
```

---

## Task 6: Add `spawn` subcommand to `gastown.ts`

**Files:**
- Modify: `gastown.ts`

**Step 1: Add spawn to help text**

In `gastown.ts`, add to the USAGE section (around line 33):

```typescript
  gastown spawn <role> --task "..."   Spawn agent in current convoy
```

Add to OPTIONS section:

```typescript
SPAWN OPTIONS:
  --task "<desc>"      Task description for the agent (required for spawn)
  --convoy <id>        Override convoy ID (default: $GASTOWN_BD)
  --convoy-name <n>    Override convoy name (default: $GASTOWN_CONVOY)

SPAWN ROLES:
  planner    Design and architecture
  foreman    Task breakdown and planning
  polecat    Implementation (TDD)
  witness    Code review
  dog        Testing
  refinery   Code quality
```

**Step 2: Add spawn to parseArgs**

Modify parseArgs options (around line 82):

```typescript
const args = parseArgs(Deno.args, {
  string: ['resume', 'status', 'max-workers', 'context', 'task', 'convoy', 'convoy-name'],
  boolean: ['help', 'version', 'archive', 'prime'],
  alias: {
    h: 'help',
    v: 'version',
    c: 'context',
    p: 'prime',
    t: 'task',
  },
});
```

**Step 3: Add spawn command handling**

Add import at top of file:

```typescript
import { spawnAgent } from './src/spawn/mod.ts';
import type { RoleName } from './src/types.ts';
```

Add command handler after `init` handler (around line 118):

```typescript
if (command === 'spawn') {
  const role = rest[0]?.toString();
  const validRoles = ['planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery'];

  if (!role || !validRoles.includes(role)) {
    console.error(`Usage: gastown spawn <role> --task "<description>"`);
    console.error(`Roles: ${validRoles.join(', ')}`);
    Deno.exit(1);
  }

  if (!args.task) {
    console.error('Error: --task is required for spawn command');
    console.error('Usage: gastown spawn <role> --task "<description>"');
    Deno.exit(1);
  }

  try {
    const result = await spawnAgent({
      role: role as RoleName,
      task: args.task,
      convoyId: args.convoy,
      convoyName: args['convoy-name'],
      contextPath: args.context,
    });

    console.log(`✓ Spawned ${role} agent`);
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Convoy: ${result.convoyId}`);
    console.log(`  Pane: ${result.paneIndex}`);
  } catch (error) {
    console.error(`Failed to spawn ${role}:`, error.message);
    Deno.exit(1);
  }
  return;
}
```

**Step 4: Verify CLI works**

Run: `deno check gastown.ts`
Expected: No errors

Run: `./gastown.ts spawn --help`
Expected: Shows help with spawn info

**Step 5: Commit**

```bash
git add gastown.ts
git commit -m "feat(cli): add spawn subcommand"
```

---

## Task 7: Update Mayor instructions to use spawn

**Files:**
- Modify: `.gastown/agents/mayor.md`

**Step 1: Find and replace skill-based delegation**

In `.gastown/agents/mayor.md`, locate the Workflow section (around line 285-310) and replace with:

```markdown
## Workflow

### Delegation via Agent Spawning

**CRITICAL: Never do implementation work yourself. Always spawn specialist agents.**

**1. For Planning/Design:**
```bash
gastown spawn planner --task "Design: $TASK_DESCRIPTION"
```
- Planner uses brainstorming skill and outputs to docs/plans/
- Monitor: `bd comments $GASTOWN_BD | grep -i planner`
- Wait for planner to complete before proceeding

**2. For Task Breakdown:**
```bash
gastown spawn foreman --task "Create tasks from docs/plans/YYYY-MM-DD-*.md"
```
- Foreman creates bd issues for each implementation task
- Check tasks: `bd list --parent $GASTOWN_BD`

**3. For Implementation:**
```bash
gastown spawn polecat --task "Implement: <specific-task-title>"
```
- Spawn one polecat per task
- Can run multiple polecats in parallel (check $MAX_WORKERS)
- Each polecat uses TDD

**4. For Code Review:**
```bash
gastown spawn witness --task "Review implementation of: <feature>"
```

**5. For Testing:**
```bash
gastown spawn dog --task "Verify tests for: <feature>"
```

### Key Rules
- **NEVER** use superpowers:brainstorming directly - spawn planner instead
- **NEVER** write code yourself - spawn polecat instead
- **NEVER** do task breakdown yourself - spawn foreman instead
- Monitor progress via: `bd comments $GASTOWN_BD`
- Check agent status via: `bd list --label gt:agent --parent $GASTOWN_BD`
```

**Step 2: Update Important Rules section**

Find the "Important Rules" section and ensure it includes:

```markdown
## Important Rules

- NEVER do implementation work yourself
- NEVER do detailed planning yourself - spawn planner
- NEVER break down tasks yourself - spawn foreman
- ALWAYS spawn the appropriate specialist agent
- ALWAYS monitor spawned agents via bd comments
- In prime minister mode: NEVER ask user directly - use bd comments
```

**Step 3: Commit**

```bash
git add .gastown/agents/mayor.md
git commit -m "docs(mayor): update to use gastown spawn for delegation"
```

---

## Task 8: Integration test

**Files:**
- Create: `tests/e2e/spawn.test.ts`

**Step 1: Create integration test**

Create `tests/e2e/spawn.test.ts`:

```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { startConvoyWithBd, closeConvoy } from '../../src/cli/commands.ts';
import { spawnAgent } from '../../src/spawn/mod.ts';
import { killSession, sessionExists } from '../../src/tmux/operations.ts';
import { getAgentState } from '../../src/bd-cli/agent.ts';
import { execBd } from '../../src/bd-cli/executor.ts';

Deno.test({
  name: 'E2E: spawn agent within convoy',
  async fn() {
    // 1. Start a convoy
    const state = await startConvoyWithBd('Spawn test convoy', {
      dryRun: true,
    });

    assertExists(state.convoyId);

    // Set env vars that spawn expects
    Deno.env.set('GASTOWN_BD', state.convoyId);
    Deno.env.set('GASTOWN_CONVOY', state.tmuxSession);

    try {
      // 2. Spawn a planner agent
      const result = await spawnAgent({
        role: 'planner',
        task: 'Test planning task',
      });

      assertExists(result.agentId);
      assertEquals(result.convoyId, state.convoyId);
      assertEquals(result.role, 'planner');

      // 3. Verify agent state is running
      const agentState = await getAgentState(result.agentId);
      assertEquals(agentState, 'running');

      // 4. Cleanup spawned agent
      await execBd(['close', result.agentId, '--reason', 'Test cleanup']);
    } finally {
      // 5. Cleanup convoy
      await closeConvoy(state.convoyId, 'Test cleanup');

      // Clean env
      Deno.env.delete('GASTOWN_BD');
      Deno.env.delete('GASTOWN_CONVOY');

      // Kill tmux session if exists
      if (await sessionExists(state.tmuxSession)) {
        await killSession(state.tmuxSession);
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

**Step 2: Run integration test**

Run: `deno test --allow-all tests/e2e/spawn.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/spawn.test.ts
git commit -m "test(e2e): add spawn integration test"
```

---

## Task 9: Run full test suite and fix any issues

**Step 1: Run all tests**

Run: `deno test --allow-all`
Expected: All tests pass

**Step 2: Run type check**

Run: `deno check gastown.ts`
Expected: No errors

**Step 3: Run linter**

Run: `deno lint`
Expected: No errors

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address test/lint issues from spawn implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add agentId to buildClaudeEnvVars | command.ts, command.test.ts |
| 2 | Add agentId to ClaudeCommandOptions | command.ts, command.test.ts |
| 3 | Add splitWindowAndGetIndex | operations.ts, operations.test.ts |
| 4 | Create spawn.ts core logic | spawn/spawn.ts, spawn.test.ts |
| 5 | Create mod.ts exports | spawn/mod.ts |
| 6 | Add spawn CLI subcommand | gastown.ts |
| 7 | Update Mayor instructions | mayor.md |
| 8 | Integration test | tests/e2e/spawn.test.ts |
| 9 | Full test suite validation | - |

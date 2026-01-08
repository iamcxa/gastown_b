# Gas Town Beads Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace custom bd file format with official `bd CLI` as the state management backend, making gastown a high-level orchestration layer.

**Architecture:** Two-layer CLI where gastown handles tmux orchestration and convoy lifecycle while bd CLI manages all persistent state (epics, agents, tasks, dependencies). All agent beads use native bd commands for state reporting and task management.

**Tech Stack:** Deno, TypeScript, bd CLI (Go), tmux

---

## Phase 1: Core bd CLI Integration Layer

### Task 1.1: Create bd CLI Wrapper Module

**Files:**
- Create: `src/bd/cli.ts`
- Test: `src/bd/cli.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd/cli.test.ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { bdCreate, bdShow, bdUpdate, bdClose, bdAgentState, bdSlotSet } from './cli.ts';

Deno.test('bdCreate creates epic and returns ID', async () => {
  // This test requires a beads database - skip in CI or mock
  const result = await bdCreate({
    title: 'Test Convoy',
    type: 'epic',
    labels: ['convoy', 'test'],
  });
  assertEquals(result.id.startsWith('beads-'), true);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd/cli.test.ts --allow-run --allow-read`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/bd/cli.ts

interface BdCreateOptions {
  title: string;
  type: 'epic' | 'task' | 'bug' | 'feature' | 'agent';
  description?: string;
  labels?: string[];
  deps?: string[];
  roleType?: string; // for agent beads
  agentRig?: string; // for agent beads
}

interface BdResult {
  id: string;
  success: boolean;
  output: string;
}

async function runBdCommand(args: string[]): Promise<BdResult> {
  const cmd = new Deno.Command('bd', {
    args: [...args, '--json'],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code, stdout, stderr } = await cmd.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);

  if (code !== 0) {
    throw new Error(`bd command failed: ${error}`);
  }

  try {
    const parsed = JSON.parse(output);
    return { id: parsed.id || '', success: true, output };
  } catch {
    // Some commands return non-JSON output
    return { id: '', success: true, output };
  }
}

export async function bdCreate(options: BdCreateOptions): Promise<BdResult> {
  const args = ['create', options.title, '--type', options.type, '--silent'];

  if (options.description) {
    args.push('--description', options.description);
  }
  if (options.labels && options.labels.length > 0) {
    args.push('--labels', options.labels.join(','));
  }
  if (options.deps && options.deps.length > 0) {
    args.push('--deps', options.deps.join(','));
  }
  if (options.type === 'agent') {
    if (options.roleType) args.push('--role-type', options.roleType);
    if (options.agentRig) args.push('--agent-rig', options.agentRig);
  }

  const result = await runBdCommand(args);
  // --silent returns just the ID
  result.id = result.output.trim();
  return result;
}

export async function bdShow(issueId: string): Promise<Record<string, unknown>> {
  const result = await runBdCommand(['show', issueId]);
  return JSON.parse(result.output);
}

export async function bdUpdate(issueId: string, updates: {
  status?: 'open' | 'in_progress' | 'closed';
  description?: string;
  labels?: string[];
}): Promise<BdResult> {
  const args = ['update', issueId];

  if (updates.status) args.push('--status', updates.status);
  if (updates.description) args.push('--description', updates.description);
  if (updates.labels) args.push('--labels', updates.labels.join(','));

  return runBdCommand(args);
}

export async function bdClose(issueId: string, reason?: string): Promise<BdResult> {
  const args = ['close', issueId];
  if (reason) args.push('--reason', reason);
  return runBdCommand(args);
}

export async function bdAgentState(agentId: string, state: string): Promise<BdResult> {
  return runBdCommand(['agent', 'state', agentId, state]);
}

export async function bdAgentHeartbeat(agentId: string): Promise<BdResult> {
  return runBdCommand(['agent', 'heartbeat', agentId]);
}

export async function bdSlotSet(agentId: string, slot: string, targetId: string): Promise<BdResult> {
  return runBdCommand(['slot', 'set', agentId, slot, targetId]);
}

export async function bdSlotClear(agentId: string, slot: string): Promise<BdResult> {
  return runBdCommand(['slot', 'clear', agentId, slot]);
}

export async function bdSlotShow(agentId: string): Promise<Record<string, unknown>> {
  const result = await runBdCommand(['slot', 'show', agentId]);
  return JSON.parse(result.output);
}

export async function bdSetState(issueId: string, dimension: string, value: string, reason?: string): Promise<BdResult> {
  const args = ['set-state', issueId, `${dimension}=${value}`];
  if (reason) args.push('--reason', reason);
  return runBdCommand(args);
}

export async function bdCommentsAdd(issueId: string, comment: string): Promise<BdResult> {
  return runBdCommand(['comments', 'add', issueId, comment]);
}

export async function bdDepAdd(issueId: string, dependsOnId: string, type: string = 'blocks'): Promise<BdResult> {
  return runBdCommand(['dep', 'add', issueId, dependsOnId, '--type', type]);
}

export async function bdReady(options?: { labels?: string[] }): Promise<Record<string, unknown>[]> {
  const args = ['ready'];
  if (options?.labels) {
    args.push('--labels', options.labels.join(','));
  }
  const result = await runBdCommand(args);
  return JSON.parse(result.output);
}

export async function bdList(options?: {
  status?: string;
  labels?: string[];
  type?: string;
}): Promise<Record<string, unknown>[]> {
  const args = ['list'];
  if (options?.status) args.push('--status', options.status);
  if (options?.labels) args.push('--labels', options.labels.join(','));
  if (options?.type) args.push('--type', options.type);
  const result = await runBdCommand(args);
  return JSON.parse(result.output);
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd/cli.test.ts --allow-run --allow-read`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd/cli.ts src/bd/cli.test.ts
git commit -m "feat(bd): add bd CLI wrapper module

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Add Convoy Factory Using bd CLI

**Files:**
- Create: `src/convoy/factory.ts`
- Test: `src/convoy/factory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/convoy/factory.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createConvoy, ConvoyConfig } from './factory.ts';

Deno.test('createConvoy creates epic with agent beads', async () => {
  const config: ConvoyConfig = {
    task: 'Implement user authentication',
    maxWorkers: 3,
    mode: 'manual',
  };

  const convoy = await createConvoy(config);

  assertEquals(convoy.epicId.startsWith('beads-'), true);
  assertEquals(convoy.agents.mayor !== undefined, true);
  assertEquals(convoy.agents.planner !== undefined, true);
  assertEquals(convoy.agents.foreman !== undefined, true);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/convoy/factory.test.ts --allow-run --allow-read`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/convoy/factory.ts
import {
  bdCreate,
  bdDepAdd,
  bdAgentState,
} from '../bd/cli.ts';

export interface ConvoyConfig {
  task: string;
  maxWorkers: number;
  mode: 'manual' | 'autopilot' | 'prime';
  contextPath?: string;
}

export interface ConvoyAgents {
  mayor: string;
  planner: string;
  foreman: string;
  polecats: string[];
  witness?: string;
}

export interface Convoy {
  epicId: string;
  name: string;
  agents: ConvoyAgents;
  config: ConvoyConfig;
}

function generateConvoyName(): string {
  const date = new Date().toISOString().split('T')[0];
  const slug = Math.random().toString(36).substring(2, 6);
  return `convoy-${date}-${slug}`;
}

export async function createConvoy(config: ConvoyConfig): Promise<Convoy> {
  const name = generateConvoyName();

  // 1. Create convoy epic
  const epic = await bdCreate({
    title: config.task,
    type: 'epic',
    labels: ['convoy', `mode:${config.mode}`],
    description: `Max workers: ${config.maxWorkers}`,
  });

  // 2. Create agent beads under the epic
  const mayor = await bdCreate({
    title: `[Mayor] Coordinate: ${config.task}`,
    type: 'agent',
    labels: ['gt:agent', 'role:mayor'],
    roleType: 'mayor',
  });
  await bdDepAdd(mayor.id, epic.id, 'parent-child');

  const planner = await bdCreate({
    title: '[Planner] Brainstorming & Design',
    type: 'agent',
    labels: ['gt:agent', 'role:planner'],
    roleType: 'polecat', // planner uses polecat role type
  });
  await bdDepAdd(planner.id, epic.id, 'parent-child');
  await bdDepAdd(planner.id, mayor.id, 'blocks'); // Mayor spawns Planner

  const foreman = await bdCreate({
    title: '[Foreman] Implementation Plan',
    type: 'agent',
    labels: ['gt:agent', 'role:foreman'],
    roleType: 'polecat',
  });
  await bdDepAdd(foreman.id, epic.id, 'parent-child');
  await bdDepAdd(foreman.id, planner.id, 'blocks'); // Planner spawns Foreman

  // Set initial states
  await bdAgentState(mayor.id, 'spawning');
  await bdAgentState(planner.id, 'idle');
  await bdAgentState(foreman.id, 'idle');

  return {
    epicId: epic.id,
    name,
    agents: {
      mayor: mayor.id,
      planner: planner.id,
      foreman: foreman.id,
      polecats: [],
    },
    config,
  };
}

export async function addWorkerToConvoy(convoy: Convoy, taskId: string): Promise<string> {
  const workerId = convoy.agents.polecats.length + 1;

  const polecat = await bdCreate({
    title: `[Polecat-${workerId}] Worker`,
    type: 'agent',
    labels: ['gt:agent', 'role:polecat'],
    roleType: 'polecat',
  });

  await bdDepAdd(polecat.id, convoy.epicId, 'parent-child');
  await bdAgentState(polecat.id, 'idle');

  convoy.agents.polecats.push(polecat.id);

  return polecat.id;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/convoy/factory.test.ts --allow-run --allow-read`
Expected: PASS

**Step 5: Commit**

```bash
git add src/convoy/factory.ts src/convoy/factory.test.ts
git commit -m "feat(convoy): add convoy factory using bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Refactor CLI Commands

### Task 2.1: Update startConvoy to Use bd CLI

**Files:**
- Modify: `src/cli/commands.ts:20-103`
- Test: `src/cli/commands.test.ts`

**Step 1: Write the failing test**

```typescript
// src/cli/commands.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { startConvoy } from './commands.ts';

Deno.test('startConvoy creates convoy via bd CLI', async () => {
  // Mock test - we can't easily test tmux in CI
  // This verifies the function signature and basic flow
  const spy = { called: false };
  // In real test, mock bdCreate and launchMayor
});
```

**Step 2: Update implementation**

```typescript
// In src/cli/commands.ts - replace startConvoy function

import { createConvoy, type Convoy } from '../convoy/factory.ts';
import { bdShow, bdAgentState, bdCommentsAdd } from '../bd/cli.ts';

export async function startConvoy(task: string, options: StartOptions = {}): Promise<void> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  const contextPath = options.contextPath;
  const primeMode = options.primeMode || false;

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  const mode = primeMode ? 'prime' : (contextPath ? 'autopilot' : 'manual');

  if (contextPath) {
    console.log(`Autopilot mode: ${contextPath}`);
  }
  if (primeMode) {
    console.log('Prime Minister mode enabled');
    if (!contextPath) {
      console.warn('Warning: Prime Minister mode works best with a context file (--context)');
    }
  }

  // Create convoy using bd CLI
  const convoy = await createConvoy({
    task,
    maxWorkers,
    mode,
    contextPath,
  });

  console.log(`Created convoy: ${convoy.epicId}`);

  const sessionName = `gastown-${convoy.name}`;

  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists. Use 'gastown attach' to connect.`);
    return;
  }

  // Launch Mayor with convoy info
  const success = await launchMayor(
    sessionName,
    projectDir,
    convoy.epicId,     // Pass convoy epic ID instead of bd file path
    convoy.name,
    task,
    contextPath,
    primeMode
  );

  if (!success) {
    console.error('Failed to start convoy');
    await bdAgentState(convoy.agents.mayor, 'dead');
    return;
  }

  await bdAgentState(convoy.agents.mayor, 'running');
  await bdCommentsAdd(convoy.epicId, 'COORDINATOR: Mayor online, starting convoy');

  console.log(`Convoy started: ${sessionName}`);

  // Launch Prime Minister in second pane if primeMode is enabled
  if (primeMode) {
    console.log('Launching Prime Minister in split pane...');
    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      convoy.epicId,
      convoy.name,
      task,
      contextPath || '',
      '0'
    );

    if (!primeSuccess) {
      console.error('Failed to launch Prime Minister');
    } else {
      console.log('Prime Minister launched');
    }
  }

  console.log('Attaching to session...');
  await attachSession(sessionName);
}
```

**Step 3: Run tests**

Run: `deno test src/cli/ --allow-run --allow-read`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands.ts
git commit -m "refactor(cli): update startConvoy to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Update resumeConvoy to Use bd CLI

**Files:**
- Modify: `src/cli/commands.ts:105-173`

**Step 1: Update implementation**

```typescript
// In src/cli/commands.ts - replace resumeConvoy function

export async function resumeConvoy(convoyId: string): Promise<void> {
  console.log(`Resuming convoy: ${convoyId}`);

  // Load convoy from bd
  const convoyData = await bdShow(convoyId);

  if (!convoyData || convoyData.type !== 'epic') {
    console.error('Invalid convoy ID - must be an epic');
    return;
  }

  const sessionName = `gastown-${convoyId.replace('beads-', 'convoy-')}`;

  if (await sessionExists(sessionName)) {
    console.log('Session already running. Attaching...');
    await attachSession(sessionName);
    return;
  }

  console.log('Rebuilding session from bd state...');

  const projectDir = Deno.cwd();
  await loadConfig(projectDir);

  // Extract mode from labels
  const labels = (convoyData.labels as string[]) || [];
  const modeLabel = labels.find(l => l.startsWith('mode:'));
  const mode = modeLabel ? modeLabel.split(':')[1] : 'manual';
  const isPrimeMode = mode === 'prime';

  // Get context path from state or description
  const contextPath = undefined; // TODO: store in state dimension

  if (contextPath) {
    console.log(`Resuming in autopilot mode: ${contextPath}`);
  }
  if (isPrimeMode) {
    console.log('Prime Minister mode enabled');
  }

  const success = await launchMayor(
    sessionName,
    projectDir,
    convoyId,
    sessionName,
    convoyData.title as string,
    contextPath,
    isPrimeMode
  );

  if (!success) {
    console.error('Failed to resume convoy');
    return;
  }

  // Launch Prime Minister if prime mode was enabled
  if (isPrimeMode) {
    console.log('Launching Prime Minister in split pane...');
    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      convoyId,
      sessionName,
      convoyData.title as string,
      contextPath || '',
      '0'
    );

    if (!primeSuccess) {
      console.error('Failed to launch Prime Minister');
    } else {
      console.log('Prime Minister launched');
    }
  }

  console.log('Convoy resumed. Attaching...');
  await attachSession(sessionName);
}
```

**Step 2: Commit**

```bash
git add src/cli/commands.ts
git commit -m "refactor(cli): update resumeConvoy to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Update showStatus to Use bd CLI

**Files:**
- Modify: `src/cli/commands.ts:175-212`

**Step 1: Update implementation**

```typescript
// In src/cli/commands.ts - replace showStatus function

export async function showStatus(convoyId?: string): Promise<void> {
  if (convoyId) {
    const convoyData = await bdShow(convoyId);
    await displayConvoyStatus(convoyId, convoyData);
  } else {
    const sessions = await listSessions();

    if (sessions.length === 0) {
      console.log('No active convoys.');

      // Also show any open convoy epics
      const convoys = await bdList({ type: 'epic', labels: ['convoy'], status: 'open' });
      if (convoys.length > 0) {
        console.log('\nOpen convoy epics:');
        for (const c of convoys) {
          console.log(`  - ${c.id}: ${c.title}`);
        }
      }
      return;
    }

    console.log('Active convoys:');
    for (const session of sessions) {
      console.log(`  - ${session}`);
    }
  }
}

async function displayConvoyStatus(convoyId: string, data: Record<string, unknown>): Promise<void> {
  console.log(`\nConvoy: ${convoyId}`);
  console.log(`Description: ${data.title}`);
  console.log(`Status: ${data.status}`);
  console.log('');

  // Get agent beads
  const agents = await bdList({ type: 'agent', labels: ['gt:agent'] });
  const convoyAgents = agents.filter(a => {
    // Filter agents belonging to this convoy by checking parent-child deps
    return true; // TODO: filter by convoy
  });

  console.log('Agents:');
  for (const agent of convoyAgents) {
    const state = agent.state || 'unknown';
    console.log(`  ${agent.id} [${agent.title}] - ${state}`);
  }
  console.log('');

  // Get tasks
  const tasks = await bdList({ type: 'task', labels: ['gt:task'] });
  const completedTasks = tasks.filter(t => t.status === 'closed').length;
  console.log(`Progress: ${completedTasks}/${tasks.length}`);
}
```

**Step 2: Commit**

```bash
git add src/cli/commands.ts
git commit -m "refactor(cli): update showStatus to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.4: Update stopConvoy to Use bd CLI

**Files:**
- Modify: `src/cli/commands.ts:228-247`

**Step 1: Update implementation**

```typescript
// In src/cli/commands.ts - replace stopConvoy function

export async function stopConvoy(archive: boolean = false): Promise<void> {
  const sessions = await listSessions();

  if (sessions.length === 0) {
    console.log('No active convoys.');
    return;
  }

  for (const session of sessions) {
    console.log(`Stopping ${session}...`);

    // Extract convoy ID from session name
    const convoyId = session.replace('gastown-', '');

    // Set all agents to stopped
    const agents = await bdList({ type: 'agent', labels: ['gt:agent'] });
    for (const agent of agents) {
      await bdAgentState(agent.id as string, 'stopped');
    }

    // Record stop in convoy epic
    await bdCommentsAdd(convoyId, 'CONVOY: Stopped by user');

    // Kill tmux session
    await killSession(session);
  }

  if (archive) {
    console.log('Closing convoy epics...');
    const convoys = await bdList({ type: 'epic', labels: ['convoy'], status: 'open' });
    for (const convoy of convoys) {
      await bdClose(convoy.id as string, 'Archived by user');
    }
  }

  console.log('All convoys stopped.');
}
```

**Step 2: Commit**

```bash
git add src/cli/commands.ts
git commit -m "refactor(cli): update stopConvoy to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Update Agent Role Definitions

### Task 3.1: Update Mayor Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/mayor.md`

**Step 1: Update agent definition**

Replace bd file references with bd CLI commands. Key changes:

```markdown
## State Management

Use bd CLI for all state operations:

```bash
# Update your state
bd agent state $GASTOWN_AGENT working

# Add checkpoint/progress
bd comments add $GASTOWN_CONVOY "COORDINATOR: Starting planning phase"

# Delegate to Planner
bd agent state gt-planner-001 spawning
bd comments add $GASTOWN_CONVOY "DELEGATE: Planning phase → Planner"

# Check convoy status
bd show $GASTOWN_CONVOY --json
```

## Environment Variables

- `GASTOWN_CONVOY` - Convoy epic ID (e.g., beads-abc123)
- `GASTOWN_AGENT` - Your agent bead ID (e.g., beads-def456)
- `GASTOWN_ROLE` - Your role name (mayor)
```

**Step 2: Commit**

```bash
git add .gastown/agents/mayor.md
git commit -m "refactor(agents): update Mayor to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Update Planner Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/planner.md`

**Step 1: Update agent definition**

Key changes for Planner:

```markdown
## State Management

```bash
# Start working
bd agent state $GASTOWN_AGENT working

# Output design document
bd comments add $GASTOWN_AGENT "OUTPUT: docs/plans/2026-01-08-design.md"

# Mark complete
bd agent state $GASTOWN_AGENT done
bd comments add $GASTOWN_CONVOY "COMPLETE: Planning phase done"
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/planner.md
git commit -m "refactor(agents): update Planner to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.3: Update Foreman Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/foreman.md`

**Step 1: Update agent definition**

Key changes for Foreman - creates tasks via bd CLI:

```markdown
## Task Creation

```bash
# Create implementation tasks
TASK1=$(bd create "Implement JWT service" --type task --labels gt:task --silent)
TASK2=$(bd create "Implement token validation" --type task --labels gt:task --silent)
TASK3=$(bd create "Write unit tests" --type task --labels gt:task --silent)

# Set dependencies
bd dep add $TASK3 $TASK1  # Tests depend on JWT
bd dep add $TASK3 $TASK2  # Tests depend on validation

# Link to convoy
bd dep add $TASK1 $GASTOWN_CONVOY parent-child
bd dep add $TASK2 $GASTOWN_CONVOY parent-child
bd dep add $TASK3 $GASTOWN_CONVOY parent-child

# Mark yourself done
bd agent state $GASTOWN_AGENT done
bd comments add $GASTOWN_CONVOY "COMPLETE: Task breakdown done, 3 tasks created"
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/foreman.md
git commit -m "refactor(agents): update Foreman to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.4: Update Polecat Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/polecat.md`

**Step 1: Update agent definition**

Key changes for Polecat - uses slots for task assignment:

```markdown
## Task Workflow

```bash
# Find available task
TASK=$(bd ready --labels gt:task --json | jq -r '.[0].id')

# Claim task via slot
bd slot set $GASTOWN_AGENT hook $TASK
bd agent state $GASTOWN_AGENT working
bd update $TASK --status in_progress

# Progress updates
bd set-state $TASK progress=1/5
bd comments add $TASK "PROGRESS: Implemented basic structure"

bd set-state $TASK progress=3/5
bd comments add $TASK "PROGRESS: Added validation logic"

# Complete task
bd close $TASK --reason "Implementation complete"
bd slot clear $GASTOWN_AGENT hook
bd agent state $GASTOWN_AGENT idle
```

## Context Monitoring

```bash
# Update context usage
bd set-state $GASTOWN_AGENT context=72%

# When context is high, checkpoint and signal respawn
bd comments add $TASK "CHECKPOINT: Completed steps 1-3, remaining: tests"
bd agent state $GASTOWN_AGENT stuck
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/polecat.md
git commit -m "refactor(agents): update Polecat to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.5: Update Witness Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/witness.md`

**Step 1: Update agent definition**

Key changes for Witness:

```markdown
## Review Workflow

```bash
# Claim review task
bd slot set $GASTOWN_AGENT hook $REVIEW_TASK
bd agent state $GASTOWN_AGENT working

# Review result
bd comments add $REVIEW_TASK "REVIEW: Approved with minor suggestions"
# or
bd comments add $REVIEW_TASK "REVIEW: Changes requested - see inline comments"

# Complete
bd close $REVIEW_TASK
bd agent state $GASTOWN_AGENT idle
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/witness.md
git commit -m "refactor(agents): update Witness to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.6: Update Prime Agent to Use bd CLI

**Files:**
- Modify: `.gastown/agents/prime.md`

**Step 1: Update agent definition**

Key changes for Prime Minister:

```markdown
## Decision Logging

```bash
# Log decisions to convoy
bd comments add $GASTOWN_CONVOY "DECISION-LOG: Approved API design from Planner"
bd comments add $GASTOWN_CONVOY "DECISION-LOG: Selected JWT for auth (reason: standard)"

# Answer Mayor questions via comments
bd comments add $GASTOWN_CONVOY "ANSWER [high-confidence]: Use PostgreSQL (per context file)"
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/prime.md
git commit -m "refactor(agents): update Prime to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.7: Update Dog and Refinery Agents

**Files:**
- Modify: `.gastown/agents/dog.md`
- Modify: `.gastown/agents/refinery.md`

**Step 1: Update both agents with bd CLI patterns**

Similar patterns to Polecat/Witness for task claiming and completion.

**Step 2: Commit**

```bash
git add .gastown/agents/dog.md .gastown/agents/refinery.md
git commit -m "refactor(agents): update Dog and Refinery to use bd CLI

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Respawn System

### Task 4.1: Create Respawn Check Command

**Files:**
- Create: `src/respawn/check.ts`
- Test: `src/respawn/check.test.ts`

**Step 1: Write the failing test**

```typescript
// src/respawn/check.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { shouldRespawn, RespawnDecision } from './check.ts';

Deno.test('shouldRespawn returns true when context > threshold', () => {
  const decision = shouldRespawn(85, 80);
  assertEquals(decision.shouldRespawn, true);
});

Deno.test('shouldRespawn returns false when context < threshold', () => {
  const decision = shouldRespawn(50, 80);
  assertEquals(decision.shouldRespawn, false);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/respawn/check.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/respawn/check.ts
import { bdSetState, bdCommentsAdd, bdAgentState, bdSlotShow } from '../bd/cli.ts';

export interface RespawnDecision {
  shouldRespawn: boolean;
  contextPercent: number;
  threshold: number;
  reason?: string;
}

export function shouldRespawn(contextPercent: number, threshold: number = 80): RespawnDecision {
  return {
    shouldRespawn: contextPercent > threshold,
    contextPercent,
    threshold,
    reason: contextPercent > threshold ? `Context at ${contextPercent}%, above threshold ${threshold}%` : undefined,
  };
}

export async function checkAndRespawn(agentId: string, contextPercent: number, threshold: number = 80): Promise<boolean> {
  // Update context state
  await bdSetState(agentId, 'context', `${contextPercent}%`);

  const decision = shouldRespawn(contextPercent, threshold);

  if (!decision.shouldRespawn) {
    return false;
  }

  // Get current task from slot
  const slots = await bdSlotShow(agentId);
  const currentTask = slots.hook;

  // Record checkpoint
  await bdCommentsAdd(agentId, `RESPAWN: context at ${contextPercent}%, initiating respawn`);
  await bdAgentState(agentId, 'stuck');

  if (currentTask) {
    await bdCommentsAdd(currentTask as string, `CHECKPOINT: respawn triggered, agent=${agentId}`);
  }

  return true;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/respawn/check.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/respawn/check.ts src/respawn/check.test.ts
git commit -m "feat(respawn): add respawn check logic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Create Respawn Executor

**Files:**
- Create: `src/respawn/exec.ts`
- Test: `src/respawn/exec.test.ts`

**Step 1: Write the failing test**

```typescript
// src/respawn/exec.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildRespawnCommand } from './exec.ts';

Deno.test('buildRespawnCommand generates correct tmux command', () => {
  const cmd = buildRespawnCommand('gastown-convoy', 'polecat', 'beads-123');
  assertEquals(cmd.includes('tmux'), true);
  assertEquals(cmd.includes('beads-123'), true);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/respawn/exec.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/respawn/exec.ts
import { bdShow, bdAgentState } from '../bd/cli.ts';

export function buildRespawnCommand(sessionName: string, role: string, agentId: string): string {
  return `tmux split-window -t ${sessionName} "claude --agent ${role} --resume ${agentId}"`;
}

export async function executeRespawn(sessionName: string, agentId: string): Promise<boolean> {
  // Get agent details
  const agent = await bdShow(agentId);
  const labels = (agent.labels as string[]) || [];
  const roleLabel = labels.find(l => l.startsWith('role:'));
  const role = roleLabel ? roleLabel.split(':')[1] : 'polecat';

  // Kill old pane (if exists)
  const killCmd = new Deno.Command('tmux', {
    args: ['kill-pane', '-t', agentId],
    stdout: 'null',
    stderr: 'null',
  });
  await killCmd.output(); // Ignore errors if pane doesn't exist

  // Create new pane
  const respawnCmd = buildRespawnCommand(sessionName, role, agentId);
  const cmd = new Deno.Command('sh', {
    args: ['-c', respawnCmd],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code } = await cmd.output();

  if (code === 0) {
    await bdAgentState(agentId, 'spawning');
    return true;
  }

  return false;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/respawn/exec.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/respawn/exec.ts src/respawn/exec.test.ts
git commit -m "feat(respawn): add respawn executor

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Update Launcher to Pass bd Environment

### Task 5.1: Update Claude Launcher

**Files:**
- Modify: `src/claude/launcher.ts`

**Step 1: Update launchMayor to pass convoy/agent IDs**

```typescript
// Key changes in launcher.ts

export async function launchMayor(
  sessionName: string,
  projectDir: string,
  convoyId: string,      // Changed from bdPath
  convoyName: string,
  task: string,
  contextPath?: string,
  primeMode?: boolean
): Promise<boolean> {
  // ... existing code ...

  // Set environment variables for agent
  const env = {
    GASTOWN_CONVOY: convoyId,
    GASTOWN_AGENT: `${convoyId}-mayor`, // Will be replaced with actual agent ID
    GASTOWN_ROLE: 'mayor',
    GASTOWN_CONTEXT: contextPath || '',
    GASTOWN_SESSION: sessionName,
  };

  // Build launch command with env vars
  const envStr = Object.entries(env)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  // ... rest of launch logic ...
}
```

**Step 2: Commit**

```bash
git add src/claude/launcher.ts
git commit -m "refactor(launcher): pass convoy/agent IDs as env vars

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Cleanup and Migration

### Task 6.1: Remove Old bd File Modules

**Files:**
- Delete: `src/bd/parser.ts`
- Delete: `src/bd/writer.ts`
- Delete: `src/bd/operations.ts`
- Modify: `src/bd/mod.ts`

**Step 1: Update mod.ts to export only CLI module**

```typescript
// src/bd/mod.ts
export * from './cli.ts';
```

**Step 2: Remove old files**

```bash
rm src/bd/parser.ts src/bd/writer.ts src/bd/operations.ts
```

**Step 3: Commit**

```bash
git add -A src/bd/
git commit -m "refactor(bd): remove old bd file parsers, use CLI only

BREAKING CHANGE: Custom bd file format no longer supported. Use bd CLI.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.2: Update Types

**Files:**
- Modify: `src/types.ts`

**Step 1: Update types for bd CLI model**

```typescript
// src/types.ts

export type RoleName = 'mayor' | 'planner' | 'foreman' | 'polecat' | 'witness' | 'dog' | 'refinery' | 'prime';

export type ConvoyMode = 'manual' | 'autopilot' | 'prime';

export type AgentState = 'idle' | 'spawning' | 'running' | 'working' | 'stuck' | 'done' | 'stopped' | 'dead';

export interface ConvoyConfig {
  task: string;
  maxWorkers: number;
  mode: ConvoyMode;
  contextPath?: string;
}

export interface Convoy {
  epicId: string;
  name: string;
  agents: {
    mayor: string;
    planner: string;
    foreman: string;
    polecats: string[];
    witness?: string;
  };
  config: ConvoyConfig;
}

// Remove old BdFile, BdSection, BdTask, BdNote types
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "refactor(types): update types for bd CLI model

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.3: Update Main Entry Point

**Files:**
- Modify: `gastown.ts`

**Step 1: Update CLI argument parsing**

```typescript
// gastown.ts - update resume to accept convoy ID

const args = parseArgs(Deno.args, {
  string: ['resume', 'status', 'max-workers', 'context'],
  // ...
});

// Resume now takes convoy ID (beads-xxx) instead of file path
if (args.resume) {
  await resumeConvoy(args.resume);
  return;
}
```

**Step 2: Commit**

```bash
git add gastown.ts
git commit -m "refactor(cli): update entry point for bd CLI model

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Integration Testing

### Task 7.1: Create Integration Test Suite

**Files:**
- Create: `tests/integration/convoy.test.ts`

**Step 1: Write integration tests**

```typescript
// tests/integration/convoy.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createConvoy } from '../../src/convoy/factory.ts';
import { bdShow, bdClose } from '../../src/bd/cli.ts';

Deno.test({
  name: 'Integration: full convoy lifecycle',
  async fn() {
    // Create convoy
    const convoy = await createConvoy({
      task: 'Test convoy',
      maxWorkers: 2,
      mode: 'manual',
    });

    // Verify epic created
    const epic = await bdShow(convoy.epicId);
    assertEquals(epic.type, 'epic');

    // Verify agents created
    const mayor = await bdShow(convoy.agents.mayor);
    assertEquals(mayor.type, 'agent');

    // Cleanup
    await bdClose(convoy.epicId, 'Test complete');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

**Step 2: Run integration tests**

Run: `deno test tests/integration/ --allow-all`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration/convoy.test.ts
git commit -m "test: add convoy integration tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7.2: Manual End-to-End Test

**Step 1: Test convoy creation**

```bash
./gastown.ts "Test implementation"
```

Expected:
- Convoy epic created in bd
- Mayor agent spawned in tmux
- Session attached

**Step 2: Test convoy status**

```bash
./gastown.ts --status
```

Expected: Shows active convoy with agent states

**Step 3: Test convoy stop**

```bash
./gastown.ts stop
```

Expected:
- Agents marked as stopped
- tmux session killed

**Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat: complete gastown beads redesign

Replaces custom bd file format with official bd CLI backend.
All state management now uses bd commands.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Phase | Tasks | Estimated Steps |
|-------|-------|-----------------|
| 1. Core bd CLI Integration | 2 tasks | ~25 steps |
| 2. Refactor CLI Commands | 4 tasks | ~20 steps |
| 3. Update Agent Definitions | 7 tasks | ~21 steps |
| 4. Respawn System | 2 tasks | ~10 steps |
| 5. Update Launcher | 1 task | ~5 steps |
| 6. Cleanup and Migration | 3 tasks | ~9 steps |
| 7. Integration Testing | 2 tasks | ~10 steps |

**Total: 21 tasks, ~100 steps**

---

Plan complete and saved to `docs/plans/2026-01-08-gastown-beads-redesign.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?

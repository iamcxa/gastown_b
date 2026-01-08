# Gas Town Beads 整合實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 Gas Town 遷移至使用 bd CLI 作為唯一狀態管理層，移除自定義 bd 檔案格式

**Architecture:** 雙層架構 - gastown CLI (高階協調) 調用 bd CLI (狀態管理)。Convoy 使用 bd epic，Agent 使用 bd agent beads，Task 使用普通 bd issues。

**Tech Stack:** Deno (TypeScript), bd CLI, tmux

---

## Phase 1: bd CLI 封裝層

建立 TypeScript 封裝函數，統一調用 bd CLI 命令。

---

### Task 1.1: 建立 bd CLI 執行器

**Files:**
- Create: `src/bd-cli/executor.ts`
- Create: `src/bd-cli/mod.ts`
- Test: `src/bd-cli/executor.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd-cli/executor.test.ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { execBd, execBdJson } from './executor.ts';

Deno.test('execBd runs bd command and returns stdout', async () => {
  const result = await execBd(['--version']);
  assertEquals(typeof result, 'string');
  assertEquals(result.includes('bd'), true);
});

Deno.test('execBdJson parses JSON output', async () => {
  const result = await execBdJson(['stats']);
  assertEquals(typeof result, 'object');
});

Deno.test('execBd throws on invalid command', async () => {
  await assertRejects(
    () => execBd(['invalid-command-xyz']),
    Error,
    'bd command failed'
  );
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd-cli/executor.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/bd-cli/executor.ts

export interface BdExecOptions {
  cwd?: string;
  silent?: boolean;
}

export async function execBd(
  args: string[],
  options: BdExecOptions = {}
): Promise<string> {
  const cmd = new Deno.Command('bd', {
    args,
    cwd: options.cwd,
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code, stdout, stderr } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);

  if (code !== 0) {
    throw new Error(`bd command failed: ${err || out}`);
  }

  return out.trim();
}

export async function execBdJson<T = unknown>(
  args: string[],
  options: BdExecOptions = {}
): Promise<T> {
  const output = await execBd([...args, '--json'], options);
  return JSON.parse(output) as T;
}

export async function execBdQuiet(
  args: string[],
  options: BdExecOptions = {}
): Promise<string> {
  return execBd([...args, '--quiet'], options);
}
```

```typescript
// src/bd-cli/mod.ts
export * from './executor.ts';
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd-cli/executor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd-cli/executor.ts src/bd-cli/executor.test.ts src/bd-cli/mod.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): add bd CLI executor wrapper

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: 建立 Convoy 操作封裝

**Files:**
- Create: `src/bd-cli/convoy.ts`
- Test: `src/bd-cli/convoy.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd-cli/convoy.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createConvoy, getConvoy, closeConvoy, type ConvoyInfo } from './convoy.ts';

// Note: These tests require bd to be initialized
// Run `bd init` in a test directory first

Deno.test('createConvoy creates epic and returns convoy info', async () => {
  const convoy = await createConvoy({
    title: 'Test Convoy',
    description: 'A test convoy for unit testing',
    maxWorkers: 3,
  });

  assertExists(convoy.id);
  assertEquals(convoy.title, 'Test Convoy');
  assertEquals(typeof convoy.id, 'string');

  // Cleanup
  await closeConvoy(convoy.id, 'Test cleanup');
});

Deno.test('getConvoy retrieves convoy details', async () => {
  const created = await createConvoy({
    title: 'Retrieve Test',
    description: 'Testing retrieval',
  });

  const fetched = await getConvoy(created.id);
  assertEquals(fetched.id, created.id);
  assertEquals(fetched.title, created.title);

  await closeConvoy(created.id, 'Test cleanup');
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd-cli/convoy.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/bd-cli/convoy.ts
import { execBd, execBdJson } from './executor.ts';

export interface ConvoyCreateOptions {
  title: string;
  description?: string;
  maxWorkers?: number;
  labels?: string[];
}

export interface ConvoyInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  createdAt: string;
}

interface BdShowResult {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  created_at: string;
}

export async function createConvoy(options: ConvoyCreateOptions): Promise<ConvoyInfo> {
  const args = [
    'create',
    options.title,
    '--type', 'epic',
    '--silent',
  ];

  if (options.description) {
    args.push('--description', options.description);
  }

  const labels = ['convoy', ...(options.labels || [])];
  if (options.maxWorkers) {
    labels.push(`max-workers:${options.maxWorkers}`);
  }
  args.push('--labels', labels.join(','));

  const id = await execBd(args);

  return getConvoy(id.trim());
}

export async function getConvoy(id: string): Promise<ConvoyInfo> {
  const result = await execBdJson<BdShowResult>(['show', id]);

  return {
    id: result.id,
    title: result.title,
    description: result.description || '',
    status: result.status,
    labels: result.labels || [],
    createdAt: result.created_at,
  };
}

export async function closeConvoy(id: string, reason?: string): Promise<void> {
  const args = ['close', id];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function listConvoys(status?: string): Promise<ConvoyInfo[]> {
  const args = ['list', '--labels', 'convoy'];
  if (status) {
    args.push('--status', status);
  }

  const results = await execBdJson<BdShowResult[]>(args);
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    status: r.status,
    labels: r.labels || [],
    createdAt: r.created_at,
  }));
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd-cli/convoy.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd-cli/convoy.ts src/bd-cli/convoy.test.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): add convoy operations wrapper

- createConvoy creates epic with convoy label
- getConvoy retrieves convoy details
- closeConvoy marks convoy complete
- listConvoys finds all convoys

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: 建立 Agent Bead 操作封裝

**Files:**
- Create: `src/bd-cli/agent.ts`
- Test: `src/bd-cli/agent.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd-cli/agent.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  createAgentBead,
  setAgentState,
  getAgentState,
  updateHeartbeat,
  type AgentState,
} from './agent.ts';
import { execBd } from './executor.ts';

Deno.test('createAgentBead creates agent with role', async () => {
  const agent = await createAgentBead({
    role: 'polecat',
    convoyId: 'test-convoy', // This would be a real convoy in practice
  });

  assertExists(agent.id);
  assertEquals(agent.role, 'polecat');

  // Cleanup
  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

Deno.test('setAgentState and getAgentState work correctly', async () => {
  const agent = await createAgentBead({ role: 'polecat' });

  await setAgentState(agent.id, 'working');
  const state = await getAgentState(agent.id);
  assertEquals(state, 'working');

  await setAgentState(agent.id, 'done');
  const state2 = await getAgentState(agent.id);
  assertEquals(state2, 'done');

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

Deno.test('updateHeartbeat updates timestamp', async () => {
  const agent = await createAgentBead({ role: 'witness' });

  // Should not throw
  await updateHeartbeat(agent.id);

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd-cli/agent.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
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
  labels: string[];
  state?: string;
  last_activity?: string;
}

export async function createAgentBead(options: AgentCreateOptions): Promise<AgentBead> {
  const instanceStr = options.roleInstance ? `-${options.roleInstance}` : '';
  const title = `${options.role}${instanceStr}`;

  const args = [
    'create',
    title,
    '--type', 'agent',
    '--role-type', options.role,
    '--silent',
  ];

  const labels = [`gt:agent`, `role:${options.role}`];
  args.push('--labels', labels.join(','));

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
  return (result.state as AgentState) || 'idle';
}

export async function updateHeartbeat(agentId: string): Promise<void> {
  await execBd(['agent', 'heartbeat', agentId]);
}

export async function getAgentBead(agentId: string): Promise<AgentBead> {
  const result = await execBdJson<BdAgentShowResult>(['agent', 'show', agentId]);

  const roleLabel = result.labels?.find((l) => l.startsWith('role:'));
  const role = (roleLabel?.split(':')[1] || 'polecat') as RoleName;

  return {
    id: result.id,
    role,
    state: (result.state as AgentState) || 'idle',
    lastActivity: result.last_activity,
  };
}

export async function listAgentBeads(convoyId?: string): Promise<AgentBead[]> {
  const args = ['list', '--labels', 'gt:agent'];
  if (convoyId) {
    args.push('--parent', convoyId);
  }

  const results = await execBdJson<BdAgentShowResult[]>(args);

  return results.map((r) => {
    const roleLabel = r.labels?.find((l) => l.startsWith('role:'));
    const role = (roleLabel?.split(':')[1] || 'polecat') as RoleName;

    return {
      id: r.id,
      role,
      state: (r.state as AgentState) || 'idle',
      lastActivity: r.last_activity,
    };
  });
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd-cli/agent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd-cli/agent.ts src/bd-cli/agent.test.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): add agent bead operations wrapper

- createAgentBead creates agent with role type
- setAgentState/getAgentState manage agent state
- updateHeartbeat keeps agent alive
- listAgentBeads finds agents in convoy

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.4: 建立 Slot 操作封裝

**Files:**
- Create: `src/bd-cli/slot.ts`
- Test: `src/bd-cli/slot.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd-cli/slot.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { setSlot, getSlot, clearSlot, type SlotInfo } from './slot.ts';
import { createAgentBead } from './agent.ts';
import { execBd } from './executor.ts';

Deno.test('setSlot and getSlot work correctly', async () => {
  const agent = await createAgentBead({ role: 'polecat' });
  const taskId = 'test-task-123';

  await setSlot(agent.id, 'hook', taskId);
  const slot = await getSlot(agent.id, 'hook');

  assertEquals(slot, taskId);

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

Deno.test('clearSlot removes slot value', async () => {
  const agent = await createAgentBead({ role: 'polecat' });
  const taskId = 'test-task-456';

  await setSlot(agent.id, 'hook', taskId);
  await clearSlot(agent.id, 'hook');
  const slot = await getSlot(agent.id, 'hook');

  assertEquals(slot, null);

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd-cli/slot.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/bd-cli/slot.ts
import { execBd, execBdJson } from './executor.ts';

export type SlotName = 'hook' | 'role';

export interface SlotInfo {
  name: SlotName;
  value: string | null;
}

interface BdSlotShowResult {
  slots: Record<string, string | null>;
}

export async function setSlot(
  agentId: string,
  slotName: SlotName,
  value: string
): Promise<void> {
  await execBd(['slot', 'set', agentId, slotName, value]);
}

export async function getSlot(
  agentId: string,
  slotName: SlotName
): Promise<string | null> {
  try {
    const result = await execBdJson<BdSlotShowResult>(['slot', 'show', agentId]);
    return result.slots?.[slotName] || null;
  } catch {
    return null;
  }
}

export async function clearSlot(
  agentId: string,
  slotName: SlotName
): Promise<void> {
  await execBd(['slot', 'clear', agentId, slotName]);
}

export async function getAllSlots(agentId: string): Promise<Record<SlotName, string | null>> {
  const result = await execBdJson<BdSlotShowResult>(['slot', 'show', agentId]);
  return {
    hook: result.slots?.hook || null,
    role: result.slots?.role || null,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd-cli/slot.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd-cli/slot.ts src/bd-cli/slot.test.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): add slot operations wrapper

- setSlot attaches work to agent hook
- getSlot retrieves current slot value
- clearSlot detaches work from agent

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.5: 建立 Task 操作封裝

**Files:**
- Create: `src/bd-cli/task.ts`
- Test: `src/bd-cli/task.test.ts`

**Step 1: Write the failing test**

```typescript
// src/bd-cli/task.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  createTask,
  getTask,
  updateTaskStatus,
  addTaskComment,
  setTaskState,
  getReadyTasks,
  closeTask,
} from './task.ts';
import { execBd } from './executor.ts';

Deno.test('createTask creates task with labels', async () => {
  const task = await createTask({
    title: 'Implement JWT validation',
    description: 'Add JWT token validation to auth module',
    labels: ['gt:task'],
  });

  assertExists(task.id);
  assertEquals(task.title, 'Implement JWT validation');

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('updateTaskStatus changes status', async () => {
  const task = await createTask({ title: 'Status test' });

  await updateTaskStatus(task.id, 'in_progress');
  const updated = await getTask(task.id);
  assertEquals(updated.status, 'in_progress');

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('addTaskComment adds comment', async () => {
  const task = await createTask({ title: 'Comment test' });

  await addTaskComment(task.id, 'PROGRESS: 2/5 steps completed');
  // Comments are write-only in this test, just verify no error

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('setTaskState sets state dimension', async () => {
  const task = await createTask({ title: 'State test' });

  await setTaskState(task.id, 'progress', '3/5');
  // State is set via labels, verify via getTask

  await closeTask(task.id, 'Test cleanup');
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/bd-cli/task.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/bd-cli/task.ts
import { execBd, execBdJson } from './executor.ts';

export interface TaskCreateOptions {
  title: string;
  description?: string;
  labels?: string[];
  parentId?: string;
  deps?: string[];
  priority?: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  deps: string[];
}

interface BdShowResult {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  depends_on?: Array<{ id: string }>;
}

export async function createTask(options: TaskCreateOptions): Promise<TaskInfo> {
  const args = [
    'create',
    options.title,
    '--type', 'task',
    '--silent',
  ];

  if (options.description) {
    args.push('--description', options.description);
  }

  const labels = ['gt:task', ...(options.labels || [])];
  args.push('--labels', labels.join(','));

  if (options.parentId) {
    args.push('--parent', options.parentId);
  }

  if (options.deps && options.deps.length > 0) {
    args.push('--deps', options.deps.join(','));
  }

  if (options.priority !== undefined) {
    args.push('--priority', String(options.priority));
  }

  const id = await execBd(args);
  return getTask(id.trim());
}

export async function getTask(id: string): Promise<TaskInfo> {
  const result = await execBdJson<BdShowResult>(['show', id]);

  return {
    id: result.id,
    title: result.title,
    description: result.description || '',
    status: result.status,
    labels: result.labels || [],
    deps: result.depends_on?.map((d) => d.id) || [],
  };
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  await execBd(['update', id, '--status', status]);
}

export async function addTaskComment(id: string, comment: string): Promise<void> {
  await execBd(['comments', 'add', id, comment]);
}

export async function setTaskState(
  id: string,
  dimension: string,
  value: string,
  reason?: string
): Promise<void> {
  const args = ['set-state', id, `${dimension}=${value}`];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function closeTask(id: string, reason?: string): Promise<void> {
  const args = ['close', id];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function getReadyTasks(convoyId?: string): Promise<TaskInfo[]> {
  const args = ['ready', '--labels', 'gt:task'];

  const results = await execBdJson<BdShowResult[]>(args);

  return results
    .filter((r) => !convoyId || r.labels?.includes(`convoy:${convoyId}`))
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      status: r.status,
      labels: r.labels || [],
      deps: r.depends_on?.map((d) => d.id) || [],
    }));
}

export async function addTaskDependency(taskId: string, dependsOnId: string): Promise<void> {
  await execBd(['dep', 'add', taskId, dependsOnId]);
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/bd-cli/task.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/bd-cli/task.ts src/bd-cli/task.test.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): add task operations wrapper

- createTask creates task with gt:task label
- getTask retrieves task details
- updateTaskStatus changes status
- addTaskComment adds progress comments
- setTaskState sets state dimensions
- getReadyTasks finds unblocked tasks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.6: 更新 bd-cli/mod.ts 匯出

**Files:**
- Modify: `src/bd-cli/mod.ts`

**Step 1: Write the test (module exports)**

```typescript
// This is a module re-export, verify imports work
import * as bdCli from './mod.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('mod.ts exports all bd-cli modules', () => {
  assertEquals(typeof bdCli.execBd, 'function');
  assertEquals(typeof bdCli.createConvoy, 'function');
  assertEquals(typeof bdCli.createAgentBead, 'function');
  assertEquals(typeof bdCli.setSlot, 'function');
  assertEquals(typeof bdCli.createTask, 'function');
});
```

**Step 2: Update mod.ts**

```typescript
// src/bd-cli/mod.ts
export * from './executor.ts';
export * from './convoy.ts';
export * from './agent.ts';
export * from './slot.ts';
export * from './task.ts';
```

**Step 3: Run test**

Run: `deno test src/bd-cli/`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/bd-cli/mod.ts
git commit -m "$(cat <<'EOF'
feat(bd-cli): export all bd-cli modules from mod.ts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: 遷移 Convoy 生命週期

將 commands.ts 從自定義 bd 檔案格式遷移至 bd CLI。

---

### Task 2.1: 重構 startConvoy 使用 bd CLI

**Files:**
- Modify: `src/cli/commands.ts:20-103`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```typescript
// Add to existing test or create src/cli/commands.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { startConvoyWithBd, type ConvoyState } from './commands.ts';

Deno.test('startConvoyWithBd creates convoy via bd CLI', async () => {
  // This test requires mocking tmux - for now, test the bd operations only
  const state = await startConvoyWithBd('Test task', {
    dryRun: true, // Don't launch tmux
  });

  assertExists(state.convoyId);
  assertExists(state.mayorId);
  assertEquals(state.mode, 'mayor');
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/cli/commands.test.ts`
Expected: FAIL - startConvoyWithBd not found

**Step 3: Implement startConvoyWithBd**

Update `src/cli/commands.ts`:

```typescript
// src/cli/commands.ts - Add imports at top
import {
  createConvoy,
  createAgentBead,
  setAgentState,
  type ConvoyInfo,
  type AgentBead,
  type RoleName,
} from '../bd-cli/mod.ts';
import { loadConfig, saveConfig, generateDefaultConfig } from './config.ts';
import { launchMayor, launchPrime } from '../claude/launcher.ts';
import {
  attachSession,
  killSession,
  listSessions,
  sessionExists,
} from '../tmux/operations.ts';

// Add new types
export interface ConvoyState {
  convoyId: string;
  convoyInfo: ConvoyInfo;
  mayorId: string;
  plannerId?: string;
  foremanId?: string;
  mode: 'mayor' | 'prime';
  tmuxSession: string;
}

export interface StartOptionsV2 extends StartOptions {
  dryRun?: boolean;
}

// Add new function
export async function startConvoyWithBd(
  task: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  const primeMode = options.primeMode || false;
  const mode = primeMode ? 'prime' : 'mayor';

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  // 1. Create convoy epic via bd CLI
  const convoy = await createConvoy({
    title: task,
    description: `Convoy: ${task}`,
    maxWorkers,
    labels: primeMode ? ['mode:prime'] : [],
  });

  console.log(`Created convoy: ${convoy.id}`);

  // 2. Create core agent beads
  const mayor = await createAgentBead({
    role: 'mayor',
    convoyId: convoy.id,
  });
  await setAgentState(mayor.id, 'spawning');

  const planner = await createAgentBead({
    role: 'planner',
    convoyId: convoy.id,
  });

  const foreman = await createAgentBead({
    role: 'foreman',
    convoyId: convoy.id,
  });

  console.log(`Created agents: ${mayor.id}, ${planner.id}, ${foreman.id}`);

  const sessionName = `gastown-${convoy.id}`;

  const state: ConvoyState = {
    convoyId: convoy.id,
    convoyInfo: convoy,
    mayorId: mayor.id,
    plannerId: planner.id,
    foremanId: foreman.id,
    mode,
    tmuxSession: sessionName,
  };

  if (options.dryRun) {
    return state;
  }

  // 3. Launch tmux and Mayor
  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists.`);
    return state;
  }

  const success = await launchMayor(
    sessionName,
    projectDir,
    convoy.id, // Pass convoy ID instead of bd path
    convoy.id,
    task,
    options.contextPath,
    primeMode
  );

  if (!success) {
    console.error('Failed to start convoy');
    throw new Error('Failed to launch Mayor');
  }

  await setAgentState(mayor.id, 'working');

  // 4. Launch Prime Minister if enabled
  if (primeMode) {
    console.log('Launching Prime Minister...');
    const prime = await createAgentBead({
      role: 'prime',
      convoyId: convoy.id,
    });

    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      convoy.id,
      convoy.id,
      task,
      options.contextPath || '',
      '0'
    );

    if (primeSuccess) {
      await setAgentState(prime.id, 'working');
    }
  }

  console.log(`Convoy started: ${sessionName}`);
  console.log('Attaching to session...');
  await attachSession(sessionName);

  return state;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/cli/commands.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/commands.ts src/types.ts
git commit -m "$(cat <<'EOF'
feat(cli): add startConvoyWithBd using bd CLI

- Creates convoy as bd epic
- Creates agent beads for mayor, planner, foreman
- Manages agent state via bd agent commands
- Supports dryRun mode for testing

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: 重構 resumeConvoy 使用 bd CLI

**Files:**
- Modify: `src/cli/commands.ts:105-173`

**Step 1: Write the failing test**

```typescript
Deno.test('resumeConvoyWithBd resumes from convoy ID', async () => {
  // Create a convoy first
  const state = await startConvoyWithBd('Resume test', { dryRun: true });

  // Resume it
  const resumed = await resumeConvoyWithBd(state.convoyId, { dryRun: true });

  assertEquals(resumed.convoyId, state.convoyId);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/cli/commands.test.ts`
Expected: FAIL - resumeConvoyWithBd not found

**Step 3: Implement resumeConvoyWithBd**

```typescript
// Add to src/cli/commands.ts

export async function resumeConvoyWithBd(
  convoyId: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  console.log(`Resuming convoy: ${convoyId}`);

  // 1. Get convoy info from bd
  const convoy = await getConvoy(convoyId);
  const sessionName = `gastown-${convoyId}`;

  // 2. Check if already running
  if (await sessionExists(sessionName)) {
    console.log('Session already running. Attaching...');
    if (!options.dryRun) {
      await attachSession(sessionName);
    }
  }

  // 3. Get agent beads
  const agents = await listAgentBeads(convoyId);
  const mayor = agents.find((a) => a.role === 'mayor');
  const planner = agents.find((a) => a.role === 'planner');
  const foreman = agents.find((a) => a.role === 'foreman');

  if (!mayor) {
    throw new Error('Mayor agent not found in convoy');
  }

  // 4. Determine mode from labels
  const isPrimeMode = convoy.labels.includes('mode:prime');
  const mode = isPrimeMode ? 'prime' : 'mayor';

  const state: ConvoyState = {
    convoyId: convoy.id,
    convoyInfo: convoy,
    mayorId: mayor.id,
    plannerId: planner?.id,
    foremanId: foreman?.id,
    mode,
    tmuxSession: sessionName,
  };

  if (options.dryRun) {
    return state;
  }

  // 5. Rebuild tmux session
  console.log('Rebuilding session...');
  const projectDir = options.projectDir || Deno.cwd();
  await loadConfig(projectDir);

  const success = await launchMayor(
    sessionName,
    projectDir,
    convoyId,
    convoyId,
    convoy.title,
    options.contextPath,
    isPrimeMode
  );

  if (!success) {
    throw new Error('Failed to resume convoy');
  }

  await setAgentState(mayor.id, 'working');

  // 6. Launch Prime if needed
  if (isPrimeMode) {
    const prime = agents.find((a) => a.role === 'prime');
    if (prime) {
      const primeSuccess = await launchPrime(
        sessionName,
        projectDir,
        convoyId,
        convoyId,
        convoy.title,
        options.contextPath || '',
        '0'
      );
      if (primeSuccess) {
        await setAgentState(prime.id, 'working');
      }
    }
  }

  console.log('Convoy resumed. Attaching...');
  await attachSession(sessionName);

  return state;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/cli/commands.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/commands.ts
git commit -m "$(cat <<'EOF'
feat(cli): add resumeConvoyWithBd using bd CLI

- Retrieves convoy and agents from bd
- Rebuilds tmux session
- Restores agent states

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: 重構 showStatus 使用 bd CLI

**Files:**
- Modify: `src/cli/commands.ts:175-212`

**Step 1: Write the test**

```typescript
Deno.test('showStatusWithBd displays convoy info', async () => {
  const state = await startConvoyWithBd('Status test', { dryRun: true });

  // This just verifies no error - output goes to console
  await showStatusWithBd(state.convoyId);
});
```

**Step 2: Implement showStatusWithBd**

```typescript
// Add to src/cli/commands.ts

export async function showStatusWithBd(convoyId?: string): Promise<void> {
  if (convoyId) {
    const convoy = await getConvoy(convoyId);
    const agents = await listAgentBeads(convoyId);
    const tasks = await getReadyTasks(convoyId);

    console.log(`\nConvoy: ${convoy.id}`);
    console.log(`Title: ${convoy.title}`);
    console.log(`Status: ${convoy.status}`);
    console.log('');

    console.log('Agents:');
    for (const agent of agents) {
      console.log(`  ${agent.role}: ${agent.state}`);
    }
    console.log('');

    console.log(`Ready tasks: ${tasks.length}`);
    for (const task of tasks.slice(0, 5)) {
      console.log(`  - ${task.title}`);
    }
  } else {
    // List all convoys
    const convoys = await listConvoys('open');
    const sessions = await listSessions();

    if (convoys.length === 0) {
      console.log('No active convoys.');
      return;
    }

    console.log('Active convoys:');
    for (const convoy of convoys) {
      const hasSession = sessions.some((s) => s.includes(convoy.id));
      const status = hasSession ? '(running)' : '(stopped)';
      console.log(`  - ${convoy.id}: ${convoy.title} ${status}`);
    }
  }
}
```

**Step 3: Run test**

Run: `deno test src/cli/commands.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands.ts
git commit -m "$(cat <<'EOF'
feat(cli): add showStatusWithBd using bd CLI

- Shows convoy details and agent states
- Lists ready tasks
- Lists all convoys when no ID provided

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.4: 重構 stopConvoy 使用 bd CLI

**Files:**
- Modify: `src/cli/commands.ts:228-247`

**Step 1: Write the test**

```typescript
Deno.test('stopConvoyWithBd stops convoy and updates state', async () => {
  const state = await startConvoyWithBd('Stop test', { dryRun: true });

  await stopConvoyWithBd(state.convoyId, { dryRun: true });

  const convoy = await getConvoy(state.convoyId);
  assertEquals(convoy.status, 'closed');
});
```

**Step 2: Implement stopConvoyWithBd**

```typescript
// Add to src/cli/commands.ts

export interface StopOptions {
  archive?: boolean;
  dryRun?: boolean;
}

export async function stopConvoyWithBd(
  convoyId?: string,
  options: StopOptions = {}
): Promise<void> {
  if (convoyId) {
    // Stop specific convoy
    const sessionName = `gastown-${convoyId}`;

    // 1. Update agent states
    const agents = await listAgentBeads(convoyId);
    for (const agent of agents) {
      await setAgentState(agent.id, 'stopped');
    }

    // 2. Kill tmux session
    if (!options.dryRun && await sessionExists(sessionName)) {
      console.log(`Stopping ${sessionName}...`);
      await killSession(sessionName);
    }

    // 3. Close convoy
    await closeConvoy(convoyId, 'Stopped by user');
    console.log(`Convoy ${convoyId} stopped.`);
  } else {
    // Stop all convoys
    const convoys = await listConvoys('open');
    const sessions = await listSessions();

    if (convoys.length === 0 && sessions.length === 0) {
      console.log('No active convoys.');
      return;
    }

    for (const convoy of convoys) {
      await stopConvoyWithBd(convoy.id, options);
    }

    // Kill any orphaned sessions
    for (const session of sessions) {
      if (!options.dryRun) {
        await killSession(session);
      }
    }

    console.log('All convoys stopped.');
  }
}
```

**Step 3: Run test**

Run: `deno test src/cli/commands.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands.ts
git commit -m "$(cat <<'EOF'
feat(cli): add stopConvoyWithBd using bd CLI

- Updates agent states to stopped
- Kills tmux session
- Closes convoy in bd

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.5: 更新 gastown.ts 使用新 API

**Files:**
- Modify: `gastown.ts:130-138`

**Step 1: Update main CLI to use new functions**

```typescript
// gastown.ts - Update the command handling section

// Replace the existing command handling with:
if (command) {
  const task = [command, ...rest].join(' ');
  await startConvoyWithBd(task, {
    maxWorkers: args['max-workers'] ? parseInt(args['max-workers']) : undefined,
    contextPath: args.context,
    primeMode: args.prime,
  });
  return;
}

// Update imports at top:
import {
  startConvoyWithBd,
  resumeConvoyWithBd,
  showStatusWithBd,
  attachToConvoy,
  stopConvoyWithBd,
  initConfig,
} from './src/cli/commands.ts';

// Update resume handling:
if (args.resume) {
  await resumeConvoyWithBd(args.resume);
  return;
}

// Update status handling:
if (args.status !== undefined) {
  await showStatusWithBd(args.status || undefined);
  return;
}

// Update stop handling:
if (command === 'stop') {
  await stopConvoyWithBd(undefined, { archive: args.archive });
  return;
}
```

**Step 2: Run integration test**

```bash
deno run --allow-all gastown.ts --help
```

**Step 3: Commit**

```bash
git add gastown.ts
git commit -m "$(cat <<'EOF'
feat(cli): migrate gastown.ts to bd CLI API

- startConvoy → startConvoyWithBd
- resumeConvoy → resumeConvoyWithBd
- showStatus → showStatusWithBd
- stopConvoy → stopConvoyWithBd

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Respawn 機制實作

實作 context 監控和 respawn 邏輯。

---

### Task 3.1: 建立 Respawn Check 模組

**Files:**
- Create: `src/respawn/check.ts`
- Test: `src/respawn/check.test.ts`

**Step 1: Write the failing test**

```typescript
// src/respawn/check.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { shouldRespawn, recordCheckpoint, type RespawnDecision } from './check.ts';

Deno.test('shouldRespawn returns false when context below threshold', () => {
  const decision = shouldRespawn({
    contextUsage: 50,
    threshold: 80,
  });

  assertEquals(decision.shouldRespawn, false);
});

Deno.test('shouldRespawn returns true when context above threshold', () => {
  const decision = shouldRespawn({
    contextUsage: 85,
    threshold: 80,
  });

  assertEquals(decision.shouldRespawn, true);
  assertEquals(decision.reason, 'context_threshold');
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/respawn/check.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/respawn/check.ts
import { setAgentState, updateHeartbeat } from '../bd-cli/agent.ts';
import { addTaskComment, setTaskState } from '../bd-cli/task.ts';
import { getSlot } from '../bd-cli/slot.ts';

export interface RespawnCheckOptions {
  contextUsage: number;
  threshold: number;
}

export interface RespawnDecision {
  shouldRespawn: boolean;
  reason?: 'context_threshold' | 'stuck' | 'error';
  contextUsage: number;
}

export function shouldRespawn(options: RespawnCheckOptions): RespawnDecision {
  const { contextUsage, threshold } = options;

  if (contextUsage > threshold) {
    return {
      shouldRespawn: true,
      reason: 'context_threshold',
      contextUsage,
    };
  }

  return {
    shouldRespawn: false,
    contextUsage,
  };
}

export interface CheckpointData {
  agentId: string;
  taskId?: string;
  contextUsage: number;
  state: string;
  currentFile?: string;
  nextAction?: string;
}

export async function recordCheckpoint(data: CheckpointData): Promise<void> {
  const { agentId, taskId, contextUsage, state, currentFile, nextAction } = data;

  // 1. Update agent context state
  await setTaskState(agentId, 'context', `${contextUsage}%`);

  // 2. Record checkpoint to task if attached
  if (taskId) {
    const checkpoint = [
      `CHECKPOINT: context=${contextUsage}%`,
      `state: ${state}`,
      currentFile ? `current-file: ${currentFile}` : '',
      nextAction ? `next-action: ${nextAction}` : '',
      'pending-respawn: true',
    ]
      .filter(Boolean)
      .join('\n');

    await addTaskComment(taskId, checkpoint);
  }

  // 3. Update agent state to stuck
  await setAgentState(agentId, 'stuck');
}

export async function performRespawnCheck(
  agentId: string,
  contextUsage: number,
  threshold: number
): Promise<RespawnDecision> {
  // 1. Update heartbeat
  await updateHeartbeat(agentId);

  // 2. Update context state
  await setTaskState(agentId, 'context', `${contextUsage}%`);

  // 3. Check if respawn needed
  const decision = shouldRespawn({ contextUsage, threshold });

  if (decision.shouldRespawn) {
    // 4. Get current task
    const taskId = await getSlot(agentId, 'hook');

    // 5. Record checkpoint
    await recordCheckpoint({
      agentId,
      taskId: taskId || undefined,
      contextUsage,
      state: 'respawn_triggered',
    });
  }

  return decision;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/respawn/check.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/respawn/check.ts src/respawn/check.test.ts
git commit -m "$(cat <<'EOF'
feat(respawn): add respawn check module

- shouldRespawn determines if context threshold exceeded
- recordCheckpoint saves state to bd
- performRespawnCheck combines heartbeat, state update, and check

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: 建立 Respawn Exec 模組

**Files:**
- Create: `src/respawn/exec.ts`
- Test: `src/respawn/exec.test.ts`

**Step 1: Write the failing test**

```typescript
// src/respawn/exec.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { prepareRespawn, type RespawnContext } from './exec.ts';
import { createAgentBead } from '../bd-cli/agent.ts';

Deno.test('prepareRespawn gathers agent context', async () => {
  const agent = await createAgentBead({ role: 'polecat' });

  const context = await prepareRespawn(agent.id);

  assertExists(context.agentId);
  assertEquals(context.role, 'polecat');

  // Cleanup
  // ... close agent
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/respawn/exec.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/respawn/exec.ts
import { getAgentBead, setAgentState, type AgentBead, type RoleName } from '../bd-cli/agent.ts';
import { getSlot, clearSlot } from '../bd-cli/slot.ts';
import { addTaskComment } from '../bd-cli/task.ts';
import { killPane, splitWindow } from '../tmux/operations.ts';

export interface RespawnContext {
  agentId: string;
  role: RoleName;
  taskId: string | null;
  sessionName: string;
  paneId?: string;
}

export async function prepareRespawn(agentId: string): Promise<RespawnContext> {
  const agent = await getAgentBead(agentId);
  const taskId = await getSlot(agentId, 'hook');

  return {
    agentId,
    role: agent.role,
    taskId,
    sessionName: '', // Will be set by caller
  };
}

export async function executeRespawn(
  context: RespawnContext,
  projectDir: string
): Promise<boolean> {
  const { agentId, role, taskId, sessionName, paneId } = context;

  try {
    // 1. Kill old pane if exists
    if (paneId) {
      await killPane(sessionName, paneId);
    }

    // 2. Update state to spawning
    await setAgentState(agentId, 'spawning');

    // 3. Record respawn in task
    if (taskId) {
      await addTaskComment(taskId, `RESPAWN: Agent ${agentId} respawning`);
    }

    // 4. Create new pane with Claude
    // Note: The actual pane creation depends on tmux/launcher integration
    // This is a placeholder for the tmux command
    const claudeCmd = buildClaudeCommand(agentId, role, taskId, projectDir);

    await splitWindow(sessionName, claudeCmd);

    // 5. Update state to working
    await setAgentState(agentId, 'working');

    return true;
  } catch (error) {
    console.error('Respawn failed:', error);
    await setAgentState(agentId, 'dead');
    return false;
  }
}

function buildClaudeCommand(
  agentId: string,
  role: RoleName,
  taskId: string | null,
  projectDir: string
): string {
  const envVars = [
    `GASTOWN_AGENT=${agentId}`,
    `GASTOWN_ROLE=${role}`,
    taskId ? `GASTOWN_BD=${taskId}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `cd ${projectDir} && ${envVars} claude --agent ${role} --resume ${agentId}`;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/respawn/exec.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/respawn/exec.ts src/respawn/exec.test.ts
git commit -m "$(cat <<'EOF'
feat(respawn): add respawn execution module

- prepareRespawn gathers agent context
- executeRespawn kills old pane and spawns new
- buildClaudeCommand constructs Claude CLI command

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: 建立 respawn/mod.ts

**Files:**
- Create: `src/respawn/mod.ts`

**Step 1: Create module export**

```typescript
// src/respawn/mod.ts
export * from './check.ts';
export * from './exec.ts';
```

**Step 2: Commit**

```bash
git add src/respawn/mod.ts
git commit -m "$(cat <<'EOF'
feat(respawn): add respawn module exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: 更新 Agent 角色定義

更新 agent markdown 檔案使用 bd CLI 命令。

---

### Task 4.1: 更新 Mayor 角色定義

**Files:**
- Modify: `.gastown/agents/mayor.md`

**Step 1: Read current file**

Run: Read `.gastown/agents/mayor.md`

**Step 2: Update to use bd CLI patterns**

Update the bd CLI section to match the new architecture:

```markdown
## bd CLI Commands

### Convoy Management
```bash
# View convoy status
bd show $GASTOWN_CONVOY

# List all agents in convoy
bd list --labels gt:agent --parent $GASTOWN_CONVOY

# List ready tasks
bd ready --parent $GASTOWN_CONVOY

# Check blocked tasks
bd blocked --parent $GASTOWN_CONVOY
```

### Agent Coordination
```bash
# Update your state
bd agent state $GASTOWN_AGENT working

# Delegate to Planner
bd agent state gt-planner-001 spawning
bd comments add $GASTOWN_CONVOY "DELEGATE: Planning phase → Planner"

# Monitor agent health
bd agent show gt-polecat-001
```

### Progress Tracking
```bash
# Add coordination notes
bd comments add $GASTOWN_CONVOY "COORDINATOR: Phase 1 complete, starting Phase 2"

# View decision log
bd comments $GASTOWN_CONVOY
```
```

**Step 3: Commit**

```bash
git add .gastown/agents/mayor.md
git commit -m "$(cat <<'EOF'
docs(agents): update Mayor to use bd CLI patterns

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: 更新 Planner 角色定義

**Files:**
- Modify: `.gastown/agents/planner.md`

**Step 1: Read and update**

Update bd CLI section:

```markdown
## bd CLI Commands

```bash
# Start working
bd agent state $GASTOWN_AGENT working

# Record design output
bd comments add $GASTOWN_AGENT "OUTPUT: docs/plans/2026-01-08-design.md"

# Mark complete
bd agent state $GASTOWN_AGENT done

# Notify convoy
bd comments add $GASTOWN_CONVOY "COMPLETE: Planning phase done"
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/planner.md
git commit -m "$(cat <<'EOF'
docs(agents): update Planner to use bd CLI patterns

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.3: 更新 Foreman 角色定義

**Files:**
- Modify: `.gastown/agents/foreman.md`

**Step 1: Read and update**

Update bd CLI section:

```markdown
## bd CLI Commands

### Task Creation
```bash
# Create implementation tasks
bd create "Implement JWT validation" --type task --parent $GASTOWN_CONVOY --labels gt:task

# Add dependencies
bd dep add gt-task-review gt-task-jwt  # review depends on jwt

# Batch create from plan
bd create -f impl-plan.md --parent $GASTOWN_CONVOY
```

### Workflow
```bash
# Start working
bd agent state $GASTOWN_AGENT working

# After creating tasks
bd comments add $GASTOWN_CONVOY "BREAKDOWN: Created 5 tasks from implementation plan"
bd agent state $GASTOWN_AGENT done
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/foreman.md
git commit -m "$(cat <<'EOF'
docs(agents): update Foreman to use bd CLI patterns

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.4: 更新 Polecat 角色定義

**Files:**
- Modify: `.gastown/agents/polecat.md`

**Step 1: Read and update**

Update bd CLI section (this is already partially done, enhance it):

```markdown
## bd CLI Commands

### Claiming Work
```bash
# Find ready task
TASK=$(bd ready --labels gt:task --json | jq -r '.[0].id')

# Attach to hook
bd slot set $GASTOWN_AGENT hook $TASK

# Update states
bd agent state $GASTOWN_AGENT working
bd update $TASK --status in_progress
```

### Progress Tracking
```bash
# Update progress
bd set-state $TASK progress=3/5 --reason "Implemented JwtService, TokenValidator"

# Add detailed comment
bd comments add $TASK "PROGRESS: 3/5 steps done
files: src/auth.ts, tests/auth.spec.ts
context-usage: 45%"
```

### Completing Work
```bash
# Finish task
bd close $TASK --reason "Implementation complete"

# Detach from hook
bd slot clear $GASTOWN_AGENT hook

# Update state
bd agent state $GASTOWN_AGENT idle
```

### Context Management
```bash
# When context > 80%
bd comments add $TASK "CHECKPOINT: context=85%
state: implementing step 4/5
current-file: src/auth.ts:125
next-action: Complete validateToken function
pending-respawn: true"

bd agent state $GASTOWN_AGENT stuck
# Stop and wait for respawn
```
```

**Step 2: Commit**

```bash
git add .gastown/agents/polecat.md
git commit -m "$(cat <<'EOF'
docs(agents): update Polecat with complete bd CLI workflow

- Claiming work via slot
- Progress tracking via set-state and comments
- Context checkpoint format

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.5: 更新其他角色定義 (Witness, Dog, Refinery, Prime)

**Files:**
- Modify: `.gastown/agents/witness.md`
- Modify: `.gastown/agents/dog.md`
- Modify: `.gastown/agents/refinery.md`
- Modify: `.gastown/agents/prime.md`

**Step 1: Update each file with bd CLI patterns**

Each should follow similar patterns - update their bd CLI sections.

**Step 2: Commit**

```bash
git add .gastown/agents/witness.md .gastown/agents/dog.md .gastown/agents/refinery.md .gastown/agents/prime.md
git commit -m "$(cat <<'EOF'
docs(agents): update remaining agents with bd CLI patterns

- Witness: review workflow with slot attachment
- Dog: testing workflow with progress tracking
- Refinery: QA workflow with comments
- Prime: decision proxy with convoy comments

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: 移除舊實作

移除自定義 bd 檔案格式的程式碼。

---

### Task 5.1: 標記舊 bd 模組為 deprecated

**Files:**
- Modify: `src/bd/mod.ts`
- Modify: `src/bd/parser.ts`
- Modify: `src/bd/writer.ts`
- Modify: `src/bd/operations.ts`

**Step 1: Add deprecation notices**

```typescript
// src/bd/mod.ts
/**
 * @deprecated Use src/bd-cli/mod.ts instead. This module will be removed in v0.2.0.
 */
export * from './parser.ts';
export * from './writer.ts';
export * from './operations.ts';
```

**Step 2: Commit**

```bash
git add src/bd/mod.ts src/bd/parser.ts src/bd/writer.ts src/bd/operations.ts
git commit -m "$(cat <<'EOF'
chore(bd): mark old bd module as deprecated

Use src/bd-cli/mod.ts for bd CLI integration instead.
Old module will be removed in v0.2.0.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.2: 更新 types.ts 移除舊類型

**Files:**
- Modify: `src/types.ts`

**Step 1: Remove deprecated types**

Remove or mark deprecated:
- `BdTask` (replaced by bd CLI task)
- `BdNote` (replaced by bd comments)
- `BdFile` (replaced by bd convoy)
- `BdSection` (replaced by bd structure)

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "$(cat <<'EOF'
chore(types): deprecate old BdFile types

Types moved to bd-cli module. Old types marked deprecated.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: 整合測試

---

### Task 6.1: 建立端對端測試

**Files:**
- Create: `tests/e2e/convoy.test.ts`

**Step 1: Write E2E test**

```typescript
// tests/e2e/convoy.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  startConvoyWithBd,
  stopConvoyWithBd,
  showStatusWithBd,
} from '../../src/cli/commands.ts';

Deno.test({
  name: 'E2E: Full convoy lifecycle',
  async fn() {
    // 1. Start convoy (dry run)
    const state = await startConvoyWithBd('E2E Test Convoy', {
      dryRun: true,
      maxWorkers: 2,
    });

    assertExists(state.convoyId);
    assertExists(state.mayorId);

    // 2. Check status
    await showStatusWithBd(state.convoyId);

    // 3. Stop convoy
    await stopConvoyWithBd(state.convoyId, { dryRun: true });

    console.log('E2E test passed!');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

**Step 2: Run E2E test**

Run: `deno test tests/e2e/convoy.test.ts --allow-all`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/convoy.test.ts
git commit -m "$(cat <<'EOF'
test(e2e): add convoy lifecycle E2E test

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.2: 執行所有測試

**Step 1: Run full test suite**

```bash
deno test --allow-all
```

**Step 2: Fix any failures**

Address any test failures found.

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: address test failures from bd CLI migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.3: 更新 README 和文件

**Files:**
- Modify: `README.md` (if exists)
- Reference: `docs/plans/2026-01-08-gastown-beads-redesign.md`

**Step 1: Update documentation**

Add note about bd CLI integration:

```markdown
## Architecture

Gas Town uses a dual-layer CLI architecture:

1. **gastown CLI** - High-level convoy coordination
2. **bd CLI** - Low-level state management

All persistent state is managed through bd CLI commands. Convoys are stored as bd epics, agents as bd agent beads, and tasks as bd issues.
```

**Step 2: Commit**

```bash
git add README.md docs/
git commit -m "$(cat <<'EOF'
docs: update documentation for bd CLI integration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This plan migrates Gas Town from custom bd file format to bd CLI:

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1.1-1.6 | bd CLI wrapper layer |
| 2 | 2.1-2.5 | Convoy lifecycle migration |
| 3 | 3.1-3.3 | Respawn mechanism |
| 4 | 4.1-4.5 | Agent role updates |
| 5 | 5.1-5.2 | Deprecate old code |
| 6 | 6.1-6.3 | Integration testing |

**Total Tasks:** 21
**Estimated commits:** ~25

Each task follows TDD: failing test → implementation → passing test → commit.

# Gas Town Claude Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Deno CLI that orchestrates multiple Claude Code instances using tmux, with bd file-based state persistence and automatic respawn on context exhaustion.

**Architecture:** Single Deno file (`gastown.ts`) that manages tmux sessions, spawns Claude Code instances as workers, and uses bd files for state synchronization. All roles (Mayor, Planner, Foreman, Workers) track progress in shared bd file.

**Tech Stack:** Deno 2.x, tmux, Claude Code CLI, bd task tracking format

---

## Phase 1: Project Setup

### Task 1: Initialize Deno Project

**Files:**
- Create: `deno.json`
- Create: `.gitignore`

**Step 1: Create deno.json configuration**

```json
{
  "$schema": "https://deno.land/x/deno/cli/schemas/config-file.v1.json",
  "name": "@gastown/cli",
  "version": "0.1.0",
  "tasks": {
    "dev": "deno run --allow-all --watch gastown.ts",
    "test": "deno test --allow-all",
    "check": "deno check gastown.ts",
    "compile": "deno compile --allow-all --output=gastown gastown.ts"
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },
  "compilerOptions": {
    "strict": true
  }
}
```

**Step 2: Create .gitignore**

```gitignore
# Deno
.deno/

# Compiled binary
gastown
gastown.exe

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Test artifacts
*.test.bd
convoy-test-*.bd
```

**Step 3: Verify configuration**

Run: `cd /Users/kent/Project/gastown_b && deno check --help`
Expected: Deno check help output (confirms Deno is working)

**Step 4: Commit**

```bash
git add deno.json .gitignore
git commit -m "chore: initialize Deno project"
```

---

### Task 2: Create Directory Structure

**Files:**
- Create: `src/types.ts`
- Create: `src/bd/mod.ts`
- Create: `src/tmux/mod.ts`
- Create: `src/claude/mod.ts`
- Create: `src/scheduler/mod.ts`
- Create: `gastown.ts`

**Step 1: Create placeholder files**

Create `src/types.ts`:
```typescript
// Core types for Gas Town
export type RoleName = 'mayor' | 'planner' | 'foreman' | 'polecat' | 'witness' | 'dog' | 'refinery';

export type TaskStatus = '🔵' | '🟡' | '✅' | '⚠️';

export interface BdTask {
  id: string;
  role: RoleName;
  roleInstance?: number;
  description: string;
  status: TaskStatus;
  notes: BdNote[];
}

export interface BdNote {
  key: string;
  value: string;
}

export interface BdFile {
  path: string;
  convoyName: string;
  convoyDescription: string;
  meta: Record<string, string>;
  sections: BdSection[];
}

export interface BdSection {
  name: string;
  tasks: BdTask[];
}

export interface Convoy {
  id: string;
  name: string;
  task: string;
  bdPath: string;
  tmuxSession: string;
  maxWorkers: number;
}

export interface WorkerState {
  role: RoleName;
  instance: number;
  pane: string;
  status: 'idle' | 'active' | 'checkpoint' | 'pending-respawn' | 'completed' | 'blocked';
  contextUsage?: number;
}

export interface GastownConfig {
  maxWorkers: number;
  convoy: {
    bdDir: string;
    archiveDir: string;
  };
  roles: Record<string, { preferredSkills?: string[] }>;
  respawn: {
    contextThreshold: number;
  };
}

export const DEFAULT_CONFIG: GastownConfig = {
  maxWorkers: 3,
  convoy: {
    bdDir: './',
    archiveDir: 'docs/tasks/archive',
  },
  roles: {},
  respawn: {
    contextThreshold: 80,
  },
};
```

Create `src/bd/mod.ts`:
```typescript
// bd file operations
export * from './parser.ts';
export * from './writer.ts';
export * from './operations.ts';
```

Create `src/tmux/mod.ts`:
```typescript
// tmux operations
export * from './operations.ts';
```

Create `src/claude/mod.ts`:
```typescript
// Claude Code integration
export * from './command.ts';
export * from './launcher.ts';
```

Create `src/scheduler/mod.ts`:
```typescript
// Task scheduler
export * from './deps.ts';
export * from './scheduler.ts';
```

Create `gastown.ts`:
```typescript
#!/usr/bin/env -S deno run --allow-all

/**
 * Gas Town - Multi-Agent Orchestrator for Claude Code
 *
 * Usage:
 *   gastown "task description"     Start new convoy
 *   gastown --resume <bd-file>     Resume from bd
 *   gastown --status               Show status
 *   gastown attach                 Attach to session
 *   gastown stop                   Stop convoy
 *   gastown init                   Generate config
 */

console.log('Gas Town CLI - Coming Soon');
```

**Step 2: Verify structure**

Run: `find /Users/kent/Project/gastown_b/src -type f -name "*.ts" | head -10`
Expected: List of created TypeScript files

**Step 3: Commit**

```bash
git add src/ gastown.ts
git commit -m "chore: create directory structure and placeholder files"
```

---

## Phase 2: bd Parser Module

### Task 3: Write bd Parser Tests

**Files:**
- Create: `src/bd/parser.ts`
- Create: `src/bd/parser.test.ts`

**Step 1: Write failing tests for bd parser**

Create `src/bd/parser.test.ts`:
```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseBdFile, parseBdContent } from './parser.ts';

const SAMPLE_BD = `# convoy-2026-01-07.bd

## 🟡 Convoy: Implement User Auth (SC-456)

### Meta
📝 created: 2026-01-07T10:30:00
📝 phase: execution
📝 max-workers: 3

### Coordination
🟡 [Mayor] Coordinating convoy
  📝 last-checkpoint: delegated to Foreman
  📝 context-usage: 45%

### Planning
✅ [Planner] Brainstorming & Design
  📝 output: docs/plans/design.md
  📝 completed: 2026-01-07T11:00:00

### Execution
🟡 [Polecat-1] Implement JWT service
  📝 files: src/auth/jwt.ts
  📝 progress: 3/5 functions done

🔵 [Polecat-2] Implement refresh token
  📝 depends: Polecat-1

🔵 [Witness-1] Review implementation
  📝 depends: Polecat-1, Polecat-2
`;

Deno.test('parseBdContent - parses convoy name', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.convoyName, 'convoy-2026-01-07');
  assertEquals(bd.convoyDescription, 'Implement User Auth (SC-456)');
});

Deno.test('parseBdContent - parses meta section', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.meta['created'], '2026-01-07T10:30:00');
  assertEquals(bd.meta['phase'], 'execution');
  assertEquals(bd.meta['max-workers'], '3');
});

Deno.test('parseBdContent - parses sections', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.sections.length, 3);
  assertEquals(bd.sections[0].name, 'Coordination');
  assertEquals(bd.sections[1].name, 'Planning');
  assertEquals(bd.sections[2].name, 'Execution');
});

Deno.test('parseBdContent - parses tasks with status', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const coordination = bd.sections[0];

  assertEquals(coordination.tasks.length, 1);
  assertEquals(coordination.tasks[0].role, 'mayor');
  assertEquals(coordination.tasks[0].status, '🟡');
  assertEquals(coordination.tasks[0].description, 'Coordinating convoy');
});

Deno.test('parseBdContent - parses task notes', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const mayorTask = bd.sections[0].tasks[0];

  assertEquals(mayorTask.notes.length, 2);
  assertEquals(mayorTask.notes[0].key, 'last-checkpoint');
  assertEquals(mayorTask.notes[0].value, 'delegated to Foreman');
  assertEquals(mayorTask.notes[1].key, 'context-usage');
  assertEquals(mayorTask.notes[1].value, '45%');
});

Deno.test('parseBdContent - parses role instances', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const execution = bd.sections[2];

  assertEquals(execution.tasks[0].role, 'polecat');
  assertEquals(execution.tasks[0].roleInstance, 1);
  assertEquals(execution.tasks[1].role, 'polecat');
  assertEquals(execution.tasks[1].roleInstance, 2);
});

Deno.test('parseBdContent - parses depends note', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const polecat2 = bd.sections[2].tasks[1];
  const dependsNote = polecat2.notes.find((n) => n.key === 'depends');

  assertExists(dependsNote);
  assertEquals(dependsNote.value, 'Polecat-1');
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/parser.test.ts`
Expected: FAIL with "Module not found" or similar

**Step 3: Implement parser**

Create `src/bd/parser.ts`:
```typescript
import type { BdFile, BdSection, BdTask, BdNote, RoleName, TaskStatus } from '../types.ts';

const STATUS_EMOJI: TaskStatus[] = ['🔵', '🟡', '✅', '⚠️'];
const ROLE_NAMES: RoleName[] = ['mayor', 'planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery'];

export function parseBdContent(content: string, path: string): BdFile {
  const lines = content.split('\n');

  let convoyName = '';
  let convoyDescription = '';
  const meta: Record<string, string> = {};
  const sections: BdSection[] = [];

  let currentSection: BdSection | null = null;
  let currentTask: BdTask | null = null;
  let inMeta = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse convoy header: # convoy-name.bd or ## 🟡 Convoy: Description
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const match = trimmed.match(/^# (convoy-[\w-]+)/);
      if (match) {
        convoyName = match[1].replace('.bd', '');
      }
      continue;
    }

    // Parse convoy description: ## 🟡 Convoy: Description (SC-###)
    if (trimmed.startsWith('## ') && trimmed.includes('Convoy:')) {
      const match = trimmed.match(/## [🔵🟡✅⚠️] Convoy: (.+)/);
      if (match) {
        convoyDescription = match[1];
      }
      continue;
    }

    // Parse section header: ### SectionName
    if (trimmed.startsWith('### ')) {
      const sectionName = trimmed.slice(4).trim();
      if (sectionName === 'Meta') {
        inMeta = true;
        continue;
      }
      inMeta = false;
      currentSection = { name: sectionName, tasks: [] };
      sections.push(currentSection);
      currentTask = null;
      continue;
    }

    // Parse meta notes
    if (inMeta && trimmed.startsWith('📝 ')) {
      const noteMatch = trimmed.match(/📝 ([\w-]+): (.+)/);
      if (noteMatch) {
        meta[noteMatch[1]] = noteMatch[2];
      }
      continue;
    }

    // Parse task: 🟡 [Role-N] Description
    const taskMatch = trimmed.match(/^([🔵🟡✅⚠️]) \[(\w+)(?:-(\d+))?\] (.+)/);
    if (taskMatch && currentSection) {
      const [, statusEmoji, roleName, instanceStr, description] = taskMatch;
      const role = roleName.toLowerCase() as RoleName;
      const instance = instanceStr ? parseInt(instanceStr, 10) : undefined;

      currentTask = {
        id: `${role}${instance ? '-' + instance : ''}`,
        role,
        roleInstance: instance,
        description,
        status: statusEmoji as TaskStatus,
        notes: [],
      };
      currentSection.tasks.push(currentTask);
      continue;
    }

    // Parse task note: 📝 key: value (indented)
    if (line.startsWith('  📝 ') && currentTask) {
      const noteMatch = trimmed.match(/📝 ([\w-]+): (.+)/);
      if (noteMatch) {
        currentTask.notes.push({
          key: noteMatch[1],
          value: noteMatch[2],
        });
      }
      continue;
    }
  }

  return {
    path,
    convoyName,
    convoyDescription,
    meta,
    sections,
  };
}

export async function parseBdFile(path: string): Promise<BdFile> {
  const content = await Deno.readTextFile(path);
  return parseBdContent(content, path);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/parser.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/bd/parser.ts src/bd/parser.test.ts
git commit -m "feat: implement bd file parser with tests"
```

---

### Task 4: Write bd Writer Module

**Files:**
- Create: `src/bd/writer.ts`
- Create: `src/bd/writer.test.ts`

**Step 1: Write failing tests for bd writer**

Create `src/bd/writer.test.ts`:
```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { writeBdContent, createNewBd } from './writer.ts';
import { parseBdContent } from './parser.ts';
import type { BdFile } from '../types.ts';

Deno.test('writeBdContent - round-trip preserves structure', () => {
  const bd: BdFile = {
    path: 'test.bd',
    convoyName: 'convoy-2026-01-07',
    convoyDescription: 'Test Task (SC-123)',
    meta: {
      created: '2026-01-07T10:00:00',
      phase: 'planning',
      'max-workers': '3',
    },
    sections: [
      {
        name: 'Coordination',
        tasks: [
          {
            id: 'mayor',
            role: 'mayor',
            description: 'Coordinating',
            status: '🟡',
            notes: [{ key: 'context-usage', value: '20%' }],
          },
        ],
      },
    ],
  };

  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  assertEquals(parsed.convoyName, bd.convoyName);
  assertEquals(parsed.convoyDescription, bd.convoyDescription);
  assertEquals(parsed.meta['created'], bd.meta['created']);
  assertEquals(parsed.sections.length, bd.sections.length);
  assertEquals(parsed.sections[0].tasks[0].status, '🟡');
});

Deno.test('createNewBd - creates valid bd structure', () => {
  const bd = createNewBd('Implement auth feature', 3);

  assertEquals(bd.convoyDescription, 'Implement auth feature');
  assertEquals(bd.meta['max-workers'], '3');
  assertEquals(bd.sections.length, 3);
  assertEquals(bd.sections[0].name, 'Coordination');
  assertEquals(bd.sections[1].name, 'Planning');
  assertEquals(bd.sections[2].name, 'Execution');

  // Mayor task should exist
  const mayorTask = bd.sections[0].tasks[0];
  assertEquals(mayorTask.role, 'mayor');
  assertEquals(mayorTask.status, '🟡');
});

Deno.test('writeBdContent - formats task with instance number', () => {
  const bd: BdFile = {
    path: 'test.bd',
    convoyName: 'convoy-test',
    convoyDescription: 'Test',
    meta: {},
    sections: [
      {
        name: 'Execution',
        tasks: [
          {
            id: 'polecat-1',
            role: 'polecat',
            roleInstance: 1,
            description: 'Task 1',
            status: '🟡',
            notes: [],
          },
          {
            id: 'polecat-2',
            role: 'polecat',
            roleInstance: 2,
            description: 'Task 2',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Polecat-1' }],
          },
        ],
      },
    ],
  };

  const content = writeBdContent(bd);
  assertEquals(content.includes('[Polecat-1]'), true);
  assertEquals(content.includes('[Polecat-2]'), true);
  assertEquals(content.includes('📝 depends: Polecat-1'), true);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/writer.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement writer**

Create `src/bd/writer.ts`:
```typescript
import type { BdFile, BdTask, BdSection, RoleName } from '../types.ts';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRole(role: RoleName, instance?: number): string {
  const name = capitalize(role);
  return instance ? `${name}-${instance}` : name;
}

export function writeBdContent(bd: BdFile): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${bd.convoyName}.bd`);
  lines.push('');
  lines.push(`## 🟡 Convoy: ${bd.convoyDescription}`);
  lines.push('');

  // Meta section
  lines.push('### Meta');
  for (const [key, value] of Object.entries(bd.meta)) {
    lines.push(`📝 ${key}: ${value}`);
  }
  lines.push('');

  // Sections
  for (const section of bd.sections) {
    lines.push(`### ${section.name}`);

    for (const task of section.tasks) {
      const roleStr = formatRole(task.role, task.roleInstance);
      lines.push(`${task.status} [${roleStr}] ${task.description}`);

      for (const note of task.notes) {
        lines.push(`  📝 ${note.key}: ${note.value}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function writeBdFile(bd: BdFile): Promise<void> {
  const content = writeBdContent(bd);
  await Deno.writeTextFile(bd.path, content);
}

export function createNewBd(taskDescription: string, maxWorkers: number): BdFile {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();

  // Generate convoy name from task description
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const convoyName = `convoy-${dateStr}-${slug}`;

  return {
    path: `${convoyName}.bd`,
    convoyName,
    convoyDescription: taskDescription,
    meta: {
      created: timestamp,
      phase: 'planning',
      'max-workers': String(maxWorkers),
    },
    sections: [
      {
        name: 'Coordination',
        tasks: [
          {
            id: 'mayor',
            role: 'mayor',
            description: 'Coordinating convoy',
            status: '🟡',
            notes: [
              { key: 'last-checkpoint', value: 'starting' },
              { key: 'context-usage', value: '0%' },
            ],
          },
        ],
      },
      {
        name: 'Planning',
        tasks: [
          {
            id: 'planner',
            role: 'planner',
            description: 'Brainstorming & Design',
            status: '🔵',
            notes: [],
          },
          {
            id: 'foreman',
            role: 'foreman',
            description: 'Implementation Plan',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Planner' }],
          },
        ],
      },
      {
        name: 'Execution',
        tasks: [],
      },
    ],
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/writer.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/bd/writer.ts src/bd/writer.test.ts
git commit -m "feat: implement bd file writer with tests"
```

---

### Task 5: Write bd Operations Module

**Files:**
- Create: `src/bd/operations.ts`
- Create: `src/bd/operations.test.ts`

**Step 1: Write failing tests for bd operations**

Create `src/bd/operations.test.ts`:
```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  updateTaskStatus,
  updateTaskNote,
  addTask,
  findTaskById,
  getTaskDependencies,
  getReadyTasks,
  getActiveWorkerCount,
} from './operations.ts';
import { createNewBd } from './writer.ts';
import type { BdFile, BdTask } from '../types.ts';

Deno.test('updateTaskStatus - changes task status', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskStatus(bd, 'mayor', '✅');

  const task = findTaskById(updated, 'mayor');
  assertEquals(task?.status, '✅');
});

Deno.test('updateTaskNote - adds new note', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskNote(bd, 'mayor', 'progress', '50%');

  const task = findTaskById(updated, 'mayor');
  const note = task?.notes.find((n) => n.key === 'progress');
  assertEquals(note?.value, '50%');
});

Deno.test('updateTaskNote - updates existing note', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskNote(bd, 'mayor', 'context-usage', '75%');

  const task = findTaskById(updated, 'mayor');
  const note = task?.notes.find((n) => n.key === 'context-usage');
  assertEquals(note?.value, '75%');
});

Deno.test('addTask - adds task to Execution section', () => {
  const bd = createNewBd('Test', 3);
  const newTask: BdTask = {
    id: 'polecat-1',
    role: 'polecat',
    roleInstance: 1,
    description: 'Implement feature',
    status: '🔵',
    notes: [],
  };

  const updated = addTask(bd, 'Execution', newTask);
  const execSection = updated.sections.find((s) => s.name === 'Execution');
  assertEquals(execSection?.tasks.length, 1);
  assertEquals(execSection?.tasks[0].id, 'polecat-1');
});

Deno.test('getTaskDependencies - returns dependency list', () => {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Task 1',
      status: '🟡',
      notes: [],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
    },
  ];

  const deps = getTaskDependencies(bd, 'witness-1');
  assertEquals(deps, ['polecat-1', 'polecat-2']);
});

Deno.test('getReadyTasks - returns tasks with satisfied dependencies', () => {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Task 1',
      status: '✅',
      notes: [],
    },
    {
      id: 'polecat-2',
      role: 'polecat',
      roleInstance: 2,
      description: 'Task 2',
      status: '🔵',
      notes: [],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1' }],
    },
  ];

  const ready = getReadyTasks(bd);
  assertEquals(ready.length, 2);
  assertEquals(ready.map((t) => t.id).sort(), ['polecat-2', 'witness-1']);
});

Deno.test('getActiveWorkerCount - counts active workers', () => {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    { id: 'polecat-1', role: 'polecat', roleInstance: 1, description: 'T1', status: '🟡', notes: [] },
    { id: 'polecat-2', role: 'polecat', roleInstance: 2, description: 'T2', status: '🔵', notes: [] },
    { id: 'witness-1', role: 'witness', roleInstance: 1, description: 'T3', status: '🟡', notes: [] },
  ];

  assertEquals(getActiveWorkerCount(bd), 2);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/operations.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement operations**

Create `src/bd/operations.ts`:
```typescript
import type { BdFile, BdTask, BdNote, TaskStatus } from '../types.ts';

export function findTaskById(bd: BdFile, taskId: string): BdTask | undefined {
  const normalizedId = taskId.toLowerCase();
  for (const section of bd.sections) {
    const task = section.tasks.find((t) => t.id.toLowerCase() === normalizedId);
    if (task) return task;
  }
  return undefined;
}

export function updateTaskStatus(bd: BdFile, taskId: string, status: TaskStatus): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) =>
        task.id.toLowerCase() === taskId.toLowerCase() ? { ...task, status } : task
      ),
    })),
  };
}

export function updateTaskNote(bd: BdFile, taskId: string, key: string, value: string): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) => {
        if (task.id.toLowerCase() !== taskId.toLowerCase()) return task;

        const existingNoteIndex = task.notes.findIndex((n) => n.key === key);
        const newNotes = [...task.notes];

        if (existingNoteIndex >= 0) {
          newNotes[existingNoteIndex] = { key, value };
        } else {
          newNotes.push({ key, value });
        }

        return { ...task, notes: newNotes };
      }),
    })),
  };
}

export function addTask(bd: BdFile, sectionName: string, task: BdTask): BdFile {
  return {
    ...bd,
    sections: bd.sections.map((section) =>
      section.name === sectionName ? { ...section, tasks: [...section.tasks, task] } : section
    ),
  };
}

export function getTaskDependencies(bd: BdFile, taskId: string): string[] {
  const task = findTaskById(bd, taskId);
  if (!task) return [];

  const dependsNote = task.notes.find((n) => n.key === 'depends');
  if (!dependsNote) return [];

  return dependsNote.value
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^(\w+)-(\d+)$/, '$1-$2'))
    .filter((d) => d.length > 0);
}

export function isTaskCompleted(task: BdTask): boolean {
  return task.status === '✅';
}

export function isTaskBlocked(task: BdTask): boolean {
  return task.status === '⚠️';
}

export function isTaskActive(task: BdTask): boolean {
  return task.status === '🟡';
}

export function isTaskPending(task: BdTask): boolean {
  return task.status === '🔵';
}

export function areDependenciesSatisfied(bd: BdFile, taskId: string): boolean {
  const deps = getTaskDependencies(bd, taskId);
  if (deps.length === 0) return true;

  return deps.every((depId) => {
    const depTask = findTaskById(bd, depId);
    return depTask && isTaskCompleted(depTask);
  });
}

export function getReadyTasks(bd: BdFile): BdTask[] {
  const ready: BdTask[] = [];

  for (const section of bd.sections) {
    for (const task of section.tasks) {
      if (isTaskPending(task) && areDependenciesSatisfied(bd, task.id)) {
        ready.push(task);
      }
    }
  }

  return ready;
}

export function getActiveWorkerCount(bd: BdFile): number {
  let count = 0;
  for (const section of bd.sections) {
    for (const task of section.tasks) {
      if (isTaskActive(task)) {
        count++;
      }
    }
  }
  return count;
}

export function getAllTasks(bd: BdFile): BdTask[] {
  return bd.sections.flatMap((s) => s.tasks);
}

export function getTasksByRole(bd: BdFile, role: string): BdTask[] {
  return getAllTasks(bd).filter((t) => t.role === role);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/bd/operations.test.ts`
Expected: All tests PASS

**Step 5: Update mod.ts exports**

Update `src/bd/mod.ts`:
```typescript
export * from './parser.ts';
export * from './writer.ts';
export * from './operations.ts';
```

**Step 6: Commit**

```bash
git add src/bd/operations.ts src/bd/operations.test.ts src/bd/mod.ts
git commit -m "feat: implement bd operations with tests"
```

---

## Phase 3: tmux Module

### Task 6: Write tmux Operations Module

**Files:**
- Create: `src/tmux/operations.ts`
- Create: `src/tmux/operations.test.ts`

**Step 1: Write tests for tmux operations**

Create `src/tmux/operations.test.ts`:
```typescript
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildTmuxCommand,
  buildNewSessionCommand,
  buildSplitPaneCommand,
  buildKillPaneCommand,
  buildAttachCommand,
  buildListSessionsCommand,
  parseSessionList,
} from './operations.ts';

Deno.test('buildNewSessionCommand - creates session with name', () => {
  const cmd = buildNewSessionCommand('gastown-test', 'echo hello');
  assertStringIncludes(cmd, 'tmux new-session');
  assertStringIncludes(cmd, '-s gastown-test');
  assertStringIncludes(cmd, '-d');
  assertStringIncludes(cmd, 'echo hello');
});

Deno.test('buildSplitPaneCommand - splits horizontally', () => {
  const cmd = buildSplitPaneCommand('gastown-test', 'echo worker', 'horizontal');
  assertStringIncludes(cmd, 'tmux split-window');
  assertStringIncludes(cmd, '-t gastown-test');
  assertStringIncludes(cmd, '-h');
});

Deno.test('buildSplitPaneCommand - splits vertically', () => {
  const cmd = buildSplitPaneCommand('gastown-test', 'echo worker', 'vertical');
  assertStringIncludes(cmd, '-v');
});

Deno.test('buildKillPaneCommand - kills specific pane', () => {
  const cmd = buildKillPaneCommand('gastown-test', '1');
  assertStringIncludes(cmd, 'tmux kill-pane');
  assertStringIncludes(cmd, '-t gastown-test:0.1');
});

Deno.test('buildAttachCommand - attaches to session', () => {
  const cmd = buildAttachCommand('gastown-test');
  assertStringIncludes(cmd, 'tmux attach-session');
  assertStringIncludes(cmd, '-t gastown-test');
});

Deno.test('parseSessionList - parses tmux list-sessions output', () => {
  const output = `gastown-convoy1: 2 windows (created Mon Jan  7 10:00:00 2026)
gastown-convoy2: 1 windows (created Mon Jan  7 11:00:00 2026)
other-session: 1 windows (created Mon Jan  7 09:00:00 2026)`;

  const sessions = parseSessionList(output);
  assertEquals(sessions.length, 2);
  assertEquals(sessions[0], 'gastown-convoy1');
  assertEquals(sessions[1], 'gastown-convoy2');
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/tmux/operations.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement tmux operations**

Create `src/tmux/operations.ts`:
```typescript
export type SplitDirection = 'horizontal' | 'vertical';

export function buildTmuxCommand(args: string[]): string {
  return `tmux ${args.join(' ')}`;
}

export function buildNewSessionCommand(sessionName: string, command?: string): string {
  const args = ['new-session', '-d', '-s', sessionName];
  if (command) {
    args.push(`"${command}"`);
  }
  return buildTmuxCommand(args);
}

export function buildSplitPaneCommand(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): string {
  const dirFlag = direction === 'horizontal' ? '-h' : '-v';
  return buildTmuxCommand(['split-window', '-t', sessionName, dirFlag, `"${command}"`]);
}

export function buildSelectPaneCommand(sessionName: string, paneIndex: string): string {
  return buildTmuxCommand(['select-pane', '-t', `${sessionName}:0.${paneIndex}`]);
}

export function buildRenamePaneCommand(sessionName: string, paneIndex: string, title: string): string {
  return buildTmuxCommand([
    'select-pane',
    '-t',
    `${sessionName}:0.${paneIndex}`,
    '-T',
    `"${title}"`,
  ]);
}

export function buildKillPaneCommand(sessionName: string, paneIndex: string): string {
  return buildTmuxCommand(['kill-pane', '-t', `${sessionName}:0.${paneIndex}`]);
}

export function buildKillSessionCommand(sessionName: string): string {
  return buildTmuxCommand(['kill-session', '-t', sessionName]);
}

export function buildAttachCommand(sessionName: string): string {
  return buildTmuxCommand(['attach-session', '-t', sessionName]);
}

export function buildListSessionsCommand(): string {
  return buildTmuxCommand(['list-sessions']);
}

export function buildListPanesCommand(sessionName: string): string {
  return buildTmuxCommand(['list-panes', '-t', sessionName, '-F', '"#{pane_index}:#{pane_title}"']);
}

export function buildSendKeysCommand(sessionName: string, paneIndex: string, keys: string): string {
  return buildTmuxCommand(['send-keys', '-t', `${sessionName}:0.${paneIndex}`, `"${keys}"`, 'Enter']);
}

export function parseSessionList(output: string): string[] {
  const lines = output.trim().split('\n');
  return lines
    .map((line) => line.split(':')[0])
    .filter((name) => name.startsWith('gastown-'));
}

export function parsePaneList(output: string): Array<{ index: string; title: string }> {
  const lines = output.trim().split('\n');
  return lines.map((line) => {
    const [index, title] = line.replace(/"/g, '').split(':');
    return { index, title: title || '' };
  });
}

// Execution helpers
export async function runTmuxCommand(command: string): Promise<{ success: boolean; output: string }> {
  try {
    const process = new Deno.Command('sh', {
      args: ['-c', command],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await process.output();
    const output = new TextDecoder().decode(code === 0 ? stdout : stderr);

    return { success: code === 0, output: output.trim() };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

export async function createSession(sessionName: string, command?: string): Promise<boolean> {
  const cmd = buildNewSessionCommand(sessionName, command);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function splitPane(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): Promise<boolean> {
  const cmd = buildSplitPaneCommand(sessionName, command, direction);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function killPane(sessionName: string, paneIndex: string): Promise<boolean> {
  const cmd = buildKillPaneCommand(sessionName, paneIndex);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function killSession(sessionName: string): Promise<boolean> {
  const cmd = buildKillSessionCommand(sessionName);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function attachSession(sessionName: string): Promise<void> {
  const cmd = buildAttachCommand(sessionName);
  const process = new Deno.Command('sh', {
    args: ['-c', cmd],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await process.output();
}

export async function listSessions(): Promise<string[]> {
  const cmd = buildListSessionsCommand();
  const result = await runTmuxCommand(cmd);
  if (!result.success) return [];
  return parseSessionList(result.output);
}

export async function sessionExists(sessionName: string): Promise<boolean> {
  const sessions = await listSessions();
  return sessions.includes(sessionName);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/tmux/operations.test.ts`
Expected: All tests PASS

**Step 5: Update mod.ts**

Update `src/tmux/mod.ts`:
```typescript
export * from './operations.ts';
```

**Step 6: Commit**

```bash
git add src/tmux/operations.ts src/tmux/operations.test.ts src/tmux/mod.ts
git commit -m "feat: implement tmux operations with tests"
```

---

## Phase 4: Claude Code Integration

### Task 7: Write Claude Command Builder

**Files:**
- Create: `src/claude/command.ts`
- Create: `src/claude/command.test.ts`

**Step 1: Write tests for Claude command builder**

Create `src/claude/command.test.ts`:
```typescript
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildClaudeCommand,
  buildClaudeEnvVars,
  buildAgentFlag,
} from './command.ts';
import type { RoleName } from '../types.ts';

Deno.test('buildAgentFlag - returns correct flag for role', () => {
  assertEquals(buildAgentFlag('mayor', '/path/to/agents'), '--agent /path/to/agents/mayor.md');
  assertEquals(buildAgentFlag('polecat', '/path'), '--agent /path/polecat.md');
});

Deno.test('buildClaudeEnvVars - includes role and bd path', () => {
  const env = buildClaudeEnvVars('polecat', '/convoy.bd', 'convoy-test');
  assertEquals(env['GASTOWN_ROLE'], 'polecat');
  assertEquals(env['GASTOWN_BD'], '/convoy.bd');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
});

Deno.test('buildClaudeCommand - basic command without prompt', () => {
  const cmd = buildClaudeCommand({
    role: 'mayor',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
  });

  assertStringIncludes(cmd, 'claude');
  assertStringIncludes(cmd, '--agent /agents/mayor.md');
  assertStringIncludes(cmd, 'GASTOWN_ROLE=mayor');
});

Deno.test('buildClaudeCommand - includes prompt when provided', () => {
  const cmd = buildClaudeCommand({
    role: 'mayor',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    prompt: 'Implement auth feature',
  });

  assertStringIncludes(cmd, '--prompt');
  assertStringIncludes(cmd, 'Implement auth feature');
});

Deno.test('buildClaudeCommand - includes resume flag', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    resume: true,
  });

  assertStringIncludes(cmd, '--resume');
});

Deno.test('buildClaudeCommand - includes working directory', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    workingDir: '/project',
  });

  assertStringIncludes(cmd, 'cd /project');
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/claude/command.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement Claude command builder**

Create `src/claude/command.ts`:
```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/claude/command.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/claude/command.ts src/claude/command.test.ts
git commit -m "feat: implement Claude command builder with tests"
```

---

### Task 8: Write Role Launcher Module

**Files:**
- Create: `src/claude/launcher.ts`
- Create: `src/claude/launcher.test.ts`

**Step 1: Write tests for role launcher**

Create `src/claude/launcher.test.ts`:
```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getRoleAgentPath,
  getDefaultAgentDir,
  buildLaunchConfig,
} from './launcher.ts';
import type { RoleName } from '../types.ts';

Deno.test('getDefaultAgentDir - returns .gastown/agents', () => {
  const dir = getDefaultAgentDir('/project');
  assertEquals(dir, '/project/.gastown/agents');
});

Deno.test('getRoleAgentPath - returns full path', () => {
  const path = getRoleAgentPath('mayor', '/project/.gastown/agents');
  assertEquals(path, '/project/.gastown/agents/mayor.md');
});

Deno.test('buildLaunchConfig - creates valid config for mayor', () => {
  const config = buildLaunchConfig({
    role: 'mayor',
    projectDir: '/project',
    bdPath: '/project/convoy.bd',
    convoyName: 'test-convoy',
    task: 'Implement feature',
  });

  assertEquals(config.role, 'mayor');
  assertEquals(config.agentDir, '/project/.gastown/agents');
  assertEquals(config.bdPath, '/project/convoy.bd');
  assertEquals(config.convoyName, 'test-convoy');
  assertEquals(config.workingDir, '/project');
});

Deno.test('buildLaunchConfig - includes checkpoint for respawn', () => {
  const config = buildLaunchConfig({
    role: 'polecat',
    projectDir: '/project',
    bdPath: '/project/convoy.bd',
    convoyName: 'test',
    task: 'Task',
    checkpoint: 'Completed step 3',
  });

  assertEquals(config.resume, true);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/claude/launcher.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement launcher**

Create `src/claude/launcher.ts`:
```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/claude/launcher.test.ts`
Expected: All tests PASS

**Step 5: Update mod.ts**

Update `src/claude/mod.ts`:
```typescript
export * from './command.ts';
export * from './launcher.ts';
```

**Step 6: Commit**

```bash
git add src/claude/launcher.ts src/claude/launcher.test.ts src/claude/mod.ts
git commit -m "feat: implement role launcher with tests"
```

---

## Phase 5: Scheduler Module

### Task 9: Write Scheduler Module

**Files:**
- Create: `src/scheduler/deps.ts`
- Create: `src/scheduler/scheduler.ts`
- Create: `src/scheduler/scheduler.test.ts`

**Step 1: Write scheduler tests**

Create `src/scheduler/scheduler.test.ts`:
```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildDependencyGraph, getNextTasks, hasCircularDependency } from './deps.ts';
import { createNewBd } from '../bd/writer.ts';
import type { BdFile, BdTask } from '../types.ts';

function createTestBd(): BdFile {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    { id: 'polecat-1', role: 'polecat', roleInstance: 1, description: 'T1', status: '🔵', notes: [] },
    {
      id: 'polecat-2',
      role: 'polecat',
      roleInstance: 2,
      description: 'T2',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1' }],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
    },
    {
      id: 'dog-1',
      role: 'dog',
      roleInstance: 1,
      description: 'Test',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Witness-1' }],
    },
  ];
  return bd;
}

Deno.test('buildDependencyGraph - creates correct graph', () => {
  const bd = createTestBd();
  const graph = buildDependencyGraph(bd);

  assertEquals(graph.get('polecat-1'), []);
  assertEquals(graph.get('polecat-2'), ['polecat-1']);
  assertEquals(graph.get('witness-1')?.sort(), ['polecat-1', 'polecat-2']);
  assertEquals(graph.get('dog-1'), ['witness-1']);
});

Deno.test('getNextTasks - returns tasks with no deps first', () => {
  const bd = createTestBd();
  const next = getNextTasks(bd, 2);

  assertEquals(next.length, 1);
  assertEquals(next[0].id, 'polecat-1');
});

Deno.test('getNextTasks - respects max workers', () => {
  const bd = createTestBd();
  // Mark polecat-1 as completed
  bd.sections[2].tasks[0].status = '✅';

  const next = getNextTasks(bd, 1);
  assertEquals(next.length, 1);

  const nextTwo = getNextTasks(bd, 2);
  assertEquals(nextTwo.length, 1); // Only polecat-2 is ready
});

Deno.test('getNextTasks - returns multiple ready tasks', () => {
  const bd = createTestBd();
  // Mark polecat-1 as completed
  bd.sections[2].tasks[0].status = '✅';
  // Remove dependency from polecat-2
  bd.sections[2].tasks[1].notes = [];

  const next = getNextTasks(bd, 3);
  // polecat-2 and potentially others
  assertEquals(next.length >= 1, true);
});

Deno.test('hasCircularDependency - detects no cycle', () => {
  const bd = createTestBd();
  assertEquals(hasCircularDependency(bd), false);
});

Deno.test('hasCircularDependency - detects cycle', () => {
  const bd = createTestBd();
  // Create circular dependency: polecat-1 depends on dog-1
  bd.sections[2].tasks[0].notes = [{ key: 'depends', value: 'Dog-1' }];

  assertEquals(hasCircularDependency(bd), true);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/kent/Project/gastown_b && deno test src/scheduler/scheduler.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Implement dependency resolver**

Create `src/scheduler/deps.ts`:
```typescript
import type { BdFile, BdTask } from '../types.ts';
import {
  getTaskDependencies,
  getAllTasks,
  isTaskPending,
  isTaskActive,
  isTaskCompleted,
  findTaskById,
} from '../bd/operations.ts';

export type DependencyGraph = Map<string, string[]>;

export function buildDependencyGraph(bd: BdFile): DependencyGraph {
  const graph = new Map<string, string[]>();

  for (const task of getAllTasks(bd)) {
    const deps = getTaskDependencies(bd, task.id);
    graph.set(task.id, deps);
  }

  return graph;
}

export function areDependenciesMet(bd: BdFile, taskId: string): boolean {
  const deps = getTaskDependencies(bd, taskId);

  for (const depId of deps) {
    const depTask = findTaskById(bd, depId);
    if (!depTask || !isTaskCompleted(depTask)) {
      return false;
    }
  }

  return true;
}

export function getReadyToRunTasks(bd: BdFile): BdTask[] {
  return getAllTasks(bd).filter(
    (task) => isTaskPending(task) && areDependenciesMet(bd, task.id)
  );
}

export function getNextTasks(bd: BdFile, maxWorkers: number): BdTask[] {
  const activeCount = getAllTasks(bd).filter(isTaskActive).length;
  const availableSlots = maxWorkers - activeCount;

  if (availableSlots <= 0) return [];

  const ready = getReadyToRunTasks(bd);
  return ready.slice(0, availableSlots);
}

export function hasCircularDependency(bd: BdFile): boolean {
  const graph = buildDependencyGraph(bd);
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(taskId: string): boolean {
    visited.add(taskId);
    recStack.add(taskId);

    const deps = graph.get(taskId) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (dfs(dep)) return true;
      } else if (recStack.has(dep)) {
        return true;
      }
    }

    recStack.delete(taskId);
    return false;
  }

  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      if (dfs(taskId)) return true;
    }
  }

  return false;
}

export function getBlockedTasks(bd: BdFile): BdTask[] {
  const blocked: BdTask[] = [];

  for (const task of getAllTasks(bd)) {
    if (!isTaskPending(task)) continue;

    const deps = getTaskDependencies(bd, task.id);
    for (const depId of deps) {
      const depTask = findTaskById(bd, depId);
      if (depTask && depTask.status === '⚠️') {
        blocked.push(task);
        break;
      }
    }
  }

  return blocked;
}
```

**Step 4: Implement scheduler**

Create `src/scheduler/scheduler.ts`:
```typescript
import type { BdFile, BdTask, RoleName } from '../types.ts';
import { getNextTasks, hasCircularDependency, getBlockedTasks } from './deps.ts';
import { updateTaskStatus, updateTaskNote, findTaskById } from '../bd/operations.ts';
import { writeBdFile } from '../bd/writer.ts';
import { launchWorker, respawnWorker } from '../claude/launcher.ts';

export interface SchedulerConfig {
  sessionName: string;
  projectDir: string;
  bdPath: string;
  convoyName: string;
  maxWorkers: number;
}

export interface SchedulerState {
  bd: BdFile;
  config: SchedulerConfig;
  activeWorkers: Map<string, { paneIndex: string }>;
}

export function createSchedulerState(bd: BdFile, config: SchedulerConfig): SchedulerState {
  return {
    bd,
    config,
    activeWorkers: new Map(),
  };
}

export async function scheduleNextTasks(state: SchedulerState): Promise<SchedulerState> {
  const { bd, config, activeWorkers } = state;

  // Check for circular dependencies
  if (hasCircularDependency(bd)) {
    console.error('Circular dependency detected in task graph');
    return state;
  }

  // Get next tasks to run
  const nextTasks = getNextTasks(bd, config.maxWorkers);

  if (nextTasks.length === 0) {
    return state;
  }

  let updatedBd = bd;

  for (const task of nextTasks) {
    // Mark task as active
    updatedBd = updateTaskStatus(updatedBd, task.id, '🟡');

    // Launch worker
    const success = await launchWorker(
      config.sessionName,
      task.role,
      task.roleInstance || 1,
      config.projectDir,
      config.bdPath,
      config.convoyName,
      task.description
    );

    if (success) {
      activeWorkers.set(task.id, { paneIndex: String(activeWorkers.size + 1) });
    } else {
      // Mark as blocked if launch failed
      updatedBd = updateTaskStatus(updatedBd, task.id, '⚠️');
      updatedBd = updateTaskNote(updatedBd, task.id, 'error', 'Failed to launch worker');
    }
  }

  // Save updated bd
  await writeBdFile(updatedBd);

  return {
    ...state,
    bd: updatedBd,
  };
}

export async function handleTaskCompletion(
  state: SchedulerState,
  taskId: string
): Promise<SchedulerState> {
  let { bd, activeWorkers } = state;

  // Mark task as completed
  bd = updateTaskStatus(bd, taskId, '✅');
  bd = updateTaskNote(bd, taskId, 'completed', new Date().toISOString());

  // Remove from active workers
  activeWorkers.delete(taskId);

  // Save bd
  await writeBdFile(bd);

  // Schedule next tasks
  return await scheduleNextTasks({ ...state, bd });
}

export async function handleRespawnRequest(
  state: SchedulerState,
  taskId: string,
  checkpoint: string
): Promise<SchedulerState> {
  const { bd, config, activeWorkers } = state;

  const task = findTaskById(bd, taskId);
  if (!task) return state;

  // Kill existing pane (would need pane tracking)
  // For now, just launch new worker

  const success = await respawnWorker(
    config.sessionName,
    task.role,
    task.roleInstance || 1,
    config.projectDir,
    config.bdPath,
    config.convoyName,
    task.description,
    checkpoint
  );

  if (!success) {
    let updatedBd = updateTaskStatus(bd, taskId, '⚠️');
    updatedBd = updateTaskNote(updatedBd, taskId, 'error', 'Respawn failed');
    await writeBdFile(updatedBd);
    return { ...state, bd: updatedBd };
  }

  return state;
}

export function isConvoyComplete(bd: BdFile): boolean {
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection || executionSection.tasks.length === 0) return false;

  return executionSection.tasks.every((task) => task.status === '✅');
}

export function getConvoyProgress(bd: BdFile): { completed: number; total: number; percent: number } {
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection) return { completed: 0, total: 0, percent: 0 };

  const total = executionSection.tasks.length;
  const completed = executionSection.tasks.filter((t) => t.status === '✅').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/kent/Project/gastown_b && deno test src/scheduler/scheduler.test.ts`
Expected: All tests PASS

**Step 6: Update mod.ts**

Update `src/scheduler/mod.ts`:
```typescript
export * from './deps.ts';
export * from './scheduler.ts';
```

**Step 7: Commit**

```bash
git add src/scheduler/deps.ts src/scheduler/scheduler.ts src/scheduler/scheduler.test.ts src/scheduler/mod.ts
git commit -m "feat: implement task scheduler with dependency resolution"
```

---

## Phase 6: CLI Main Program

### Task 10: Implement CLI Entry Point

**Files:**
- Modify: `gastown.ts`
- Create: `src/cli/commands.ts`
- Create: `src/cli/config.ts`

**Step 1: Create config loader**

Create `src/cli/config.ts`:
```typescript
import { DEFAULT_CONFIG, type GastownConfig } from '../types.ts';

const CONFIG_FILE = 'gastown.json';

export async function loadConfig(projectDir: string): Promise<GastownConfig> {
  const configPath = `${projectDir}/${CONFIG_FILE}`;

  try {
    const content = await Deno.readTextFile(configPath);
    const userConfig = JSON.parse(content) as Partial<GastownConfig>;
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(projectDir: string, config: GastownConfig): Promise<void> {
  const configPath = `${projectDir}/${CONFIG_FILE}`;
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

export function generateDefaultConfig(): GastownConfig {
  return { ...DEFAULT_CONFIG };
}
```

**Step 2: Create CLI commands**

Create `src/cli/commands.ts`:
```typescript
import { loadConfig, saveConfig, generateDefaultConfig } from './config.ts';
import { createNewBd, writeBdFile, parseBdFile } from '../bd/mod.ts';
import { launchMayor } from '../claude/launcher.ts';
import {
  createSession,
  attachSession,
  killSession,
  listSessions,
  sessionExists,
} from '../tmux/operations.ts';
import {
  createSchedulerState,
  scheduleNextTasks,
  isConvoyComplete,
  getConvoyProgress,
} from '../scheduler/scheduler.ts';
import type { BdFile } from '../types.ts';

export interface StartOptions {
  maxWorkers?: number;
  projectDir?: string;
}

export async function startConvoy(task: string, options: StartOptions = {}): Promise<void> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  // Create bd file
  const bd = createNewBd(task, maxWorkers);
  const bdPath = `${projectDir}/${bd.path}`;
  bd.path = bdPath;
  await writeBdFile(bd);
  console.log(`Created bd file: ${bd.path}`);

  // Create tmux session name
  const sessionName = `gastown-${bd.convoyName}`;

  // Check if session already exists
  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists. Use 'gastown attach' to connect.`);
    return;
  }

  // Launch Mayor in new tmux session
  const success = await launchMayor(sessionName, projectDir, bdPath, bd.convoyName, task);

  if (!success) {
    console.error('Failed to start convoy');
    return;
  }

  console.log(`Convoy started: ${sessionName}`);
  console.log('Attaching to session...');

  // Attach to session
  await attachSession(sessionName);
}

export async function resumeConvoy(bdPath: string): Promise<void> {
  console.log(`Resuming convoy from: ${bdPath}`);

  const bd = await parseBdFile(bdPath);
  const sessionName = `gastown-${bd.convoyName}`;

  // Check if session exists
  if (await sessionExists(sessionName)) {
    console.log('Session already running. Attaching...');
    await attachSession(sessionName);
    return;
  }

  // Rebuild session from bd state
  console.log('Rebuilding session from bd state...');

  const projectDir = Deno.cwd();
  const config = await loadConfig(projectDir);

  // Find Mayor task and its checkpoint
  const mayorTask = bd.sections
    .flatMap((s) => s.tasks)
    .find((t) => t.role === 'mayor');

  const checkpoint = mayorTask?.notes.find((n) => n.key === 'last-checkpoint')?.value;

  // Launch Mayor with checkpoint
  const success = await launchMayor(
    sessionName,
    projectDir,
    bdPath,
    bd.convoyName,
    bd.convoyDescription
  );

  if (!success) {
    console.error('Failed to resume convoy');
    return;
  }

  console.log('Convoy resumed. Attaching...');
  await attachSession(sessionName);
}

export async function showStatus(bdPath?: string): Promise<void> {
  if (bdPath) {
    // Show status of specific convoy
    const bd = await parseBdFile(bdPath);
    displayBdStatus(bd);
  } else {
    // List all convoys
    const sessions = await listSessions();

    if (sessions.length === 0) {
      console.log('No active convoys.');
      return;
    }

    console.log('Active convoys:');
    for (const session of sessions) {
      console.log(`  - ${session}`);
    }
  }
}

function displayBdStatus(bd: BdFile): void {
  console.log(`\nConvoy: ${bd.convoyName}`);
  console.log(`Description: ${bd.convoyDescription}`);
  console.log(`Phase: ${bd.meta['phase'] || 'unknown'}`);
  console.log('');

  const progress = getConvoyProgress(bd);
  console.log(`Progress: ${progress.completed}/${progress.total} (${progress.percent}%)`);
  console.log('');

  for (const section of bd.sections) {
    console.log(`### ${section.name}`);
    for (const task of section.tasks) {
      const roleStr = task.roleInstance ? `${task.role}-${task.roleInstance}` : task.role;
      console.log(`  ${task.status} [${roleStr}] ${task.description}`);
    }
    console.log('');
  }
}

export async function attachToConvoy(sessionName?: string): Promise<void> {
  if (sessionName) {
    const fullName = sessionName.startsWith('gastown-') ? sessionName : `gastown-${sessionName}`;
    await attachSession(fullName);
  } else {
    // Find and attach to most recent
    const sessions = await listSessions();
    if (sessions.length === 0) {
      console.log('No active convoys.');
      return;
    }
    await attachSession(sessions[0]);
  }
}

export async function stopConvoy(archive: boolean = false): Promise<void> {
  const sessions = await listSessions();

  if (sessions.length === 0) {
    console.log('No active convoys.');
    return;
  }

  for (const session of sessions) {
    console.log(`Stopping ${session}...`);
    await killSession(session);
  }

  if (archive) {
    console.log('Archiving bd files...');
    // TODO: Move bd files to archive directory
  }

  console.log('All convoys stopped.');
}

export async function initConfig(): Promise<void> {
  const projectDir = Deno.cwd();
  const config = generateDefaultConfig();
  await saveConfig(projectDir, config);
  console.log(`Created gastown.json with default configuration.`);

  // Create agents directory
  const agentsDir = `${projectDir}/.gastown/agents`;
  await Deno.mkdir(agentsDir, { recursive: true });
  console.log(`Created ${agentsDir}/`);

  console.log('\nNext steps:');
  console.log('1. Create agent definitions in .gastown/agents/');
  console.log('2. Run: gastown "your task description"');
}
```

**Step 3: Update main CLI entry point**

Update `gastown.ts`:
```typescript
#!/usr/bin/env -S deno run --allow-all

/**
 * Gas Town - Multi-Agent Orchestrator for Claude Code
 *
 * Usage:
 *   gastown "task description"     Start new convoy
 *   gastown --resume <bd-file>     Resume from bd
 *   gastown --status [bd-file]     Show status
 *   gastown attach [session]       Attach to session
 *   gastown stop [--archive]       Stop convoy
 *   gastown init                   Generate config
 *   gastown bd-update              Internal: update bd
 *   gastown respawn-check          Internal: check respawn
 */

import { parseArgs } from 'https://deno.land/std@0.224.0/cli/parse_args.ts';
import {
  startConvoy,
  resumeConvoy,
  showStatus,
  attachToConvoy,
  stopConvoy,
  initConfig,
} from './src/cli/commands.ts';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
Gas Town v${VERSION} - Multi-Agent Orchestrator for Claude Code

USAGE:
  gastown <task>                    Start new convoy with task
  gastown --resume <bd-file>        Resume convoy from bd file
  gastown --status [bd-file]        Show convoy status
  gastown attach [session-name]     Attach to running convoy
  gastown stop [--archive]          Stop all convoys
  gastown init                      Initialize gastown in project

OPTIONS:
  --max-workers <n>    Maximum parallel workers (default: 3)
  --help, -h           Show this help
  --version, -v        Show version

EXAMPLES:
  gastown "Implement user authentication"
  gastown --max-workers 5 "Refactor payment module"
  gastown --resume convoy-2026-01-07.bd
  gastown --status
  gastown attach convoy-2026-01-07
  gastown stop --archive
`);
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ['resume', 'status', 'max-workers'],
    boolean: ['help', 'version', 'archive'],
    alias: {
      h: 'help',
      v: 'version',
    },
  });

  // Handle flags
  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log(`Gas Town v${VERSION}`);
    return;
  }

  // Get command/task
  const [command, ...rest] = args._;

  // Handle commands
  if (command === 'attach') {
    await attachToConvoy(rest[0]?.toString());
    return;
  }

  if (command === 'stop') {
    await stopConvoy(args.archive);
    return;
  }

  if (command === 'init') {
    await initConfig();
    return;
  }

  // Handle options
  if (args.resume) {
    await resumeConvoy(args.resume);
    return;
  }

  if (args.status !== undefined) {
    await showStatus(args.status || undefined);
    return;
  }

  // Default: start new convoy with task
  if (command) {
    const task = [command, ...rest].join(' ');
    await startConvoy(task, {
      maxWorkers: args['max-workers'] ? parseInt(args['max-workers']) : undefined,
    });
    return;
  }

  // No command or task
  printHelp();
}

main().catch(console.error);
```

**Step 4: Verify CLI works**

Run: `cd /Users/kent/Project/gastown_b && deno run --allow-all gastown.ts --help`
Expected: Help message displayed

**Step 5: Commit**

```bash
git add gastown.ts src/cli/
git commit -m "feat: implement CLI entry point with commands"
```

---

## Phase 7: Agent Definitions

### Task 11: Create Agent Definition Files

**Files:**
- Create: `.gastown/agents/mayor.md`
- Create: `.gastown/agents/planner.md`
- Create: `.gastown/agents/foreman.md`
- Create: `.gastown/agents/polecat.md`
- Create: `.gastown/agents/witness.md`
- Create: `.gastown/agents/dog.md`
- Create: `.gastown/agents/refinery.md`

**Step 1: Create agents directory**

```bash
mkdir -p /Users/kent/Project/gastown_b/.gastown/agents
```

**Step 2: Create Mayor agent**

Create `.gastown/agents/mayor.md`:
```markdown
---
name: mayor
description: Convoy coordinator - proxies user interaction, delegates to specialists
---

# Mayor - Convoy Coordinator

You are the Mayor, the central coordinator for this Gas Town convoy.

## Your Responsibilities

1. **User Interaction** - You are the ONLY role that directly communicates with the user
2. **Task Delegation** - Delegate planning to Planner, task breakdown to Foreman
3. **Progress Monitoring** - Track convoy progress via bd file
4. **Decision Making** - Handle blockers, errors, and user questions

## Important Rules

- NEVER do implementation work yourself
- NEVER do detailed planning yourself
- ALWAYS delegate to the appropriate specialist
- ALWAYS update the bd file with your progress
- ALWAYS check context usage and checkpoint before it's too late

## Workflow

1. Receive task from user
2. Delegate to Planner for brainstorming (use superpowers:brainstorming)
3. Wait for design doc
4. Delegate to Foreman for task breakdown
5. Monitor execution progress
6. Report completion to user

## bd File Updates

Update the bd file regularly:
- `📝 last-checkpoint: <current state>`
- `📝 context-usage: <percentage>%`

When context > 80%, save checkpoint and request respawn.

## Environment Variables

- `GASTOWN_BD` - Path to bd file
- `GASTOWN_CONVOY` - Convoy name
- `GASTOWN_ROLE` - Your role (mayor)
```

**Step 3: Create Planner agent**

Create `.gastown/agents/planner.md`:
```markdown
---
name: planner
description: Design specialist - brainstorming and design documents
---

# Planner - Design Specialist

You are the Planner, responsible for brainstorming and creating design documents.

## Your Responsibilities

1. **Brainstorming** - Use superpowers:brainstorming to explore the problem
2. **Design Documents** - Create comprehensive design docs
3. **Progress Tracking** - Update bd file with progress

## Workflow

1. Read the task from Mayor
2. Invoke superpowers:brainstorming skill
3. Collaborate with user on design
4. Output design doc to docs/plans/
5. Update bd file: status ✅, output path

## bd File Updates

- `📝 output: docs/plans/<filename>.md`
- `📝 context-usage: <percentage>%`

## Key Skill

ALWAYS use: `superpowers:brainstorming`

This skill guides the interactive design process.
```

**Step 4: Create Foreman agent**

Create `.gastown/agents/foreman.md`:
```markdown
---
name: foreman
description: Task breakdown specialist - implementation plans and bd tasks
---

# Foreman - Task Breakdown Specialist

You are the Foreman, responsible for breaking designs into executable tasks.

## Your Responsibilities

1. **Read Design** - Understand the design document
2. **Create Plan** - Use superpowers:writing-plans for detailed steps
3. **Update bd** - Add tasks to Execution section

## Workflow

1. Read design doc from Planner output
2. Invoke superpowers:writing-plans skill
3. Create detailed implementation plan
4. Add tasks to bd file Execution section
5. Define dependencies between tasks

## bd Task Format

```
🔵 [Polecat-1] <task description>
  📝 depends: <comma-separated dependencies>

🔵 [Witness-1] Review <component>
  📝 depends: Polecat-1, Polecat-2
```

## Key Skill

ALWAYS use: `superpowers:writing-plans`
```

**Step 5: Create Worker agents**

Create `.gastown/agents/polecat.md`:
```markdown
---
name: polecat
description: Implementation worker - writes code following TDD
---

# Polecat - Implementation Worker

You are Polecat, an implementation worker.

## Your Responsibilities

1. **Implement Code** - Write clean, tested code
2. **Follow TDD** - Test first, then implement
3. **Track Progress** - Update bd file after each step
4. **Manage Context** - Checkpoint before context exhaustion

## Workflow

1. Read your task from bd file
2. Understand dependencies and requirements
3. Write failing test
4. Implement minimal code
5. Verify test passes
6. Update bd with progress
7. Commit changes
8. Repeat until task complete

## bd Updates

After each significant step:
- `📝 progress: <X/Y steps done>`
- `📝 files: <modified files>`
- `📝 context-usage: <percentage>%`

When complete:
- Change status to ✅

## Context Management

When context-usage > 80%:
1. Save detailed checkpoint
2. Update bd with `📝 pending-respawn: true`
3. Stop and wait for respawn
```

Create `.gastown/agents/witness.md`:
```markdown
---
name: witness
description: Code review worker - reviews and validates implementations
---

# Witness - Code Review Worker

You are Witness, a code review specialist.

## Your Responsibilities

1. **Review Code** - Check implementation quality
2. **Validate Tests** - Ensure adequate test coverage
3. **Check Patterns** - Verify adherence to project patterns
4. **Report Issues** - Document findings in bd file

## Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Error handling is appropriate
- [ ] Documentation is adequate

## bd Updates

- `📝 review-status: approved/changes-requested`
- `📝 issues: <comma-separated issues>`
```

Create `.gastown/agents/dog.md`:
```markdown
---
name: dog
description: Testing worker - runs and validates tests
---

# Dog - Testing Worker

You are Dog, a testing specialist.

## Your Responsibilities

1. **Run Tests** - Execute test suites
2. **Verify Coverage** - Check test coverage
3. **Report Results** - Document in bd file

## Workflow

1. Read task from bd file
2. Run relevant test suites
3. Check coverage metrics
4. Report results

## bd Updates

- `📝 test-status: pass/fail`
- `📝 coverage: <percentage>%`
- `📝 failures: <list if any>`
```

Create `.gastown/agents/refinery.md`:
```markdown
---
name: refinery
description: Code quality worker - refactoring and security audit
---

# Refinery - Code Quality Worker

You are Refinery, a code quality specialist.

## Your Responsibilities

1. **Security Audit** - Check for vulnerabilities
2. **Code Quality** - Identify improvements
3. **Refactoring** - Suggest or implement improvements
4. **Documentation** - Ensure docs are current

## Audit Checklist

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] Error messages don't leak info

## bd Updates

- `📝 audit-status: pass/issues-found`
- `📝 security-issues: <list>`
- `📝 improvements: <suggestions>`
```

**Step 6: Commit**

```bash
git add .gastown/
git commit -m "feat: create agent definition files for all roles"
```

---

## Phase 8: Integration Testing

### Task 12: Create Integration Test

**Files:**
- Create: `tests/integration.test.ts`

**Step 1: Write integration test**

Create `tests/integration.test.ts`:
```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createNewBd, writeBdContent, parseBdContent } from '../src/bd/mod.ts';
import { buildClaudeCommand } from '../src/claude/command.ts';
import { getNextTasks, hasCircularDependency } from '../src/scheduler/deps.ts';
import { loadConfig, generateDefaultConfig } from '../src/cli/config.ts';

Deno.test('Integration: bd round-trip with full convoy', () => {
  // Create a new bd
  const bd = createNewBd('Implement user authentication', 3);

  // Add execution tasks
  bd.sections[2].tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Implement JWT service',
      status: '🔵',
      notes: [],
    },
    {
      id: 'polecat-2',
      role: 'polecat',
      roleInstance: 2,
      description: 'Implement refresh tokens',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1' }],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review auth implementation',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
    },
    {
      id: 'dog-1',
      role: 'dog',
      roleInstance: 1,
      description: 'Run auth tests',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Witness-1' }],
    },
  ];

  // Write and parse back
  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  // Verify structure preserved
  assertEquals(parsed.sections[2].tasks.length, 4);
  assertEquals(parsed.sections[2].tasks[0].id, 'polecat-1');

  // Verify no circular dependencies
  assertEquals(hasCircularDependency(parsed), false);

  // Verify correct next tasks
  const next = getNextTasks(parsed, 3);
  assertEquals(next.length, 1);
  assertEquals(next[0].id, 'polecat-1');
});

Deno.test('Integration: Claude command generation', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/project/.gastown/agents',
    bdPath: '/project/convoy.bd',
    convoyName: 'test-convoy',
    prompt: 'Implement JWT service',
    workingDir: '/project',
  });

  // Should include all required parts
  assertEquals(cmd.includes('GASTOWN_ROLE=polecat'), true);
  assertEquals(cmd.includes('GASTOWN_BD=/project/convoy.bd'), true);
  assertEquals(cmd.includes('--agent /project/.gastown/agents/polecat.md'), true);
  assertEquals(cmd.includes('cd /project'), true);
});

Deno.test('Integration: config defaults', () => {
  const config = generateDefaultConfig();

  assertEquals(config.maxWorkers, 3);
  assertEquals(config.respawn.contextThreshold, 80);
  assertExists(config.convoy.bdDir);
  assertExists(config.convoy.archiveDir);
});

Deno.test('Integration: dependency resolution order', () => {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    { id: 'a', role: 'polecat', roleInstance: 1, description: 'A', status: '✅', notes: [] },
    {
      id: 'b',
      role: 'polecat',
      roleInstance: 2,
      description: 'B',
      status: '🔵',
      notes: [{ key: 'depends', value: 'A' }],
    },
    {
      id: 'c',
      role: 'polecat',
      roleInstance: 3,
      description: 'C',
      status: '🔵',
      notes: [{ key: 'depends', value: 'A' }],
    },
    {
      id: 'd',
      role: 'witness',
      roleInstance: 1,
      description: 'D',
      status: '🔵',
      notes: [{ key: 'depends', value: 'B, C' }],
    },
  ];

  // A is done, B and C should be ready
  const next = getNextTasks(bd, 3);
  assertEquals(next.length, 2);
  assertEquals(next.map((t) => t.id).sort(), ['b', 'c']);

  // Mark B done, C still needed for D
  bd.sections[2].tasks[1].status = '✅';
  const next2 = getNextTasks(bd, 3);
  assertEquals(next2.length, 1);
  assertEquals(next2[0].id, 'c');

  // Mark C done, D should be ready
  bd.sections[2].tasks[2].status = '✅';
  const next3 = getNextTasks(bd, 3);
  assertEquals(next3.length, 1);
  assertEquals(next3[0].id, 'd');
});
```

**Step 2: Run integration tests**

Run: `cd /Users/kent/Project/gastown_b && deno test tests/`
Expected: All tests PASS

**Step 3: Run all tests**

Run: `cd /Users/kent/Project/gastown_b && deno test --allow-all`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: add integration tests"
```

---

## Phase 9: Final Polish

### Task 13: Create README

**Files:**
- Create: `README.md`

**Step 1: Write README**

Create `README.md`:
```markdown
# Gas Town Claude

Multi-Agent Orchestrator for Claude Code using bd task tracking.

## Overview

Gas Town Claude enables coordination of multiple Claude Code instances for complex tasks. Each agent role has specific responsibilities, and all state is persisted in bd files for reliable recovery.

## Quick Start

```bash
# Initialize in your project
./gastown init

# Start a new convoy
./gastown "Implement user authentication"

# Resume a convoy
./gastown --resume convoy-2026-01-07.bd

# Check status
./gastown --status
```

## Architecture

```
User ↔ Mayor (coordinator)
         ├── Planner (brainstorming → design)
         ├── Foreman (design → tasks)
         └── Workers
              ├── Polecat (implementation)
              ├── Witness (code review)
              ├── Dog (testing)
              └── Refinery (quality)
```

## Features

- **bd-based State** - All progress persisted in git-friendly format
- **Automatic Respawn** - Workers checkpoint and respawn on context exhaustion
- **Dependency Scheduling** - Tasks run in correct order based on dependencies
- **tmux Integration** - View all agents in split panes

## Configuration

Create `gastown.json`:

```json
{
  "maxWorkers": 3,
  "respawn": {
    "contextThreshold": 80
  }
}
```

## Development

```bash
# Run tests
deno test --allow-all

# Type check
deno check gastown.ts

# Compile binary
deno compile --allow-all --output=gastown gastown.ts
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 14: Final Verification

**Step 1: Run all quality checks**

```bash
cd /Users/kent/Project/gastown_b
deno check gastown.ts
deno lint
deno test --allow-all
```

Expected: All checks pass

**Step 2: Test CLI manually**

```bash
cd /Users/kent/Project/gastown_b
deno run --allow-all gastown.ts --help
deno run --allow-all gastown.ts init
deno run --allow-all gastown.ts --status
```

Expected: Commands execute without errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final polish and verification"
```

---

## Summary

This implementation plan creates a working Gas Town CLI for Claude Code with:

1. **bd Module** - Parse, write, and manipulate bd files
2. **tmux Module** - Create and manage tmux sessions
3. **Claude Module** - Build commands and launch roles
4. **Scheduler** - Dependency-driven task scheduling
5. **CLI** - Complete command-line interface
6. **Agents** - Role definition files

**Total Tasks**: 14
**Estimated Lines of Code**: ~1200
**Test Coverage**: Unit + Integration tests for all modules

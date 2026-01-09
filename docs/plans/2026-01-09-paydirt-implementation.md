# Paydirt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Paydirt multi-agent orchestrator with Goldflow execution engine from scratch.

**Architecture:** Two-layer system - Paydirt (semantic/narrative layer) + Goldflow (execution engine). Uses Claude CLI's `--plugin-dir` and `--add-dir` for dynamic resource injection without copying files to user's project.

**Tech Stack:** Deno, TypeScript, tmux, bd CLI, Claude Code CLI

**Reference:** `@2026-01-09-paydirt-goldflow-design.md`

---

## Phase 1: Project Skeleton

### Task 1.1: Initialize Git Repository

**Files:**
- Create: `paydirt/` directory
- Create: `paydirt/.gitignore`

**Step 1: Create directory and initialize git**

```bash
cd /Users/kent/Project/gastown_b
mkdir paydirt
cd paydirt
git init
```

**Step 2: Add remote**

```bash
git remote add origin git@github.com:iamcxa/paydirt.git
```

**Step 3: Create .gitignore**

```gitignore
# Deno
.deno/

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Build
dist/
paydirt-binary

# Local
*.local.*
.env
```

**Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: initialize paydirt repository"
```

---

### Task 1.2: Initialize Deno Project

**Files:**
- Create: `paydirt/deno.json`
- Create: `paydirt/paydirt.ts`

**Step 1: Create deno.json**

```json
{
  "name": "@paydirt/paydirt",
  "version": "0.1.0",
  "exports": "./paydirt.ts",
  "tasks": {
    "dev": "deno run --allow-all --watch paydirt.ts",
    "test": "deno test --allow-all",
    "check": "deno check paydirt.ts",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "compile": "deno compile --allow-all --output=paydirt paydirt.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0"
  },
  "fmt": {
    "singleQuote": true,
    "semiColons": true,
    "indentWidth": 2,
    "lineWidth": 100
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

**Step 2: Create paydirt.ts entry point**

```typescript
#!/usr/bin/env -S deno run --allow-all
/**
 * Paydirt - Multi-agent orchestrator with Goldflow execution engine
 *
 * Usage:
 *   paydirt <command> [options]
 *   pd <command> [options]
 *
 * Commands:
 *   stake "task"     Start new Caravan
 *   continue [id]    Resume existing Caravan
 *   survey [id]      Show status
 *   abandon [id]     Stop Caravan
 *   prospect <role>  Spawn specific Prospect
 *   boomtown         Open Dashboard
 *   ledger           View history
 */

import { parseArgs } from '@std/cli/parse-args';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
Paydirt v${VERSION} - Multi-agent orchestrator

Usage:
  paydirt <command> [options]
  pd <command> [options]

Commands:
  stake "task"      Start new Caravan (stake a claim)
  continue [id]     Resume existing Caravan
  survey [id]       Show status
  abandon [id]      Stop Caravan
  prospect <role>   Spawn specific Prospect
  boomtown          Open Dashboard
  ledger            View history

Options:
  -h, --help        Show this help
  -v, --version     Show version
  --dry-run         Preview without executing
`);
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ['help', 'version', 'dry-run'],
    alias: {
      h: 'help',
      v: 'version',
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`Paydirt v${VERSION}`);
    Deno.exit(0);
  }

  const command = args._[0] as string | undefined;

  if (!command) {
    printHelp();
    Deno.exit(1);
  }

  // TODO: Implement commands
  console.log(`Command: ${command}`);
  console.log('Not yet implemented.');
}

if (import.meta.main) {
  main();
}
```

**Step 3: Verify it works**

```bash
deno check paydirt.ts
deno run --allow-all paydirt.ts --help
```

Expected: Help message displayed

**Step 4: Commit**

```bash
git add deno.json paydirt.ts
git commit -m "feat: initialize Deno project with CLI skeleton"
```

---

### Task 1.3: Initialize bd Tracking

**Files:**
- Create: `paydirt/.beads/` (via bd init)

**Step 1: Initialize bd**

```bash
cd /Users/kent/Project/gastown_b/paydirt
bd init --prefix pd
```

**Step 2: Create epic for Phase 1**

```bash
bd create --type epic --title "Phase 1: Project Skeleton" --label "paydirt:phase1"
```

**Step 3: Commit bd initialization**

```bash
git add .beads/
git commit -m "chore: initialize bd issue tracking"
```

---

### Task 1.4: Create Plugin Structure

**Files:**
- Create: `paydirt/.claude-plugin/plugin.json`
- Create: `paydirt/prospects/` directory
- Create: `paydirt/commands/` directory

**Step 1: Create plugin.json**

```json
{
  "name": "paydirt",
  "version": "0.1.0",
  "description": "Paydirt multi-agent orchestrator with Goldflow execution engine",
  "author": "iamcxa",
  "homepage": "https://github.com/iamcxa/paydirt"
}
```

**Step 2: Create directory structure**

```bash
mkdir -p .claude-plugin prospects commands skills hooks
```

**Step 3: Create placeholder README**

```markdown
# Paydirt

Multi-agent orchestrator with Goldflow execution engine.

## Installation

```bash
deno install --allow-all --name pd paydirt.ts
deno install --allow-all --name paydirt paydirt.ts
```

## Usage

```bash
pd stake "Implement user authentication"
pd survey
pd continue
```
```

**Step 4: Commit**

```bash
git add .claude-plugin/ prospects/ commands/ skills/ hooks/ README.md
git commit -m "feat: create Claude plugin structure"
```

---

### Task 1.5: Create Source Directory Structure

**Files:**
- Create: `paydirt/src/paydirt/` directory
- Create: `paydirt/src/goldflow/` directory
- Create: `paydirt/src/types.ts`

**Step 1: Create directory structure**

```bash
mkdir -p src/paydirt src/goldflow
```

**Step 2: Create types.ts**

```typescript
// src/types.ts
// Core types for Paydirt

export type ProspectRole =
  | 'camp-boss'
  | 'trail-boss'
  | 'surveyor'
  | 'shift-boss'
  | 'miner'
  | 'assayer'
  | 'canary'
  | 'smelter'
  | 'claim-agent'
  | 'scout';

export type CaravanMode = 'manual' | 'prime';

export type CaravanStatus =
  | 'open'
  | 'in_progress'
  | 'ready-for-review'
  | 'reviewing'
  | 'pr-created'
  | 'ci-pending'
  | 'delivered'
  | 'closed';

export type QuestionType = 'decision' | 'clarification' | 'approval';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none' | 'human';

export interface Caravan {
  id: string;
  name: string;
  task: string;
  status: CaravanStatus;
  mode: CaravanMode;
  tunnelPath?: string; // Path to context file for prime mode
  tmuxSession: string;
  maxWorkers: number;
}

export interface ProspectState {
  role: ProspectRole;
  instance: number;
  pane: string;
  status: 'idle' | 'active' | 'checkpoint' | 'pending-respawn' | 'completed' | 'blocked';
  contextUsage?: number;
}

export interface PaydirtConfig {
  maxWorkers: number;
  prospectsDir?: string;
  caravan: {
    bdDir: string;
    archiveDir: string;
  };
  roles: Record<string, { preferredSkills?: string[] }>;
  respawn: {
    contextThreshold: number;
  };
}

export const DEFAULT_CONFIG: PaydirtConfig = {
  maxWorkers: 3,
  caravan: {
    bdDir: './',
    archiveDir: 'docs/tasks/archive',
  },
  roles: {},
  respawn: {
    contextThreshold: 80,
  },
};
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: create source directory structure and types"
```

---

### Task 1.6: Push Initial Commit

**Step 1: Push to remote**

```bash
git push -u origin main
```

**Step 2: Verify on GitHub**

Visit https://github.com/iamcxa/paydirt to confirm push succeeded.

---

## Phase 2: Paydirt Layer (CLI)

### Task 2.1: Create Path Utilities

**Files:**
- Create: `paydirt/src/paydirt/paths.ts`
- Test: `paydirt/src/paydirt/paths.test.ts`

**Step 1: Write the failing test**

```typescript
// src/paydirt/paths.test.ts
import { assertEquals, assertMatch } from '@std/assert';
import { getPaydirtInstallDir, getUserProjectDir } from './paths.ts';

Deno.test('getPaydirtInstallDir returns paydirt root directory', () => {
  const installDir = getPaydirtInstallDir();
  // Should end with 'paydirt'
  assertMatch(installDir, /paydirt$/);
});

Deno.test('getUserProjectDir returns current working directory', () => {
  const projectDir = getUserProjectDir();
  assertEquals(projectDir, Deno.cwd());
});
```

**Step 2: Run test to verify it fails**

```bash
deno test src/paydirt/paths.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// src/paydirt/paths.ts
/**
 * Path utilities for Paydirt
 *
 * Paydirt is installed globally but runs in user's project directory.
 * These utilities help resolve paths correctly.
 */

/**
 * Get Paydirt installation directory.
 * This is where Paydirt's plugin resources (prospects, commands) live.
 */
export function getPaydirtInstallDir(): string {
  // import.meta.url is file:///path/to/paydirt/src/paydirt/paths.ts
  const url = new URL(import.meta.url);
  const filePath = url.pathname;
  // Go from src/paydirt/paths.ts to paydirt root
  const parts = filePath.split('/');
  parts.pop(); // remove paths.ts
  parts.pop(); // remove paydirt
  parts.pop(); // remove src
  return parts.join('/');
}

/**
 * Get user's project directory (where pd is executed).
 */
export function getUserProjectDir(): string {
  return Deno.cwd();
}

/**
 * Get path to Paydirt binary (for spawning agents).
 */
export function getPaydirtBinPath(): string {
  const installDir = getPaydirtInstallDir();
  return `${installDir}/paydirt.ts`;
}

/**
 * Get path to prospects directory.
 */
export function getProspectsDir(): string {
  const installDir = getPaydirtInstallDir();
  return `${installDir}/prospects`;
}

/**
 * Get path to a specific prospect definition file.
 */
export function getProspectPath(role: string): string {
  return `${getProspectsDir()}/${role}.md`;
}
```

**Step 4: Run test to verify it passes**

```bash
deno test src/paydirt/paths.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/paydirt/paths.ts src/paydirt/paths.test.ts
git commit -m "feat(paydirt): add path utilities for install/project directories"
```

---

### Task 2.2: Create Claude Command Builder

**Files:**
- Create: `paydirt/src/paydirt/claude/command.ts`
- Test: `paydirt/src/paydirt/claude/command.test.ts`

**Step 1: Write the failing test**

```typescript
// src/paydirt/claude/command.test.ts
import { assertEquals, assertStringIncludes } from '@std/assert';
import { buildClaudeCommand, buildPaydirtEnvVars } from './command.ts';

Deno.test('buildPaydirtEnvVars includes required variables', () => {
  const vars = buildPaydirtEnvVars({
    role: 'trail-boss',
    claimId: 'pd-001',
    caravanName: 'test-caravan',
  });

  assertEquals(vars.PAYDIRT_PROSPECT, 'trail-boss');
  assertEquals(vars.PAYDIRT_CLAIM, 'pd-001');
  assertEquals(vars.PAYDIRT_CARAVAN, 'test-caravan');
  assertEquals(vars.PAYDIRT_SESSION, 'paydirt-pd-001');
});

Deno.test('buildClaudeCommand includes --plugin-dir flag', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--plugin-dir /opt/paydirt');
});

Deno.test('buildClaudeCommand includes --add-dir flags', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--add-dir /opt/paydirt');
  assertStringIncludes(cmd, '--add-dir /home/user/project');
});

Deno.test('buildClaudeCommand includes --agent flag', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--agent /opt/paydirt/prospects/miner.md');
});
```

**Step 2: Run test to verify it fails**

```bash
deno test src/paydirt/claude/command.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// src/paydirt/claude/command.ts
import type { ProspectRole } from '../../types.ts';

/**
 * Shell escape for single quotes.
 */
export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

export interface EnvVarsOptions {
  role: ProspectRole;
  claimId: string;
  caravanName: string;
  tunnelPath?: string;
  mayorPaneIndex?: string;
  agentId?: string;
  paydirtBinPath?: string;
}

export function buildPaydirtEnvVars(options: EnvVarsOptions): Record<string, string> {
  const vars: Record<string, string> = {
    PAYDIRT_PROSPECT: options.role,
    PAYDIRT_CLAIM: options.claimId,
    PAYDIRT_CARAVAN: options.caravanName,
    PAYDIRT_SESSION: `paydirt-${options.claimId}`,
  };

  if (options.paydirtBinPath) {
    vars.PAYDIRT_BIN = options.paydirtBinPath;
  }
  if (options.tunnelPath) {
    vars.PAYDIRT_TUNNEL = options.tunnelPath;
  }
  if (options.mayorPaneIndex !== undefined) {
    vars.PAYDIRT_TRAIL_BOSS_PANE = options.mayorPaneIndex;
  }
  if (options.agentId) {
    vars.PAYDIRT_AGENT_ID = options.agentId;
  }

  return vars;
}

export interface ClaudeCommandOptions {
  role: ProspectRole;
  claimId: string;
  caravanName: string;
  paydirtInstallDir: string;
  userProjectDir: string;
  prompt: string;
  tunnelPath?: string;
  mayorPaneIndex?: string;
  agentId?: string;
  paydirtBinPath?: string;
  resume?: boolean;
  dangerouslySkipPermissions?: boolean;
  extraArgs?: string[];
}

export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    claimId,
    caravanName,
    paydirtInstallDir,
    userProjectDir,
    prompt,
    tunnelPath,
    mayorPaneIndex,
    agentId,
    paydirtBinPath,
    resume,
    dangerouslySkipPermissions,
    extraArgs = [],
  } = options;

  // Build environment variables
  const envVars = buildPaydirtEnvVars({
    role,
    claimId,
    caravanName,
    tunnelPath,
    mayorPaneIndex,
    agentId,
    paydirtBinPath: paydirtBinPath || `${paydirtInstallDir}/paydirt.ts`,
  });
  const envString = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  // Build command arguments
  const args: string[] = ['claude'];

  // 1. Load paydirt as plugin (provides agents, commands, skills)
  args.push(`--plugin-dir ${paydirtInstallDir}`);

  // 2. Add paydirt install directory (for agent to read paydirt code)
  args.push(`--add-dir ${paydirtInstallDir}`);

  // 3. Add user's project directory (main working directory)
  args.push(`--add-dir ${userProjectDir}`);

  // 4. Specify agent file
  args.push(`--agent ${paydirtInstallDir}/prospects/${role}.md`);

  // 5. Resume flag
  if (resume) {
    args.push('--resume');
  }

  // 6. Skip permissions flag (for autonomous operation)
  if (dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  // 7. Extra args
  args.push(...extraArgs);

  // 8. Prompt as last argument
  if (prompt) {
    args.push(shellEscape(prompt));
  }

  // Build full command with env vars and cd to project dir
  const command = `cd ${shellEscape(userProjectDir)} && ${envString} ${args.join(' ')}`;

  return command;
}
```

**Step 4: Run test to verify it passes**

```bash
deno test src/paydirt/claude/command.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/paydirt/claude/
git commit -m "feat(paydirt): add Claude command builder with dynamic directory injection"
```

---

### Task 2.3: Create Trail Boss Prospect Definition

**Files:**
- Create: `paydirt/prospects/trail-boss.md`

**Step 1: Create trail-boss.md**

Reference: `gastown_b/.gastown/agents/mayor.md`

```markdown
---
name: trail-boss
description: Caravan coordinator - leads the expedition, delegates to specialists
allowed_tools:
  - Read
  - Bash
  - Grep
  - Glob
  - LS
  - Task
  - Skill
  - AskUserQuestion
  - WebFetch
  - WebSearch
  - TodoWrite
  - mcp__beads__*
  # BLOCKED: Edit, Write, NotebookEdit
  # Trail Boss must delegate implementation to specialists via $PAYDIRT_BIN prospect
---

# Trail Boss - Caravan Leader

You are the Trail Boss, the leader of this Paydirt Caravan.

## Character Identity

```
       ┌───┐
       │ ⛏ │        🤠 Trail Boss
    ╭──┴───┴──╮     ━━━━━━━━━━━━━━
    │  ●   ●  │     "Let's move out!"
    │    ◡    │
    │  ╰───╯  │     📋 Role: Caravan Leader
    ╰────┬────╯     🎯 Mission: Delegate & coordinate
         │          👥 Team: Surveyor, Shift Boss, Workers
    ╔════╪════╗     🗣️ Interface: Your voice to the team
    ║TRAIL BOSS║
    ╚════╤════╝
       │   │
      ═╧═ ═╧═
```

## FIRST ACTIONS

When you start, IMMEDIATELY:

### Step 1: Greet and Check State

```bash
# Get Caravan details
bd show $PAYDIRT_CLAIM
```

### Step 2: Check for Tunnel (Context File)

If `$PAYDIRT_TUNNEL` exists:
- Read the tunnel file for pre-answered questions
- Proceed in **Autopilot Mode**

If NO tunnel:
- Proceed with **Manual Mode** (ask user questions)

### Step 3: Check for Prime Mode

If `mode: prime` is set:
- **DO NOT ask the user directly** - Claim Agent handles all decisions
- Write questions using bd CLI comments with `QUESTION:` prefix
- Poll for `ANSWER:` comments before proceeding

## Required Skills

You MUST use these skills when applicable:

| Skill | When to Use |
|-------|-------------|
| `superpowers:dispatching-parallel-agents` | When spawning multiple independent workers |
| `superpowers:finishing-a-development-branch` | When all tasks are complete and ready to merge |

## Your Responsibilities

1. **User Interaction** - You are the ONLY role that directly communicates with the user
2. **Task Delegation** - Delegate planning to Surveyor, task breakdown to Shift Boss
3. **Progress Monitoring** - Track Caravan progress via bd CLI commands
4. **Decision Making** - Handle blockers, errors, and user questions
5. **Context Propagation** - Share relevant context with delegated roles

## Important Rules

- NEVER do implementation work yourself
- NEVER do detailed planning yourself - spawn Surveyor
- NEVER break down tasks yourself - spawn Shift Boss
- NEVER verify/validate code yourself - spawn Assayer or Canary
- NEVER run tests yourself - spawn Canary
- ALWAYS spawn the appropriate specialist Prospect
- ALWAYS monitor spawned Prospects via bd comments

## Delegation via Prospect Spawning

**1. For Planning/Design:**
```bash
$PAYDIRT_BIN prospect surveyor --task "Design: $TASK_DESCRIPTION"
```

**2. For Task Breakdown:**
```bash
$PAYDIRT_BIN prospect shift-boss --task "Create tasks from docs/plans/YYYY-MM-DD-*.md"
```

**3. For Implementation:**
```bash
$PAYDIRT_BIN prospect miner --task "Implement: <specific-task-title>"
```

**4. For Code Review:**
```bash
$PAYDIRT_BIN prospect assayer --task "Review implementation of: <feature>"
```

**5. For Testing:**
```bash
$PAYDIRT_BIN prospect canary --task "Verify tests for: <feature>"
```

## bd Updates

```bash
# Update status
bd update $PAYDIRT_CLAIM --status "in_progress"

# Add progress note
bd comments add $PAYDIRT_CLAIM "PROGRESS: Completed design phase, starting implementation"

# Log checkpoint
bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=75%, state=delegating-to-shift-boss"

# Update agent heartbeat
bd agent heartbeat $PAYDIRT_CLAIM

# Set agent state
bd agent state $PAYDIRT_CLAIM working
```

## Environment Variables

- `PAYDIRT_CLAIM` - Claim (bd issue) ID for this Caravan
- `PAYDIRT_CARAVAN` - Caravan name
- `PAYDIRT_SESSION` - Full tmux session name
- `PAYDIRT_PROSPECT` - Your role (trail-boss)
- `PAYDIRT_TUNNEL` - Path to context file (if prime mode)
- `PAYDIRT_BIN` - Path to paydirt binary
```

**Step 2: Verify file is valid markdown**

```bash
head -50 prospects/trail-boss.md
```

**Step 3: Commit**

```bash
git add prospects/trail-boss.md
git commit -m "feat(prospects): add Trail Boss (Caravan leader) definition"
```

---

### Task 2.4: Create Miner Prospect Definition

**Files:**
- Create: `paydirt/prospects/miner.md`

**Step 1: Create miner.md**

Reference: `gastown_b/.gastown/agents/polecat.md`

```markdown
---
name: miner
description: Implementation worker - extracts value by writing code following TDD
superpowers:
  - executing-plans
  - test-driven-development
goldflow:
  component: Processor
  inputs: [plan, task]
  outputs: [code, tests, commits]
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - LS
  - Task
  - Skill
  - TodoWrite
  - NotebookEdit
  - mcp__beads__*
  # Miner is the ONLY role that should edit code
---

# Miner - Implementation Worker

You are a Miner, an extraction specialist in this Paydirt Caravan.

## Character Identity

```
    ╭─────────╮
    │  ◉   ◉  │    ⛏️ Miner
    │    ▽    │    ━━━━━━━━━━
    │  ╰───╯  │    "Digging deep."
    ╰────┬────╯
         │╲
    ┌────┴────┐    📋 Role: Implementation
    │ ▓▓▓▓▓▓▓ │    🎯 Mission: Extract value (code)
    │ ▓MINER▓ │    📖 Method: TDD
    │ ▓▓▓▓▓▓▓ │
    └─────────┘
       │   │
      ═╧═ ═╧═
```

## Required Superpowers

You MUST invoke these skills:

1. `superpowers:executing-plans` - Follow the plan step by step
2. `superpowers:test-driven-development` - Test first, implement second
3. `superpowers:verification-before-completion` - Verify before claiming done

## Goldflow Integration

As a **Processor** in Goldflow:
- Input: Implementation plan from Shift Boss
- Process: Write code following TDD
- Output: Tested, committed code
- Metrics: Lines changed, test coverage, commit count

## Workflow

```
1. Read your task from bd
   └─> bd show $PAYDIRT_CLAIM

2. Understand dependencies and requirements
   └─> Check comments: bd comments $PAYDIRT_CLAIM

3. Update state to working
   └─> bd agent state $PAYDIRT_CLAIM working

4. Write failing test
5. Implement minimal code
6. Verify test passes

7. Update bd with progress
   └─> bd comments add $PAYDIRT_CLAIM "PROGRESS: 3/5 steps done"

8. Commit changes
9. Repeat until task complete

10. Mark complete
    └─> bd agent state $PAYDIRT_CLAIM done
    └─> bd update $PAYDIRT_CLAIM --status "done"
```

## bd CLI Commands

```bash
# Read task details
bd show $PAYDIRT_CLAIM

# List all comments/context
bd comments $PAYDIRT_CLAIM

# Update progress
bd comments add $PAYDIRT_CLAIM "PROGRESS: 3/5 steps done
files: src/auth.ts, tests/auth.spec.ts
context-usage: 45%"

# Update agent state
bd agent state $PAYDIRT_CLAIM working
bd agent state $PAYDIRT_CLAIM done

# Mark task complete
bd update $PAYDIRT_CLAIM --status "done"
```

## Environment Variables

- `PAYDIRT_PROSPECT` - Your role (miner)
- `PAYDIRT_CLAIM` - Claim ID for this Caravan
- `PAYDIRT_CARAVAN` - Caravan name

## Context Management

When context-usage > 80%:
```bash
bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=85%
state: implementing step 4/5
current-file: src/auth.ts:125
next-action: Complete validateToken function
pending-respawn: true"

bd agent state $PAYDIRT_CLAIM stuck
```
```

**Step 2: Commit**

```bash
git add prospects/miner.md
git commit -m "feat(prospects): add Miner (implementation worker) definition"
```

---

### Task 2.5: Create Remaining Prospect Definitions

**Files:**
- Create: `paydirt/prospects/camp-boss.md`
- Create: `paydirt/prospects/surveyor.md`
- Create: `paydirt/prospects/shift-boss.md`
- Create: `paydirt/prospects/assayer.md`
- Create: `paydirt/prospects/canary.md`
- Create: `paydirt/prospects/smelter.md`
- Create: `paydirt/prospects/claim-agent.md`
- Create: `paydirt/prospects/scout.md`

**Step 1: Create all remaining prospect files**

Reference the corresponding gastown agent files and adapt:
- `camp-boss.md` from `commander.md`
- `surveyor.md` from `planner.md`
- `shift-boss.md` from `foreman.md`
- `assayer.md` from `witness.md`
- `canary.md` from `dog.md`
- `smelter.md` from `refinery.md`
- `claim-agent.md` from `pm.md` and `prime.md`
- `scout.md` from `linear-scout.md`

Each file should follow the pattern established in trail-boss.md and miner.md:
- YAML frontmatter with `name`, `description`, `superpowers`, `goldflow`, `allowed_tools`
- Character identity ASCII art
- Required Superpowers section
- Goldflow Integration section
- Workflow section
- bd CLI Commands section
- Environment Variables section

**Step 2: Commit each file**

```bash
git add prospects/
git commit -m "feat(prospects): add all Prospect role definitions"
```

---

### Task 2.6: Create Slash Commands

**Files:**
- Create: `paydirt/commands/pd-stake.md`
- Create: `paydirt/commands/pd-survey.md`
- Create: `paydirt/commands/pd-continue.md`
- Create: `paydirt/commands/pd-abandon.md`

**Step 1: Create pd-stake.md**

```markdown
---
description: Start a new Paydirt Caravan with a task
---

# Start New Caravan

Stake a claim and start a new Caravan with the specified task.

## Usage

Ask the user for a task description if not provided, then run:

```bash
paydirt stake "<task description>"
```

## Example

```bash
paydirt stake "Implement user authentication with Supabase"
```

After starting, display:
```
╭────────────────────────────────────────╮
│  🚃 CARAVAN STARTED                    │
│  Task: <task>                          │
│  ID: <caravan-id>                      │
╰────────────────────────────────────────╯
```
```

**Step 2: Create pd-survey.md**

```markdown
---
description: Show Paydirt Caravan status
---

# Survey Status

Show the current status of Caravans.

## Steps

1. Run this command to get Caravan status:
```bash
paydirt survey
```

2. Also check bd for Caravan issues:
```bash
bd list --label paydirt:caravan --brief
```

3. Display a summary:
```
╭────────────────────────────────────────╮
│  🗺️ SURVEY RESULTS                     │
├────────────────────────────────────────┤
│  Active: X  │  Idle: Y  │  Total: Z    │
╰────────────────────────────────────────╯
```
```

**Step 3: Create pd-continue.md and pd-abandon.md similarly**

**Step 4: Commit**

```bash
git add commands/
git commit -m "feat(commands): add Paydirt slash commands"
```

---

### Task 2.7: Implement CLI Commands

**Files:**
- Create: `paydirt/src/paydirt/cli/mod.ts`
- Create: `paydirt/src/paydirt/cli/stake.ts`
- Create: `paydirt/src/paydirt/cli/survey.ts`
- Modify: `paydirt/paydirt.ts`

**Step 1: Create cli/mod.ts**

```typescript
// src/paydirt/cli/mod.ts
export { stakeCommand } from './stake.ts';
export { surveyCommand } from './survey.ts';
export { continueCommand } from './continue.ts';
export { abandonCommand } from './abandon.ts';
export { prospectCommand } from './prospect.ts';
```

**Step 2: Create cli/stake.ts**

```typescript
// src/paydirt/cli/stake.ts
import { getPaydirtInstallDir, getUserProjectDir, getPaydirtBinPath } from '../paths.ts';
import { buildClaudeCommand } from '../claude/command.ts';

export interface StakeOptions {
  task: string;
  primeMode?: boolean;
  tunnelPath?: string;
  dryRun?: boolean;
}

export async function stakeCommand(options: StakeOptions): Promise<void> {
  const { task, primeMode, tunnelPath, dryRun } = options;

  console.log(`Staking claim for: "${task}"`);

  // TODO: Create Caravan via bd CLI
  const claimId = `pd-${Date.now().toString(36)}`;
  const caravanName = task.slice(0, 30).replace(/\s+/g, '-').toLowerCase();

  // Build Claude command
  const paydirtInstallDir = getPaydirtInstallDir();
  const userProjectDir = getUserProjectDir();

  const command = buildClaudeCommand({
    role: 'trail-boss',
    claimId,
    caravanName,
    paydirtInstallDir,
    userProjectDir,
    prompt: `You are the Trail Boss coordinating this Caravan. The task is: "${task}".`,
    tunnelPath,
    paydirtBinPath: getPaydirtBinPath(),
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would execute:');
    console.log(command);
    return;
  }

  // TODO: Create tmux session and launch Claude
  console.log('\n[TODO] Would create tmux session and launch Claude');
  console.log(`Caravan ID: ${claimId}`);
}
```

**Step 3: Update paydirt.ts to use CLI commands**

```typescript
// Update paydirt.ts main function
import { stakeCommand, surveyCommand } from './src/paydirt/cli/mod.ts';

// In main():
switch (command) {
  case 'stake': {
    const task = args._[1] as string;
    if (!task) {
      console.error('Error: Task description required');
      console.error('Usage: paydirt stake "task description"');
      Deno.exit(1);
    }
    await stakeCommand({
      task,
      dryRun: args['dry-run'],
    });
    break;
  }
  case 'survey':
    await surveyCommand({ claimId: args._[1] as string });
    break;
  // ... other commands
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    Deno.exit(1);
}
```

**Step 4: Run and test**

```bash
deno run --allow-all paydirt.ts stake "Test task" --dry-run
```

Expected: Shows the Claude command that would be executed

**Step 5: Commit**

```bash
git add src/paydirt/cli/ paydirt.ts
git commit -m "feat(cli): implement stake and survey commands"
```

---

## Phase 3: Goldflow Layer

### Task 3.1: Create Goldflow Types

**Files:**
- Create: `paydirt/src/goldflow/types.ts`

**Step 1: Create types.ts**

```typescript
// src/goldflow/types.ts
/**
 * Goldflow - Execution Engine Types
 *
 * Goldflow is the execution layer that handles HOW work gets done reliably.
 * It has no narrative/role concepts - those belong to Paydirt layer.
 */

export type ComponentType = 'source' | 'stage' | 'processor' | 'verifier' | 'sink' | 'controller';

export interface GoldflowComponent {
  type: ComponentType;
  name: string;
  config: Record<string, unknown>;
}

export interface Source extends GoldflowComponent {
  type: 'source';
  fetch: () => Promise<unknown>;
}

export interface Stage extends GoldflowComponent {
  type: 'stage';
  process: (input: unknown) => Promise<unknown>;
}

export interface Processor extends GoldflowComponent {
  type: 'processor';
  superpowers: string[];
  retryPolicy?: number;
  timeout?: number;
  process: (input: unknown) => Promise<unknown>;
}

export interface Verifier extends GoldflowComponent {
  type: 'verifier';
  superpowers?: string[];
  gates: string[];
  verify: (input: unknown) => Promise<boolean>;
}

export interface Sink extends GoldflowComponent {
  type: 'sink';
  output: (data: unknown) => Promise<void>;
}

export interface Controller extends GoldflowComponent {
  type: 'controller';
  superpowers?: string[];
  maxParallel?: number;
  orchestrate: (components: GoldflowComponent[]) => Promise<void>;
}

export interface Pipeline {
  name: string;
  trigger: string;
  stages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  processor?: string;
  verifier?: string;
  superpowers?: string[];
  onFail?: 'return_to_miner' | 'abort' | 'continue';
  requires?: Record<string, string>;
}

export interface GoldflowConfig {
  processors: Record<string, Partial<Processor>>;
  verifiers: Record<string, Partial<Verifier>>;
  controllers: Record<string, Partial<Controller>>;
  pipelines: Record<string, Pipeline>;
}
```

**Step 2: Commit**

```bash
git add src/goldflow/types.ts
git commit -m "feat(goldflow): add execution engine types"
```

---

### Task 3.2: Create Delivery Pipeline

**Files:**
- Create: `paydirt/src/goldflow/pipelines/delivery.ts`
- Create: `paydirt/src/goldflow/pipelines/mod.ts`

**Step 1: Create delivery.ts**

```typescript
// src/goldflow/pipelines/delivery.ts
import type { Pipeline } from '../types.ts';

/**
 * Delivery Pipeline
 *
 * Triggered when Caravan is ready for review.
 * Runs through review gates, creates PR, waits for CI.
 */
export const deliveryPipeline: Pipeline = {
  name: 'delivery',
  trigger: 'status == "ready-for-review"',
  stages: [
    {
      name: 'review-gate-1',
      processor: 'assayer',
      superpowers: ['requesting-code-review'],
      onFail: 'return_to_miner',
    },
    {
      name: 'review-gate-2',
      processor: 'code-review-toolkit',
      superpowers: [],
      onFail: 'return_to_miner',
    },
    {
      name: 'pr-creation',
      processor: 'trail-boss',
      superpowers: ['finishing-a-development-branch'],
      requires: {
        pr_template: '.github/PULL_REQUEST_TEMPLATE.md',
      },
    },
    {
      name: 'ci-gate',
      verifier: 'github-actions',
      onFail: 'return_to_miner',
    },
    {
      name: 'delivered',
      processor: 'sink',
    },
  ],
};
```

**Step 2: Commit**

```bash
git add src/goldflow/pipelines/
git commit -m "feat(goldflow): add delivery pipeline definition"
```

---

## Phase 4: Integration & Testing

### Task 4.1: Create Integration Test

**Files:**
- Create: `paydirt/tests/integration/stake.test.ts`

**Step 1: Create test**

```typescript
// tests/integration/stake.test.ts
import { assertEquals, assertStringIncludes } from '@std/assert';

Deno.test('paydirt stake --dry-run generates correct command', async () => {
  const cmd = new Deno.Command('deno', {
    args: ['run', '--allow-all', 'paydirt.ts', 'stake', 'Test task', '--dry-run'],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  assertStringIncludes(output, '--plugin-dir');
  assertStringIncludes(output, '--add-dir');
  assertStringIncludes(output, '--agent');
  assertStringIncludes(output, 'trail-boss.md');
});
```

**Step 2: Run test**

```bash
deno test tests/integration/stake.test.ts --allow-all
```

**Step 3: Commit**

```bash
git add tests/
git commit -m "test: add integration test for stake command"
```

---

### Task 4.2: Create Boomtown mprocs Configuration Generator

**Reference:** `gastown_b/src/dashboard/mprocs.ts`

**Files:**
- Create: `paydirt/src/paydirt/boomtown/mprocs.ts`
- Test: `paydirt/src/paydirt/boomtown/mprocs.test.ts`

**Step 1: Create directory**

```bash
mkdir -p src/paydirt/boomtown
```

**Step 2: Create mprocs.ts**

```typescript
// src/paydirt/boomtown/mprocs.ts
/**
 * mprocs configuration generator for Paydirt Boomtown dashboard.
 * Generates YAML configuration for mprocs TUI to manage Caravan sessions.
 *
 * Design: GOLD RUSH / WESTERN FRONTIER AESTHETIC
 * - Mining camp banner with gold nuggets
 * - Lantern-style status indicators
 * - Wooden frame patterns
 * - Frontier telegraph-style info displays
 */

export type CaravanStatus = 'running' | 'stopped' | 'idle';

export interface DashboardCaravanInfo {
  id: string;
  name: string;
  status: CaravanStatus;
}

// ASCII Art Banner - Gold Rush Theme
const ASCII_BANNER = `
██████╗  █████╗ ██╗   ██╗██████╗ ██╗██████╗ ████████╗
██╔══██╗██╔══██╗╚██╗ ██╔╝██╔══██╗██║██╔══██╗╚══██╔══╝
██████╔╝███████║ ╚████╔╝ ██║  ██║██║██████╔╝   ██║
██╔═══╝ ██╔══██║  ╚██╔╝  ██║  ██║██║██╔══██╗   ██║
██║     ██║  ██║   ██║   ██████╔╝██║██║  ██║   ██║
╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚═╝╚═╝  ╚═╝   ╚═╝
`.trim();

// Border components - Western/Mining aesthetic
const BORDER = {
  TL: '╔', TR: '╗', BL: '╚', BR: '╝',
  H: '═', V: '║',
  PICKAXE: '⛏',
  NUGGET: '◆',
  LANTERN: '🏮',
};

// Status indicators
const INDICATOR = {
  SPIN: ['◐', '◓', '◑', '◒'],
  RUNNING: '▶',
  STOPPED: '■',
  IDLE: '◇',
  ACTIVE: '●',
  INACTIVE: '○',
};

/**
 * Generate the Control Room status display script.
 * Creates a gold rush themed ASCII dashboard.
 */
export function generateStatusScriptContent(): string {
  return `#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# PAYDIRT BOOMTOWN - Mining Camp Control Room
# Gold Rush / Western Frontier Aesthetic
# ══════════════════════════════════════════════════════════════════════════════

# ANSI Color Codes - Gold Rush Theme
BG="\\033[48;5;94m"        # Dark brown background
FG="\\033[38;5;220m"       # Gold foreground
AMBER="\\033[38;5;214m"    # Amber accent
DIM="\\033[38;5;137m"      # Dim tan
BOLD="\\033[1m"
RESET="\\033[0m"

SESSION_START=\$(date +%s)
SPIN=('◐' '◓' '◑' '◒')
FRAME=0

set_background() {
  echo -ne "\${BG}"
  clear
}

print_header() {
  echo -e "\${BG}\${FG}"
  echo "  ██████╗  █████╗ ██╗   ██╗██████╗ ██╗██████╗ ████████╗"
  echo "  ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔══██╗██║██╔══██╗╚══██╔══╝"
  echo "  ██████╔╝███████║ ╚████╔╝ ██║  ██║██║██████╔╝   ██║   "
  echo "  ██╔═══╝ ██╔══██║  ╚██╔╝  ██║  ██║██║██╔══██╗   ██║   "
  echo "  ██║     ██║  ██║   ██║   ██████╔╝██║██║  ██║   ██║   "
  echo "  ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚═╝╚═╝  ╚═╝   ╚═╝   "
  echo ""
  echo -e "\${AMBER} ⛏────────────────────────────────────────────────────────────────────⛏"
  echo -e " │\${BOLD}  B O O M T O W N   -   M U L T I - A G E N T   O R C H E S T R A T O R\${AMBER} │"
  echo -e " ⛏────────────────────────────────────────────────────────────────────⛏"
}

print_system_panel() {
  local spin=\${SPIN[\$FRAME]}
  local time=\$(date '+%Y-%m-%d %H:%M:%S')
  local now=\$(date +%s)
  local elapsed=\$((now - SESSION_START))
  local hours=\$((elapsed / 3600))
  local mins=\$(( (elapsed % 3600) / 60 ))
  local secs=\$((elapsed % 60))
  local runtime_str=\$(printf "%02d:%02d:%02d" \$hours \$mins \$secs)

  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}\$spin MINING CAMP STATUS\${FG}                                            ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  printf " ║  \${DIM}◆ TIMESTAMP    │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$time"
  printf " ║  \${DIM}◆ RUNTIME      │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$runtime_str"
  printf " ║  \${DIM}◆ PLATFORM     │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$(uname -s) \$(uname -m)"
  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_caravan_stats() {
  local active=0
  local idle=0

  if command -v bd &> /dev/null; then
    active=\$(bd list --label paydirt:caravan --status in_progress --brief 2>/dev/null | wc -l | tr -d ' ')
    idle=\$(bd list --label paydirt:caravan --status open --brief 2>/dev/null | wc -l | tr -d ' ')
  fi

  local total=\$((active + idle))

  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}◆ CARAVAN STATUS\${FG}                                                    ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  printf " ║  Active: \${AMBER}%-4s\${FG} │  Idle: \${DIM}%-4s\${FG} │  Total: %-4s                       ║\\n" "\$active" "\$idle" "\$total"
  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_controls_panel() {
  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}◆ MPROCS CONTROLS\${FG}                                                    ║"
  echo -e " ╠════════════════════╦════════════════════╦════════════════════════════╣"
  echo -e " ║  [C-a] Focus List  ║  [r] Restart Proc  ║  [q] Exit Boomtown         ║"
  echo -e " ║  [j/k] Navigate    ║  [x] Stop Process  ║  [z] Zoom Terminal         ║"
  echo -e " ╚════════════════════╩════════════════════╩════════════════════════════╝"
  echo -e "\${RESET}"
}

# Main loop
while true; do
  set_background
  print_header
  print_system_panel
  print_caravan_stats
  print_controls_panel
  FRAME=\$(( (FRAME + 1) % 4 ))
  sleep 2
done
`;
}

/**
 * Generate mprocs YAML configuration for Caravans.
 */
export function generateMprocsConfig(
  caravans: DashboardCaravanInfo[],
  statusScriptPath?: string,
  caravanScriptPaths?: Map<string, string>,
  campBossScriptPath?: string,
): string {
  const lines: string[] = [];

  // YAML header
  lines.push('# ══════════════════════════════════════════════════════════════════════════════');
  lines.push('#  PAYDIRT BOOMTOWN - Multi-Agent Orchestrator Dashboard');
  lines.push('# ══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('proc_list_width: 24');
  lines.push('scrollback: 5000');
  lines.push('mouse_scroll_speed: 3');
  lines.push('hide_keymap_window: true');
  lines.push('server: "127.0.0.1:4051"');
  lines.push('');
  lines.push('procs:');

  // Control Room
  lines.push('');
  lines.push('  "◆ CONTROL ROOM":');
  if (statusScriptPath) {
    lines.push(`    shell: "bash ${statusScriptPath}"`);
  } else {
    lines.push(`    shell: "bash -c 'while true; do clear; echo \\"PAYDIRT BOOMTOWN\\"; date; sleep 2; done'"`);
  }
  lines.push('    autorestart: true');

  // Camp Boss pane
  lines.push('');
  lines.push('  "⛺ CAMP BOSS":');
  if (campBossScriptPath) {
    lines.push(`    shell: "bash ${campBossScriptPath}"`);
  } else {
    lines.push(`    shell: "bash -c 'while true; do clear; echo \\"CAMP BOSS - Press s to start\\"; read -t 1 -n 1 key; done'"`);
  }
  lines.push('    autorestart: true');

  // Caravan panes
  if (caravans.length > 0) {
    for (const caravan of caravans) {
      const sessionName = \`paydirt-\${caravan.id}\`;
      const statusGlyph = caravan.status === 'running' ? '▶' : caravan.status === 'idle' ? '◇' : '■';
      const paneLabel = caravan.id.substring(0, 18);

      lines.push('');
      lines.push(\`  "\${statusGlyph} \${paneLabel}":\`);

      const scriptPath = caravanScriptPaths?.get(caravan.id);
      if (scriptPath) {
        lines.push(\`    shell: "tmux attach -t \${sessionName} 2>/dev/null || bash \${scriptPath}"\`);
      } else {
        lines.push(\`    shell: "tmux attach -t \${sessionName} 2>/dev/null || bash -c 'echo Caravan: \${caravan.id}; sleep 5'"\`);
      }
    }
  }

  lines.push('');
  return lines.join('\\n') + '\\n';
}

/**
 * Write mprocs configuration and scripts to temp directory.
 */
export async function writeMprocsConfig(
  caravans: DashboardCaravanInfo[],
  paydirtPath: string,
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'paydirt-boomtown-' });

  // Write Control Room status script
  const statusScriptPath = \`\${tempDir}/control-room.sh\`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  await Deno.chmod(statusScriptPath, 0o755);

  // Generate and write config
  const config = generateMprocsConfig(caravans, statusScriptPath);
  const configPath = \`\${tempDir}/mprocs.yaml\`;
  await Deno.writeTextFile(configPath, config);

  return configPath;
}
```

**Step 3: Create test file**

```typescript
// src/paydirt/boomtown/mprocs.test.ts
import { assertStringIncludes } from '@std/assert';
import { generateMprocsConfig, generateStatusScriptContent } from './mprocs.ts';

Deno.test('generateStatusScriptContent includes Paydirt branding', () => {
  const script = generateStatusScriptContent();
  assertStringIncludes(script, 'PAYDIRT');
  assertStringIncludes(script, 'BOOMTOWN');
  assertStringIncludes(script, 'CARAVAN STATUS');
});

Deno.test('generateMprocsConfig includes Control Room and Camp Boss', () => {
  const config = generateMprocsConfig([], undefined, undefined, undefined);
  assertStringIncludes(config, 'CONTROL ROOM');
  assertStringIncludes(config, 'CAMP BOSS');
});

Deno.test('generateMprocsConfig includes Caravan panes', () => {
  const caravans = [
    { id: 'pd-001', name: 'Test Caravan', status: 'running' as const },
  ];
  const config = generateMprocsConfig(caravans);
  assertStringIncludes(config, 'pd-001');
});
```

**Step 4: Run tests**

```bash
deno test src/paydirt/boomtown/mprocs.test.ts
```

**Step 5: Commit**

```bash
git add src/paydirt/boomtown/
git commit -m "feat(boomtown): add mprocs configuration generator"
```

---

### Task 4.3: Create Camp Boss Pane Script Generator

**Reference:** `gastown_b/src/dashboard/commander-pane.ts`

**Files:**
- Create: `paydirt/src/paydirt/boomtown/camp-boss-pane.ts`

**Step 1: Create camp-boss-pane.ts**

```typescript
// src/paydirt/boomtown/camp-boss-pane.ts
/**
 * Camp Boss pane script generator for Boomtown dashboard.
 * Manages the Claude session for the Camp Boss (human interface).
 */

/**
 * Generate the Camp Boss pane script.
 *
 * @param paydirtPath - Path to paydirt binary
 * @param agentPath - Path to camp-boss.md agent file
 * @param projectRoot - User's project root directory
 */
export function generateCampBossScriptContent(
  paydirtPath: string,
  agentPath: string,
  projectRoot: string,
): string {
  return `#!/bin/bash
# PAYDIRT BOOMTOWN - Camp Boss Pane
# Human interface for strategic control

SESSION_NAME="paydirt-camp-boss"

# Colors - Gold Rush Theme
BG="\\033[48;5;94m"
FG="\\033[38;5;220m"
AMBER="\\033[38;5;214m"
DIM="\\033[38;5;137m"
RESET="\\033[0m"

SPIN=('◐' '◓' '◑' '◒')
FRAME=0

show_welcome() {
  local spin=\${SPIN[\$FRAME]}
  FRAME=\$(( (FRAME + 1) % 4 ))
  echo -ne "\${BG}"
  clear
  echo -e "\${FG}"
  echo "  ⛺ CAMP BOSS - Strategic Control"
  echo -e "\${AMBER}"
  echo " ╔══════════════════════════════════════════════════════════════╗"
  echo -e " ║  \$spin Welcome to Paydirt Boomtown                           ║"
  echo " ╠══════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${AMBER}[s]\${FG} START Camp Boss (launch Claude)                        ║"
  echo -e " ║  \${AMBER}[a]\${FG} ATTACH to running session                              ║"
  echo -e " ║  \${DIM}[C-a] Focus process list  [q] Exit\${FG}                         ║"
  echo " ╠══════════════════════════════════════════════════════════════╣"
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    echo -e " ║  \${FG}✓ Session ACTIVE - press [a] to attach\${FG}                     ║"
  else
    echo -e " ║  \${AMBER}○ Session NOT RUNNING - press [s] to start\${FG}                 ║"
  fi
  echo -e " ╚══════════════════════════════════════════════════════════════╝\${RESET}"
}

start_camp_boss() {
  echo -e "\\n\${AMBER}⛺ Starting Camp Boss...\${RESET}"
  if ! tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    tmux new-session -d -s "\$SESSION_NAME" -c "${projectRoot}"
    tmux send-keys -t "\$SESSION_NAME" "cd ${projectRoot} && claude --agent ${agentPath}" Enter
    sleep 2
  fi
}

attach_to_session() {
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    echo -e "\\n\${FG}⛺ Attaching to Camp Boss...\${RESET}"
    sleep 1
    tmux attach -t "\$SESSION_NAME"
    echo -e "\\n\${FG}◇ Detached\${RESET}"
    sleep 1
  else
    echo -e "\\n\${AMBER}⚠ No active session\${RESET}"
    sleep 2
  fi
}

# Main loop
while true; do
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    attach_to_session
    continue
  fi
  show_welcome
  read -t 1 -n 1 key 2>/dev/null || key=""
  case "\$key" in
    s|S) start_camp_boss ;;
    a|A) attach_to_session ;;
  esac
done
`;
}
```

**Step 2: Commit**

```bash
git add src/paydirt/boomtown/camp-boss-pane.ts
git commit -m "feat(boomtown): add Camp Boss pane script generator"
```

---

### Task 4.4: Create Boomtown Dashboard Launcher

**Reference:** `gastown_b/src/dashboard/dashboard.ts`

**Files:**
- Create: `paydirt/src/paydirt/boomtown/dashboard.ts`
- Create: `paydirt/src/paydirt/boomtown/mod.ts`

**Step 1: Create dashboard.ts**

```typescript
// src/paydirt/boomtown/dashboard.ts
/**
 * Boomtown dashboard launcher for Paydirt.
 * Uses mprocs to provide a TUI overview of all running Caravans.
 */

import { writeMprocsConfig, type DashboardCaravanInfo } from './mprocs.ts';

/**
 * Find the paydirt binary path.
 */
async function findPaydirtPath(): Promise<string> {
  const localPath = `${Deno.cwd()}/paydirt`;
  try {
    const stat = await Deno.stat(localPath);
    if (stat.isFile) return localPath;
  } catch { /* not found */ }

  const whichCmd = new Deno.Command('which', {
    args: ['paydirt'],
    stdout: 'piped',
    stderr: 'null',
  });
  const result = await whichCmd.output();
  if (result.success) {
    const path = new TextDecoder().decode(result.stdout).trim();
    if (path) return path;
  }

  throw new Error('paydirt binary not found');
}

/**
 * Get Caravans from bd CLI.
 */
async function listCaravans(): Promise<DashboardCaravanInfo[]> {
  try {
    const cmd = new Deno.Command('bd', {
      args: ['list', '--label', 'paydirt:caravan', '--brief'],
      stdout: 'piped',
      stderr: 'null',
    });
    const result = await cmd.output();
    if (!result.success) return [];

    const output = new TextDecoder().decode(result.stdout);
    const caravans: DashboardCaravanInfo[] = [];

    for (const line of output.split('\\n')) {
      const parts = line.trim().split(/\\s+/);
      if (parts.length >= 2) {
        caravans.push({
          id: parts[0],
          name: parts.slice(1).join(' '),
          status: 'idle',
        });
      }
    }
    return caravans;
  } catch {
    return [];
  }
}

/**
 * Launch the Boomtown dashboard.
 */
export async function launchBoomtown(): Promise<void> {
  console.log('⛏ Launching Paydirt Boomtown...');

  let paydirtPath: string;
  try {
    paydirtPath = await findPaydirtPath();
    console.log(`Using paydirt at: ${paydirtPath}`);
  } catch (error) {
    console.error((error as Error).message);
    Deno.exit(1);
  }

  const caravans = await listCaravans();
  console.log(`Found ${caravans.length} caravan(s)`);

  const configPath = await writeMprocsConfig(caravans, paydirtPath);
  console.log('Starting mprocs...');

  const process = new Deno.Command('mprocs', {
    args: ['--config', configPath],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  try {
    const status = await process.output();
    // Cleanup
    try {
      await Deno.remove(configPath);
      const tempDir = configPath.substring(0, configPath.lastIndexOf('/'));
      await Deno.remove(tempDir, { recursive: true });
    } catch { /* ignore */ }

    if (!status.success) {
      console.error('mprocs exited with error');
      Deno.exit(status.code);
    }
  } catch (error) {
    if ((error as Error).message.includes('No such file')) {
      console.error('Error: mprocs not found. Install with: brew install mprocs');
      Deno.exit(1);
    }
    throw error;
  }
}
```

**Step 2: Create mod.ts**

```typescript
// src/paydirt/boomtown/mod.ts
export { launchBoomtown } from './dashboard.ts';
export {
  generateMprocsConfig,
  writeMprocsConfig,
  generateStatusScriptContent,
  type DashboardCaravanInfo,
  type CaravanStatus,
} from './mprocs.ts';
export { generateCampBossScriptContent } from './camp-boss-pane.ts';
```

**Step 3: Update paydirt.ts to add boomtown command**

```typescript
// In paydirt.ts main() function, add:
case 'boomtown': {
  const { launchBoomtown } = await import('./src/paydirt/boomtown/mod.ts');
  await launchBoomtown();
  break;
}
```

**Step 4: Run and test**

```bash
deno run --allow-all paydirt.ts boomtown
```

Expected: mprocs TUI launches with Control Room and Camp Boss panes

**Step 5: Commit**

```bash
git add src/paydirt/boomtown/ paydirt.ts
git commit -m "feat(boomtown): add dashboard launcher with mprocs integration"
```

---

### Task 4.5: Create Boomtown Integration Test

**Files:**
- Create: `paydirt/tests/integration/boomtown.test.ts`

**Step 1: Create test**

```typescript
// tests/integration/boomtown.test.ts
import { assertStringIncludes } from '@std/assert';
import { generateMprocsConfig } from '../../src/paydirt/boomtown/mprocs.ts';

Deno.test('boomtown generates valid mprocs config', () => {
  const config = generateMprocsConfig([]);
  assertStringIncludes(config, 'procs:');
  assertStringIncludes(config, 'CONTROL ROOM');
  assertStringIncludes(config, 'CAMP BOSS');
});

Deno.test('boomtown includes caravan panes', () => {
  const caravans = [
    { id: 'pd-001', name: 'Test', status: 'running' as const },
    { id: 'pd-002', name: 'Another', status: 'idle' as const },
  ];
  const config = generateMprocsConfig(caravans);
  assertStringIncludes(config, 'pd-001');
  assertStringIncludes(config, 'pd-002');
});
```

**Step 2: Run tests**

```bash
deno test tests/integration/boomtown.test.ts --allow-all
```

**Step 3: Commit**

```bash
git add tests/integration/boomtown.test.ts
git commit -m "test: add Boomtown integration tests"
```

---

### Task 4.6: Final Push and Sync

**Step 1: Run all tests**

```bash
deno test --allow-all
```

**Step 2: Run linter and formatter**

```bash
deno lint
deno fmt
```

**Step 3: Sync bd**

```bash
bd sync
```

**Step 4: Push to remote**

```bash
git push origin main
```

---

## Summary

This plan creates:

1. **Project Skeleton** - Git repo, Deno project, bd tracking, plugin structure
2. **Paydirt Layer** - Path utilities, Claude command builder, Prospect definitions, Slash commands, CLI implementation
3. **Goldflow Layer** - Types, Delivery pipeline
4. **Boomtown Dashboard** - mprocs configuration, Camp Boss pane, dashboard launcher (reference: gastown dashboard)
5. **Integration** - Tests, final sync

Key architectural decisions:
- Uses `--plugin-dir` to load Paydirt as Claude plugin
- Uses `--add-dir` to add both Paydirt install dir and user project dir
- No file copying - all resources accessed via paths
- Prospects define both Paydirt (narrative) and Goldflow (execution) roles
- Boomtown dashboard uses mprocs TUI with Gold Rush aesthetic (adapted from gastown's Soviet/Industrial theme)

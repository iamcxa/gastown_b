# Gastown Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance gastown's local operation experience with tmux UI improvements, mprocs dashboard, GUPP auto-triggering, and Superpowers skill binding.

**Architecture:** Four independent features that can be implemented in parallel. Each feature enhances a specific aspect of the orchestrator without breaking existing functionality.

**Tech Stack:** Deno/TypeScript, tmux, mprocs (YAML config), Claude Code hooks

---

## Task 1: Superpowers Skill Binding

**Priority:** P1 (other features depend on correct agent prompts)

**Files:**
- Create: `src/claude/skills.ts`
- Modify: `src/claude/command.ts:323-386`
- Modify: `.gastown/agents/mayor.md`
- Modify: `.gastown/agents/planner.md`
- Modify: `.gastown/agents/foreman.md`
- Modify: `.gastown/agents/polecat.md`
- Modify: `.gastown/agents/witness.md`
- Modify: `.gastown/agents/dog.md`
- Modify: `.gastown/agents/refinery.md`
- Test: `src/claude/skills.test.ts`

### Step 1.1: Write failing test for skills mapping

```typescript
// src/claude/skills.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ROLE_SKILLS, getSkillInstructions, SkillType } from './skills.ts';

Deno.test('ROLE_SKILLS contains all roles', () => {
  const expectedRoles = ['mayor', 'planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery', 'prime'];
  for (const role of expectedRoles) {
    assertEquals(role in ROLE_SKILLS, true, `Missing role: ${role}`);
  }
});

Deno.test('planner has brainstorming as slash-command', () => {
  const plannerSkills = ROLE_SKILLS['planner'];
  const brainstorming = plannerSkills.find(s => s.name === 'brainstorming');
  assertEquals(brainstorming?.type, 'slash-command');
});

Deno.test('getSkillInstructions returns correct format for slash-command', () => {
  const instructions = getSkillInstructions([
    { name: 'brainstorming', type: 'slash-command' }
  ]);
  assertEquals(instructions.includes('FIRST ACTION: Execute /superpowers:brainstorming'), true);
});

Deno.test('getSkillInstructions returns correct format for skill-tool', () => {
  const instructions = getSkillInstructions([
    { name: 'requesting-code-review', type: 'skill-tool' }
  ]);
  assertEquals(instructions.includes('Skill tool to invoke'), true);
});
```

### Step 1.2: Run test to verify it fails

Run: `deno test --allow-all src/claude/skills.test.ts`
Expected: FAIL with "Cannot find module './skills.ts'"

### Step 1.3: Write skills.ts implementation

```typescript
// src/claude/skills.ts
import type { RoleName } from '../types.ts';

export type SkillType = 'slash-command' | 'skill-tool';

export interface SkillConfig {
  name: string;
  type: SkillType;
}

export const ROLE_SKILLS: Record<RoleName, SkillConfig[]> = {
  mayor: [
    { name: 'dispatching-parallel-agents', type: 'skill-tool' },
    { name: 'finishing-a-development-branch', type: 'skill-tool' },
  ],
  planner: [
    { name: 'brainstorming', type: 'slash-command' },
    { name: 'writing-plans', type: 'slash-command' },
  ],
  foreman: [
    { name: 'subagent-driven-development', type: 'skill-tool' },
  ],
  polecat: [
    { name: 'executing-plans', type: 'slash-command' },
  ],
  witness: [
    { name: 'requesting-code-review', type: 'skill-tool' },
  ],
  dog: [
    { name: 'test-driven-development', type: 'skill-tool' },
    { name: 'verification-before-completion', type: 'skill-tool' },
  ],
  refinery: [
    { name: 'systematic-debugging', type: 'skill-tool' },
  ],
  prime: [],
};

/**
 * Generate skill invocation instructions for a role.
 * Slash commands use "FIRST ACTION: Execute /superpowers:..."
 * Skill tools use "You MUST use the Skill tool to invoke..."
 */
export function getSkillInstructions(skills: SkillConfig[]): string {
  if (skills.length === 0) {
    return '';
  }

  const instructions: string[] = [];
  let stepNum = 1;

  for (const skill of skills) {
    if (skill.type === 'slash-command') {
      if (stepNum === 1) {
        instructions.push(
          `FIRST ACTION: Execute /superpowers:${skill.name} and follow its workflow completely.`
        );
      } else {
        instructions.push(
          `THEN: Execute /superpowers:${skill.name} and follow its workflow.`
        );
      }
      stepNum++;
    } else {
      instructions.push(
        `You MUST use the Skill tool to invoke "superpowers:${skill.name}" when applicable.`
      );
    }
  }

  return instructions.join('\n');
}

/**
 * Get skill instructions for a specific role.
 */
export function getRoleSkillInstructions(role: RoleName): string {
  const skills = ROLE_SKILLS[role];
  return getSkillInstructions(skills);
}
```

### Step 1.4: Run test to verify it passes

Run: `deno test --allow-all src/claude/skills.test.ts`
Expected: PASS (4 tests)

### Step 1.5: Write test for buildRolePrompt integration

```typescript
// Add to src/claude/skills.test.ts

Deno.test('polecat prompt includes executing-plans instruction', () => {
  const instructions = getRoleSkillInstructions('polecat');
  assertEquals(instructions.includes('/superpowers:executing-plans'), true);
});

Deno.test('mayor prompt includes skill-tool instructions', () => {
  const instructions = getRoleSkillInstructions('mayor');
  assertEquals(instructions.includes('dispatching-parallel-agents'), true);
  assertEquals(instructions.includes('finishing-a-development-branch'), true);
});
```

### Step 1.6: Modify buildRolePrompt to include skill instructions

Modify `src/claude/command.ts`:

```typescript
// Add import at top
import { getRoleSkillInstructions } from './skills.ts';

// Modify buildRolePrompt function (around line 323)
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

  // Get skill instructions for this role
  const skillInstructions = getRoleSkillInstructions(role);

  const prompts: Record<RoleName, (task: string, checkpoint?: string, contextPath?: string) => string> = {
    // ... existing prompts ...
  };

  const basePrompt = prompts[role](task, checkpoint, contextPath);

  // Prepend skill instructions if any
  if (skillInstructions) {
    return `${skillInstructions}\n\n${basePrompt}`;
  }

  return basePrompt;
}
```

### Step 1.7: Run all tests

Run: `deno test --allow-all src/claude/`
Expected: PASS

### Step 1.8: Update agent markdown files

Update `.gastown/agents/planner.md` - add to top of content section:

```markdown
## Required Skills

**You MUST execute these skills in order:**
1. `/superpowers:brainstorming` - First, explore the problem space
2. `/superpowers:writing-plans` - Then, write the implementation plan

Do NOT skip these skills. They are mandatory for quality output.
```

Similar updates for other agent files.

### Step 1.9: Commit

```bash
git add src/claude/skills.ts src/claude/skills.test.ts src/claude/command.ts .gastown/agents/
git commit -m "feat(skills): add Superpowers skill binding for all roles

- Create skills.ts with ROLE_SKILLS mapping
- Distinguish slash-command vs skill-tool types
- Integrate skill instructions into buildRolePrompt
- Update agent markdown files with skill requirements"
```

---

## Task 2: tmux Status Bar Enhancement

**Priority:** P2

**Files:**
- Create: `src/tmux/status.ts`
- Modify: `src/tmux/operations.ts`
- Modify: `src/claude/launcher.ts`
- Test: `src/tmux/status.test.ts`

### Step 2.1: Write failing test for status bar builder

```typescript
// src/tmux/status.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildStatusBarConfig, ROLE_ICONS } from './status.ts';

Deno.test('ROLE_ICONS contains all roles', () => {
  const expectedRoles = ['mayor', 'planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery', 'prime'];
  for (const role of expectedRoles) {
    assertEquals(role in ROLE_ICONS, true, `Missing icon for: ${role}`);
  }
});

Deno.test('buildStatusBarConfig returns valid tmux commands', () => {
  const config = buildStatusBarConfig('mayor', 'test-convoy', 'Build chess game');
  assertEquals(config.includes('set-option'), true);
  assertEquals(config.includes('status-left'), true);
});
```

### Step 2.2: Run test to verify it fails

Run: `deno test --allow-all src/tmux/status.test.ts`
Expected: FAIL with "Cannot find module './status.ts'"

### Step 2.3: Write status.ts implementation

```typescript
// src/tmux/status.ts
import type { RoleName } from '../types.ts';

export const ROLE_ICONS: Record<RoleName, string> = {
  mayor: '🎖️',
  planner: '📐',
  foreman: '🔧',
  polecat: '⚡',
  witness: '👁️',
  dog: '🐕',
  refinery: '🏭',
  prime: '🏛️',
};

export const ROLE_COLORS: Record<RoleName, string> = {
  mayor: 'yellow',
  planner: 'cyan',
  foreman: 'magenta',
  polecat: 'green',
  witness: 'blue',
  dog: 'white',
  refinery: 'red',
  prime: 'colour208', // orange
};

/**
 * Build tmux commands to configure status bar for a gastown session.
 */
export function buildStatusBarConfig(
  role: RoleName,
  convoyId: string,
  task: string,
): string[] {
  const icon = ROLE_ICONS[role];
  const color = ROLE_COLORS[role];
  const shortTask = task.length > 40 ? task.substring(0, 37) + '...' : task;

  return [
    // Status bar styling
    `set-option -g status-style "bg=colour235,fg=white"`,

    // Left side: role icon and name
    `set-option -g status-left "#[fg=${color},bold] ${icon} ${role.toUpperCase()} #[default]│ "`,
    `set-option -g status-left-length 25`,

    // Right side: convoy and task
    `set-option -g status-right "#[fg=colour245]${convoyId}#[default] │ #[fg=white]${shortTask}#[default]"`,
    `set-option -g status-right-length 60`,

    // Window status format
    `set-option -g window-status-format " #I:#W "`,
    `set-option -g window-status-current-format "#[fg=green,bold] #I:#W #[default]"`,

    // Pane border with role indicator
    `set-option -g pane-border-format " #{pane_index}: #{pane_title} "`,
    `set-option -g pane-border-status top`,
  ];
}

/**
 * Build tmux command to set pane title.
 */
export function buildSetPaneTitleCommand(
  sessionName: string,
  paneIndex: string,
  role: RoleName,
): string {
  const icon = ROLE_ICONS[role];
  return `tmux select-pane -t "${sessionName}:0.${paneIndex}" -T "${icon} ${role}"`;
}

/**
 * Build combined tmux commands for session initialization.
 */
export function buildSessionInitCommands(
  sessionName: string,
  role: RoleName,
  convoyId: string,
  task: string,
): string[] {
  const statusCommands = buildStatusBarConfig(role, convoyId, task);
  const targetedCommands = statusCommands.map(
    cmd => `tmux ${cmd} -t "${sessionName}"`
  );

  // Add pane title for first pane
  targetedCommands.push(buildSetPaneTitleCommand(sessionName, '0', role));

  return targetedCommands;
}
```

### Step 2.4: Run test to verify it passes

Run: `deno test --allow-all src/tmux/status.test.ts`
Expected: PASS

### Step 2.5: Add integration function to operations.ts

Add to `src/tmux/operations.ts`:

```typescript
import { buildSessionInitCommands } from './status.ts';
import type { RoleName } from '../types.ts';

/**
 * Initialize tmux session with gastown status bar styling.
 */
export async function initSessionStyling(
  sessionName: string,
  role: RoleName,
  convoyId: string,
  task: string,
): Promise<boolean> {
  const commands = buildSessionInitCommands(sessionName, role, convoyId, task);

  for (const cmd of commands) {
    const result = await runTmuxCommand(cmd);
    if (!result.success) {
      debug('Failed to run styling command:', cmd, result.output);
      // Continue anyway - styling is not critical
    }
  }

  return true;
}
```

### Step 2.6: Integrate into launcher.ts

Modify `src/claude/launcher.ts` - add styling after session creation:

```typescript
import { initSessionStyling } from '../tmux/operations.ts';

// In launchMayor function, after createSession:
export async function launchMayor(
  sessionName: string,
  projectDir: string,
  convoyId: string,
  convoyName: string,
  task: string,
  contextPath?: string,
  primeMode?: boolean
): Promise<boolean> {
  const success = await launchRole(
    sessionName,
    {
      role: 'mayor',
      projectDir,
      convoyId,
      convoyName,
      task,
      contextPath,
      primeMode,
    },
    true
  );

  if (success) {
    // Apply status bar styling
    await initSessionStyling(sessionName, 'mayor', convoyId, task);
  }

  return success;
}
```

### Step 2.7: Run all tests

Run: `deno test --allow-all`
Expected: PASS

### Step 2.8: Commit

```bash
git add src/tmux/status.ts src/tmux/status.test.ts src/tmux/operations.ts src/claude/launcher.ts
git commit -m "feat(tmux): add status bar with role icons and convoy info

- Create status.ts with ROLE_ICONS and ROLE_COLORS
- Build status bar config with role, convoy, task
- Add pane title with role indicator
- Integrate styling into session launch"
```

---

## Task 3: GUPP Hook System

**Priority:** P2

**Files:**
- Create: `src/gupp/check.ts`
- Create: `src/gupp/trigger.ts`
- Create: `src/gupp/mod.ts`
- Create: `.claude/hooks/gupp.yaml`
- Modify: `gastown.ts` (add gupp command)
- Test: `src/gupp/check.test.ts`

### Step 3.1: Write failing test for GUPP check

```typescript
// src/gupp/check.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkForReadyWork, GuppCheckResult } from './check.ts';

Deno.test('checkForReadyWork returns empty when no convoy', async () => {
  const result = await checkForReadyWork(undefined);
  assertEquals(result.hasWork, false);
  assertEquals(result.readyTasks.length, 0);
});
```

### Step 3.2: Run test to verify it fails

Run: `deno test --allow-all src/gupp/check.test.ts`
Expected: FAIL with "Cannot find module './check.ts'"

### Step 3.3: Write check.ts implementation

```typescript
// src/gupp/check.ts
import { getReadyTasks, listAgentBeads, getConvoy } from '../bd-cli/mod.ts';

export interface GuppCheckResult {
  hasWork: boolean;
  readyTasks: Array<{ id: string; title: string }>;
  allTasksDone: boolean;
  idleWorkerSlots: number;
  convoyId?: string;
}

/**
 * Check for ready work in the current convoy.
 * Returns tasks that are ready to be worked on and available worker slots.
 */
export async function checkForReadyWork(
  convoyId?: string,
): Promise<GuppCheckResult> {
  const id = convoyId || Deno.env.get('GASTOWN_BD');

  if (!id) {
    return {
      hasWork: false,
      readyTasks: [],
      allTasksDone: false,
      idleWorkerSlots: 0,
    };
  }

  try {
    // Get convoy info
    const convoy = await getConvoy(id);

    // Get ready tasks (no blockers)
    const tasks = await getReadyTasks(id);

    // Get current agents and their states
    const agents = await listAgentBeads(id);
    const workingAgents = agents.filter(a => a.state === 'working');
    const maxWorkers = 3; // TODO: get from convoy config
    const idleSlots = Math.max(0, maxWorkers - workingAgents.length);

    // Check if all tasks are done
    const allDone = convoy.status === 'closed' ||
      (tasks.length === 0 && agents.every(a => a.state === 'done' || a.state === 'idle'));

    return {
      hasWork: tasks.length > 0 && idleSlots > 0,
      readyTasks: tasks.map(t => ({ id: t.id, title: t.title })),
      allTasksDone: allDone,
      idleWorkerSlots: idleSlots,
      convoyId: id,
    };
  } catch (error) {
    console.error('GUPP check failed:', error);
    return {
      hasWork: false,
      readyTasks: [],
      allTasksDone: false,
      idleWorkerSlots: 0,
      convoyId: id,
    };
  }
}
```

### Step 3.4: Write trigger.ts

```typescript
// src/gupp/trigger.ts
import { spawnAgent } from '../spawn/mod.ts';
import { checkForReadyWork, GuppCheckResult } from './check.ts';

export interface TriggerResult {
  triggered: boolean;
  spawnedAgents: Array<{ role: string; taskId: string }>;
  notifiedMayor: boolean;
}

/**
 * Trigger work based on GUPP check result.
 * Spawns workers for ready tasks or notifies Mayor when all done.
 */
export async function triggerWork(
  checkResult: GuppCheckResult,
  dryRun: boolean = false,
): Promise<TriggerResult> {
  const result: TriggerResult = {
    triggered: false,
    spawnedAgents: [],
    notifiedMayor: false,
  };

  if (!checkResult.convoyId) {
    return result;
  }

  // If all tasks done, notify Mayor
  if (checkResult.allTasksDone) {
    if (!dryRun) {
      console.log('GUPP: All tasks complete. Mayor should run finishing-a-development-branch.');
      // Could add bd comment here to notify Mayor
    }
    result.notifiedMayor = true;
    result.triggered = true;
    return result;
  }

  // Spawn workers for ready tasks (up to available slots)
  const tasksToSpawn = checkResult.readyTasks.slice(0, checkResult.idleWorkerSlots);

  for (const task of tasksToSpawn) {
    if (!dryRun) {
      try {
        await spawnAgent({
          role: 'polecat',
          task: task.title,
          convoyId: checkResult.convoyId,
        });
        result.spawnedAgents.push({ role: 'polecat', taskId: task.id });
      } catch (error) {
        console.error(`Failed to spawn polecat for ${task.id}:`, error);
      }
    } else {
      console.log(`GUPP (dry-run): Would spawn polecat for "${task.title}"`);
      result.spawnedAgents.push({ role: 'polecat', taskId: task.id });
    }
  }

  result.triggered = result.spawnedAgents.length > 0;
  return result;
}
```

### Step 3.5: Write mod.ts

```typescript
// src/gupp/mod.ts
export { checkForReadyWork, type GuppCheckResult } from './check.ts';
export { triggerWork, type TriggerResult } from './trigger.ts';
```

### Step 3.6: Add gupp command to gastown.ts

Add to `gastown.ts`:

```typescript
import { checkForReadyWork, triggerWork } from './src/gupp/mod.ts';

// Add in main() after spawn command handling:
if (command === 'gupp') {
  const subcommand = rest[0]?.toString();

  if (subcommand === 'check') {
    const result = await checkForReadyWork();

    if (args['dry-run']) {
      console.log('GUPP Check (dry-run):');
      console.log(`  Convoy: ${result.convoyId || 'none'}`);
      console.log(`  Ready tasks: ${result.readyTasks.length}`);
      console.log(`  Idle slots: ${result.idleWorkerSlots}`);
      console.log(`  All done: ${result.allTasksDone}`);

      if (result.hasWork) {
        const triggerResult = await triggerWork(result, true);
        console.log(`  Would spawn: ${triggerResult.spawnedAgents.length} agents`);
      }
    } else {
      if (result.hasWork || result.allTasksDone) {
        await triggerWork(result, false);
      }
    }
    return;
  }

  console.error('Usage: gastown gupp check [--dry-run]');
  Deno.exit(1);
}
```

### Step 3.7: Create Claude hooks file

```yaml
# .claude/hooks/gupp.yaml
# GUPP - Gastown Universal Propulsion Principle
# "If there is work on your hook, YOU MUST RUN IT"

hooks:
  # Trigger GUPP check when new task is created
  - event: PostToolUse
    matcher:
      tool: mcp__beads__create
    command: |
      if [ -n "$GASTOWN_BD" ]; then
        $GASTOWN_BIN gupp check 2>/dev/null || true
      fi

  # Trigger GUPP check when task status changes
  - event: PostToolUse
    matcher:
      tool: mcp__beads__update
    command: |
      if [ -n "$GASTOWN_BD" ]; then
        $GASTOWN_BIN gupp check 2>/dev/null || true
      fi

  # Trigger GUPP check when task is closed
  - event: PostToolUse
    matcher:
      tool: mcp__beads__close
    command: |
      if [ -n "$GASTOWN_BD" ]; then
        $GASTOWN_BIN gupp check 2>/dev/null || true
      fi
```

### Step 3.8: Run tests

Run: `deno test --allow-all src/gupp/`
Expected: PASS

### Step 3.9: Commit

```bash
git add src/gupp/ .claude/hooks/gupp.yaml gastown.ts
git commit -m "feat(gupp): add GUPP auto-triggering via Claude hooks

- Create check.ts for detecting ready work
- Create trigger.ts for spawning workers
- Add 'gastown gupp check' command
- Create Claude hooks for PostToolUse events
- GUPP principle: If there is work on your hook, YOU MUST RUN IT"
```

---

## Task 4: mprocs Dashboard

**Priority:** P3 (depends on other features working)

**Files:**
- Create: `src/dashboard/dashboard.ts`
- Create: `src/dashboard/mprocs.ts`
- Create: `src/dashboard/mod.ts`
- Create: `.gastown/templates/dashboard.mprocs.yaml`
- Modify: `gastown.ts` (add dashboard command)
- Test: `src/dashboard/dashboard.test.ts`

### Step 4.1: Write failing test

```typescript
// src/dashboard/dashboard.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { generateMprocsConfig, MprocsConfig } from './mprocs.ts';

Deno.test('generateMprocsConfig creates valid YAML structure', () => {
  const config = generateMprocsConfig([
    { id: 'convoy-123', name: 'chess-game', status: 'running' }
  ]);
  assertEquals(config.includes('procs:'), true);
  assertEquals(config.includes('chess-game'), true);
});
```

### Step 4.2: Run test to verify it fails

Run: `deno test --allow-all src/dashboard/dashboard.test.ts`
Expected: FAIL with "Cannot find module './mprocs.ts'"

### Step 4.3: Write mprocs.ts

```typescript
// src/dashboard/mprocs.ts

export interface ConvoyInfo {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'idle';
}

/**
 * Generate mprocs YAML configuration for gastown dashboard.
 */
export function generateMprocsConfig(convoys: ConvoyInfo[]): string {
  const procs: Record<string, { shell: string; cwd?: string }> = {
    // Status overview process
    status: {
      shell: 'watch -n 2 -c "gastown --status"',
    },
  };

  // Add each convoy as a process
  for (const convoy of convoys) {
    const sessionName = `gastown-${convoy.id}`;
    procs[convoy.name || convoy.id] = {
      shell: `tmux attach -t ${sessionName} 2>/dev/null || echo "Session ${sessionName} not running. Press any key to refresh." && read -n 1`,
    };
  }

  // Build YAML manually (simple structure, no need for lib)
  const lines = ['procs:'];
  for (const [name, config] of Object.entries(procs)) {
    lines.push(`  ${name}:`);
    lines.push(`    shell: "${config.shell.replace(/"/g, '\\"')}"`);
    if (config.cwd) {
      lines.push(`    cwd: "${config.cwd}"`);
    }
  }

  return lines.join('\n');
}

/**
 * Write mprocs config to temporary file and return path.
 */
export async function writeMprocsConfig(config: string): Promise<string> {
  const tmpDir = Deno.env.get('TMPDIR') || '/tmp';
  const configPath = `${tmpDir}/gastown-dashboard.yaml`;
  await Deno.writeTextFile(configPath, config);
  return configPath;
}
```

### Step 4.4: Write dashboard.ts

```typescript
// src/dashboard/dashboard.ts
import { listConvoys } from '../bd-cli/mod.ts';
import { listSessions } from '../tmux/operations.ts';
import { generateMprocsConfig, writeMprocsConfig, ConvoyInfo } from './mprocs.ts';

/**
 * Launch mprocs dashboard for all convoys.
 */
export async function launchDashboard(): Promise<void> {
  // Get all convoys
  const convoys = await listConvoys('open');
  const sessions = await listSessions();

  // Build convoy info with running status
  const convoyInfos: ConvoyInfo[] = convoys.map(c => ({
    id: c.id,
    name: c.title.substring(0, 20).replace(/\s+/g, '-').toLowerCase(),
    status: sessions.includes(`gastown-${c.id}`) ? 'running' : 'stopped',
  }));

  if (convoyInfos.length === 0) {
    console.log('No active convoys. Start one with: gastown "your task"');
    return;
  }

  // Generate and write mprocs config
  const config = generateMprocsConfig(convoyInfos);
  const configPath = await writeMprocsConfig(config);

  console.log(`Launching dashboard with ${convoyInfos.length} convoy(s)...`);
  console.log('Press q to quit dashboard (tmux sessions continue running)');

  // Launch mprocs
  const process = new Deno.Command('mprocs', {
    args: ['--config', configPath],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  await process.output();
}
```

### Step 4.5: Write mod.ts

```typescript
// src/dashboard/mod.ts
export { launchDashboard } from './dashboard.ts';
export { generateMprocsConfig, writeMprocsConfig } from './mprocs.ts';
```

### Step 4.6: Add dashboard command to gastown.ts

```typescript
import { launchDashboard } from './src/dashboard/mod.ts';

// Add in main():
if (command === 'dashboard') {
  await launchDashboard();
  return;
}
```

### Step 4.7: Create template file

```yaml
# .gastown/templates/dashboard.mprocs.yaml
# Template for mprocs dashboard configuration
# This file is auto-generated by 'gastown dashboard'

procs:
  status:
    shell: "watch -n 2 -c 'gastown --status'"

  # Convoys will be added here dynamically
  # Example:
  # my-convoy:
  #   shell: "tmux attach -t gastown-abc123 || echo 'Not running'"
```

### Step 4.8: Run tests

Run: `deno test --allow-all src/dashboard/`
Expected: PASS

### Step 4.9: Commit

```bash
git add src/dashboard/ .gastown/templates/dashboard.mprocs.yaml gastown.ts
git commit -m "feat(dashboard): add mprocs-based dashboard for rig overview

- Create mprocs.ts for YAML config generation
- Create dashboard.ts for launching mprocs
- Add 'gastown dashboard' command
- Dashboard shows all convoys with status
- Closing dashboard keeps tmux sessions running"
```

---

## Final Steps

### Run full test suite

```bash
deno test --allow-all
deno lint
deno fmt --check
```

### Update CLAUDE.md

Add new commands to CLAUDE.md:

```markdown
## New Commands

# Launch dashboard
gastown dashboard

# GUPP check
gastown gupp check [--dry-run]
```

### Final commit

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new commands"
```

---

## Summary

| Task | Files | Estimated Steps |
|------|-------|-----------------|
| 1. Superpowers Binding | 3 new, 8 modified | 9 steps |
| 2. tmux Status Bar | 2 new, 2 modified | 8 steps |
| 3. GUPP Hooks | 4 new, 1 modified | 9 steps |
| 4. mprocs Dashboard | 4 new, 1 modified | 9 steps |
| **Total** | **13 new, 12 modified** | **35 steps** |

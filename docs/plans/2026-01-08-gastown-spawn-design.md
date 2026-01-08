# Design: `gastown spawn` Command

**Date**: 2026-01-08
**Status**: Approved
**Problem**: Mayor executes tasks directly instead of delegating to specialist agents

## Background

The original Gastown architecture specifies that Mayor is a coordinator, not an executor:

> "The Mayor's job is delegation and oversight, not direct task execution. The architecture prevents the Mayor from directly coding—instead it orchestrates specialist agents."

In the current gastown_b implementation, Mayor's instructions say "Delegate to Planner - Use superpowers:brainstorming skill" which causes Mayor to do the work directly rather than spawning a separate Planner agent.

## Solution

Add a `gastown spawn` command that Mayor uses to launch specialist agents in separate tmux panes.

## Command Interface

```bash
# Basic usage (within a convoy)
gastown spawn <role> --task "<task description>"

# Full options
gastown spawn <role> \
  --task "<description>"      # Task for the agent (required)
  --convoy <id>               # Parent convoy (default: $GASTOWN_BD)
  --context <file>            # Optional context file path
  --project-dir <path>        # Working directory (default: cwd)
```

**Supported roles**: `planner`, `foreman`, `polecat`, `witness`, `dog`, `refinery`

## Environment Variables

Spawned agents receive:

| Variable | Value | Purpose |
|----------|-------|---------|
| `GASTOWN_BD` | Convoy ID | Shared state, comments |
| `GASTOWN_AGENT_ID` | Agent's bead ID | Lifecycle tracking |
| `GASTOWN_CONVOY` | tmux session name | Session targeting |
| `GASTOWN_ROLE` | Agent role | Role identification |
| `GASTOWN_CONTEXT` | Context file path | Optional context |

**Usage in agent:**
```bash
# Shared convoy communication
bd comments add $GASTOWN_BD "PROGRESS: Design complete"
bd show $GASTOWN_BD  # See convoy state

# Own lifecycle
bd agent state $GASTOWN_AGENT_ID working
bd agent heartbeat $GASTOWN_AGENT_ID
```

## Internal Flow

```
gastown spawn planner --task "Design auth"
         │
         ▼
┌─────────────────────────────────────────┐
│ 1. Resolve convoy ID                    │
│    - Use --convoy flag, or              │
│    - Read $GASTOWN_BD from environment  │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ 2. Create agent bead                    │
│    bd create "planner" --type task \    │
│      --labels "gt:agent,role:planner" \ │
│      --parent <convoy-id>               │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ 3. Resolve tmux session                 │
│    - Use $GASTOWN_CONVOY, or            │
│    - Derive from convoy name            │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ 4. Launch Claude in new tmux pane       │
│    tmux split-window with:              │
│    - GASTOWN_BD=<convoy-id>             │
│    - GASTOWN_AGENT_ID=<agent-bead-id>   │
│    - claude --agent .gastown/agents/... │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ 5. Output result                        │
│    { agent_id, convoy_id, pane, role }  │
└─────────────────────────────────────────┘
```

## File Structure

```
gastown_b/
├── gastown.ts                    # Add 'spawn' subcommand
├── src/
│   ├── cli/
│   │   └── commands.ts           # Add spawnAgent() function
│   ├── spawn/                    # NEW directory
│   │   ├── mod.ts                # Export public API
│   │   └── spawn.ts              # Core spawn logic
│   └── types.ts                  # Add SpawnOptions type
└── .gastown/agents/
    └── mayor.md                  # Update delegation instructions
```

## Implementation

### `src/spawn/spawn.ts`

```typescript
import { createAgentBead, setAgentState } from '../bd-cli/agent.ts';
import { buildClaudeCommand, buildRolePrompt } from '../claude/command.ts';
import { splitWindow } from '../tmux/operations.ts';

export interface SpawnOptions {
  role: RoleName;
  task: string;
  convoyId?: string;
  convoyName?: string;
  contextPath?: string;
  projectDir?: string;
  paneDirection?: 'h' | 'v';
}

export interface SpawnResult {
  agentId: string;
  convoyId: string;
  paneIndex: number;
  role: RoleName;
}

export async function spawnAgent(options: SpawnOptions): Promise<SpawnResult> {
  // 1. Resolve convoy
  const convoyId = options.convoyId || Deno.env.get('GASTOWN_BD');
  const convoyName = options.convoyName || Deno.env.get('GASTOWN_CONVOY');

  if (!convoyId || !convoyName) {
    throw new Error('Missing convoy context');
  }

  // 2. Create agent bead
  const agent = await createAgentBead({
    role: options.role,
    convoyId: convoyId,
  });
  await setAgentState(agent.id, 'spawning');

  // 3. Build command
  const prompt = buildRolePrompt(options.role, options.task);
  const command = buildClaudeCommand({
    role: options.role,
    agentDir: '.gastown/agents',
    convoyId: convoyId,
    agentId: agent.id,
    convoyName: convoyName,
    contextPath: options.contextPath,
    prompt: prompt,
    workingDir: options.projectDir,
  });

  // 4. Launch in tmux
  const paneIndex = await splitWindow(
    convoyName,
    command,
    options.paneDirection || 'h'
  );

  // 5. Return result
  await setAgentState(agent.id, 'running');

  return {
    agentId: agent.id,
    convoyId: convoyId,
    paneIndex: paneIndex,
    role: options.role,
  };
}
```

### Changes to `buildClaudeEnvVars`

Add `agentId` parameter:

```typescript
export function buildClaudeEnvVars(
  role: RoleName,
  convoyId: string,
  convoyName: string,
  contextPath?: string,
  mayorPaneIndex?: string,
  agentId?: string,  // NEW
): Record<string, string> {
  const vars: Record<string, string> = {
    GASTOWN_ROLE: role,
    GASTOWN_BD: convoyId,
    GASTOWN_CONVOY: convoyName,
  };
  if (agentId) {
    vars.GASTOWN_AGENT_ID = agentId;
  }
  // ... rest unchanged
}
```

### CLI Integration

Add to `gastown.ts`:

```typescript
if (command === 'spawn') {
  const role = rest[0]?.toString() as RoleName;
  if (!role || !args.task) {
    console.error('Usage: gastown spawn <role> --task "<description>"');
    Deno.exit(1);
  }

  const result = await spawnAgent({
    role,
    task: args.task,
    convoyId: args.convoy,
    contextPath: args.context,
  });

  console.log(`Spawned ${role}: ${result.agentId} (pane ${result.paneIndex})`);
  return;
}
```

## Mayor Instructions Update

Replace skill-based delegation in `.gastown/agents/mayor.md`:

```markdown
## Delegation via Agent Spawning

Instead of doing work yourself, spawn specialist agents:

**1. For Planning/Design:**
```bash
gastown spawn planner --task "Design the authentication system"
```

**2. For Task Breakdown:**
```bash
gastown spawn foreman --task "Break down implementation from docs/plans/"
```

**3. For Implementation:**
```bash
gastown spawn polecat --task "Implement <specific-task>"
```

### Key Rules
- NEVER use brainstorming/planning skills directly - spawn planner instead
- NEVER write code yourself - spawn polecat instead
- Monitor progress via `bd comments $GASTOWN_BD`
```

## New Workflow

```
User → gastown --prime "Build auth"
         │
         ▼
     Mayor spawns → Planner (brainstorms design)
         │
         ▼
     Mayor spawns → Foreman (breaks into tasks)
         │
         ▼
     Mayor spawns → Polecat(s) (implement tasks)
         │
         ▼
     Mayor reports completion
```

## Implementation Order

1. Add `GASTOWN_AGENT_ID` to `buildClaudeEnvVars` in `src/claude/command.ts`
2. Create `src/spawn/spawn.ts` with core logic
3. Create `src/spawn/mod.ts` with exports
4. Add `spawn` subcommand to `gastown.ts`
5. Update `.gastown/agents/mayor.md` with new delegation instructions
6. Add tests for spawn functionality

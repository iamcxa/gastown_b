# Gas Town Claude

Multi-Agent Orchestrator for Claude Code using bd CLI for state management.

## Overview

Gas Town Claude enables coordination of multiple Claude Code instances for complex tasks. Each agent role has specific responsibilities, and all state is managed through bd CLI for reliable persistence and recovery.

## Architecture

Gas Town uses a dual-layer CLI architecture:

1. **gastown CLI** - High-level convoy coordination
2. **bd CLI** - Low-level state management (beads issue tracker)

All persistent state is managed through bd CLI commands:
- **Convoys** are stored as bd epics with the `convoy` label
- **Agents** are stored as bd agent beads with state tracking
- **Tasks** are stored as bd issues with dependencies

## Quick Start

```bash
# Initialize in your project
./gastown init

# Start a new convoy
./gastown "Implement user authentication"

# Start with Prime Minister mode (autonomous)
./gastown --prime "Implement user authentication"

# Launch the Dashboard (Control Room + Commander)
./gastown dashboard

# Resume a convoy
./gastown --resume gastown_b-abc123

# Check status
./gastown --status
```

## Dashboard Mode

The dashboard provides a visual control center using mprocs:

```
┌──────────────┬──────────────┬────────────────────────────┐
│ ◈ CONTROL    │ 💬 COMMANDER │ ▶ convoy-abc │ ▶ convoy-xyz│
│   ROOM       │   (interact) │              │             │
└──────────────┴──────────────┴────────────────────────────┘
```

**Control Room** - Status display showing:
- System runtime
- Convoy stats (Active/Idle/Total)
- Linear status (P0/P1/P2+ counts)
- Commander status

**Commander** - Interactive pane for:
- Starting new convoys (`start "task"`)
- Checking Linear issues (`check linear`)
- Spawning PM to answer questions
- Setting goals

Launch with:
```bash
./gastown dashboard
# or
./gastown -d
```

## Agent Roles

```
User <-> Commander (strategic control, dashboard interface)
         |
         +-> Mayor (convoy coordinator)
              |-- Planner (brainstorming -> design)
              |-- Foreman (design -> tasks)
              +-- Workers
                   |-- Polecat (implementation)
                   |-- Witness (code review)
                   |-- Dog (testing)
                   +-- Refinery (quality)

Support Agents (spawned on-demand):
  |-- PM (answers Mayor's questions, event-driven)
  |-- Linear Scout (fetches Linear issues)
  +-- Prime (continuous monitoring, legacy mode)
```

| Agent | Purpose | Mode |
|-------|---------|------|
| Commander | Human interface, strategic control | Dashboard |
| Mayor | Convoy coordination | Per-convoy |
| PM | Answer questions from context | On-demand |
| Linear Scout | Fetch Linear issues | On-demand |
| Prime | Autonomous supervision | Legacy (--prime) |

## Features

- **bd CLI Integration** - State managed via bd CLI commands
- **Automatic Respawn** - Workers checkpoint and respawn on context exhaustion
- **Dependency Scheduling** - Tasks run in correct order based on dependencies
- **tmux Integration** - View all agents in split panes
- **Prime Minister Mode** - Autonomous convoy supervision

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

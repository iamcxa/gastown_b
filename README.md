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

# Resume a convoy
./gastown --resume gastown_b-abc123

# Check status
./gastown --status
```

## Agent Roles

```
User <-> Mayor (coordinator)
         |-- Planner (brainstorming -> design)
         |-- Foreman (design -> tasks)
         +-- Workers
              |-- Polecat (implementation)
              |-- Witness (code review)
              |-- Dog (testing)
              +-- Refinery (quality)
         +-- Prime (autonomous decision-making)
```

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

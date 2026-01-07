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
User <-> Mayor (coordinator)
         |-- Planner (brainstorming -> design)
         |-- Foreman (design -> tasks)
         +-- Workers
              |-- Polecat (implementation)
              |-- Witness (code review)
              |-- Dog (testing)
              +-- Refinery (quality)
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

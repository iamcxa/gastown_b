# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gas Town is a multi-agent orchestrator for Claude Code. It coordinates multiple Claude instances (agents) to work on complex tasks using tmux sessions and bd CLI for state management.

## Commands

```bash
# Run tests
deno test --allow-all

# Run single test file
deno test --allow-all src/cli/commands.test.ts

# Type check
deno check gastown.ts

# Lint
deno lint

# Format
deno fmt

# Compile binary
deno compile --allow-all --output=gastown gastown.ts

# Run development mode
deno task dev
```

## Architecture

### Dual-Layer CLI

```
gastown CLI (high-level)     bd CLI (low-level)
       |                           |
   Convoy coordination      State persistence
   Agent launching          Issue tracking
   tmux management          Dependencies
```

### Source Structure

```
src/
├── cli/           # gastown CLI commands (startConvoyWithBd, resumeConvoyWithBd, etc.)
├── bd-cli/        # bd CLI wrapper functions (convoy, agent, task, slot operations)
├── claude/        # Claude Code launcher (command building, prompts, role configs)
├── tmux/          # tmux session operations
├── respawn/       # Context exhaustion detection and worker respawn
├── bd/            # DEPRECATED: Old .bd file parser/writer (use bd-cli instead)
├── scheduler/     # DEPRECATED: Old task scheduler (not actively used)
└── types.ts       # Core type definitions
```

### Agent Roles

| Role | Purpose |
|------|---------|
| mayor | Convoy coordinator, user interaction |
| planner | Design via brainstorming |
| foreman | Task breakdown from designs |
| polecat | Implementation (TDD) |
| witness | Code review |
| dog | Testing |
| refinery | Code quality |
| prime | Autonomous decision-making (Prime Minister mode) |

Agent definitions are in `.gastown/agents/*.md`.

### State Management

All persistent state uses bd CLI:
- **Convoys**: bd epics with `convoy` label
- **Agents**: bd agent beads with state tracking
- **Tasks**: bd issues with dependencies

Key environment variables passed to agents:
- `$GASTOWN_BD` - Convoy ID (bd issue ID)
- `$GASTOWN_CONVOY` - Convoy name
- `$GASTOWN_ROLE` - Agent role
- `$GASTOWN_CONTEXT` - Context file path (autopilot mode)

### Key Flows

**Starting a convoy:**
1. `startConvoyWithBd()` creates convoy epic via `bd create`
2. Creates agent beads (mayor, planner, foreman)
3. Launches tmux session with Mayor

**Agent communication:**
- Agents use `bd show $GASTOWN_BD` to check state
- Agents use `bd comments add $GASTOWN_BD "..."` to log progress/questions
- Prime Minister mode: Mayor writes `QUESTION:` comments, PM responds with `ANSWER:`

## Session Protocol

Before completing any work session:
```bash
git status              # Check changes
git add <files>         # Stage code
bd sync                 # Sync beads
git commit -m "..."     # Commit
bd sync                 # Sync again
git push                # Push to remote
```

## bd CLI Quick Reference

```bash
bd ready                           # Find available work
bd show <id>                       # View issue details
bd update <id> --status in_progress # Claim work
bd close <id>                      # Complete work
bd comments add <id> "message"     # Add comment
bd sync                            # Sync with git
```

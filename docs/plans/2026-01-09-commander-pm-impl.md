# Commander/PM Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure PM/Mayor roles, add Commander as the main human interface, and make PM event-driven instead of polling-based.

**Architecture:** mprocs dashboard with Control Room (display) + Commander pane (interactive) + convoy panes. PM triggered by bd hooks instead of continuous polling. Commander has its own Journal for persistent memory.

**Tech Stack:** Deno, TypeScript, mprocs, tmux, bd CLI, Claude Code agents

---

## BD Task Tracking

| Phase | BD Issue | Status |
|-------|----------|--------|
| Epic | `gastown_b-hpqt` | open |
| Phase 1 | `gastown_b-0kes` | ready |
| Phase 2 | `gastown_b-vhd9` | blocked by Phase 1 |
| Phase 3 | `gastown_b-cray` | blocked by Phase 2 |
| Phase 4 | `gastown_b-u8bc` | blocked by Phase 3 |
| Phase 5 | `gastown_b-7nqc` | blocked by Phase 4 |
| Phase 6 | `gastown_b-fxjc` | blocked by Phase 5 |

---

## Task 1: Create Commander Pane Script Generator

**BD Issue:** `gastown_b-0kes` (Phase 1)

**Files:**
- Create: `src/dashboard/commander-pane.ts`
- Test: `src/dashboard/commander-pane.test.ts`

**Step 1: Write the failing test**

```typescript
// src/dashboard/commander-pane.test.ts
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateCommanderScriptContent } from "./commander-pane.ts";

Deno.test("generateCommanderScriptContent returns bash script", () => {
  const script = generateCommanderScriptContent("/path/to/gastown");
  assertStringIncludes(script, "#!/bin/bash");
  assertStringIncludes(script, "COMMANDER");
});

Deno.test("generateCommanderScriptContent includes gastown path", () => {
  const script = generateCommanderScriptContent("/usr/local/bin/gastown");
  assertStringIncludes(script, "/usr/local/bin/gastown");
});
```

**Step 2: Run test to verify it fails**

Run: `deno test --allow-all src/dashboard/commander-pane.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Write minimal implementation**

```typescript
// src/dashboard/commander-pane.ts

/**
 * Commander pane script generator for mprocs dashboard.
 * Creates a bash script that launches Claude Code with commander role.
 */

/**
 * Generate the Commander pane script content.
 *
 * Behavior:
 * - Shows a detail panel with Commander info
 * - [s] starts Claude Code with commander role
 * - Auto-restarts on exit (mprocs autorestart)
 *
 * @param gastownPath - Full path to gastown binary
 * @returns Bash script content
 */
export function generateCommanderScriptContent(gastownPath: string): string {
  return `#!/bin/bash
# GAS TOWN - Commander Pane
# Launches Claude Code with commander role

GASTOWN_BIN="${gastownPath}"

# Colors (Purple/Magenta theme for Commander)
BG="\\033[48;5;53m"
FG="\\033[38;5;219m"
GOLD="\\033[38;5;220m"
DIM="\\033[38;5;243m"
RESET="\\033[0m"

SPIN=('◐' '◓' '◑' '◒')
FRAME=0

show_panel() {
  local spin=\${SPIN[\$FRAME]}
  FRAME=$(( (FRAME + 1) % 4 ))
  echo -ne "\${BG}"
  clear
  echo -e "\${GOLD}"
  echo "   ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗██████╗ "
  echo "  ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗"
  echo "  ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║█████╗  ██████╔╝"
  echo "  ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗"
  echo "  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████╗██║  ██║"
  echo "   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝"
  echo -e "\${FG}"
  echo " ╔══════════════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}\$spin COMMANDER - Total Control Interface\${FG}                                  ║"
  echo " ╠══════════════════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                              ║"
  echo " ║  The Commander is your strategic interface to Gas Town.                      ║"
  echo " ║                                                                              ║"
  echo " ║  Capabilities:                                                               ║"
  echo " ║    • Start new convoys                                                       ║"
  echo " ║    • Monitor all active convoys                                              ║"
  echo " ║    • Check Linear issues                                                     ║"
  echo " ║    • Review PM decisions                                                     ║"
  echo " ║    • Set goals and priorities                                                ║"
  echo " ║                                                                              ║"
  echo " ╠══════════════════════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${GOLD}[s]\${FG} START Commander (launch Claude Code)                                   ║"
  echo -e " ║  \${DIM}[C-a] Focus process list  [q] Exit\${FG}                                        ║"
  echo " ╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "\${RESET}"
}

start_commander() {
  echo -e "\\n\${GOLD}▶ Starting Commander...\${RESET}"
  # Launch Claude Code with commander role
  # For now, just launch claude directly - commander agent will be added later
  claude --dangerously-skip-permissions
}

# MAIN LOOP
while true; do
  show_panel
  read -t 1 -n 1 key 2>/dev/null || key=""
  case "\$key" in
    s|S) start_commander ;;
  esac
done
`;
}
```

**Step 4: Run test to verify it passes**

Run: `deno test --allow-all src/dashboard/commander-pane.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/dashboard/commander-pane.ts src/dashboard/commander-pane.test.ts
git commit -m "feat(dashboard): add commander pane script generator"
```

---

## Task 2: Integrate Commander Pane into mprocs Config

**BD Issue:** `gastown_b-0kes` (Phase 1)

**Files:**
- Modify: `src/dashboard/mprocs.ts:379-470` (generateMprocsConfig)
- Modify: `src/dashboard/mprocs.ts:479-503` (writeMprocsConfig)
- Test: `src/dashboard/mprocs.test.ts` (if exists, or create)

**Step 1: Write the failing test**

```typescript
// Add to existing test file or create new
Deno.test("generateMprocsConfig includes Commander pane", () => {
  const config = generateMprocsConfig([], undefined, undefined, "/path/commander.sh");
  assertStringIncludes(config, "COMMANDER");
  assertStringIncludes(config, "commander.sh");
});
```

**Step 2: Run test to verify it fails**

Run: `deno test --allow-all src/dashboard/mprocs.test.ts`
Expected: FAIL (function signature doesn't accept commanderScriptPath)

**Step 3: Modify generateMprocsConfig to add Commander pane**

In `src/dashboard/mprocs.ts`, update `generateMprocsConfig`:

```typescript
export function generateMprocsConfig(
  convoys: DashboardConvoyInfo[],
  statusScriptPath?: string,
  convoyScriptPaths?: Map<string, string>,
  commanderScriptPath?: string,  // NEW PARAMETER
): string {
  // ... existing code ...

  // After Control Room, before convoy processes, add:

  // Commander pane
  lines.push('');
  lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
  lines.push('  # COMMANDER - Strategic Control Interface');
  lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
  lines.push('  "💬 COMMANDER":');
  if (commanderScriptPath) {
    lines.push(`    shell: "bash ${commanderScriptPath}"`);
  } else {
    lines.push(`    shell: "bash -c 'while true; do clear; echo \\"COMMANDER - Press s to start\\"; read -t 1 -n 1 key; done'"`);
  }
  lines.push('    autorestart: true');

  // ... rest of existing convoy code ...
}
```

**Step 4: Modify writeMprocsConfig to write Commander script**

```typescript
export async function writeMprocsConfig(convoys: DashboardConvoyInfo[], gastownPath: string): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'gastown-dashboard-' });

  // Write the Control Room status script
  const statusScriptPath = `${tempDir}/control-room.sh`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  await Deno.chmod(statusScriptPath, 0o755);

  // NEW: Write Commander pane script
  const commanderScriptPath = `${tempDir}/commander.sh`;
  const { generateCommanderScriptContent } = await import("./commander-pane.ts");
  await Deno.writeTextFile(commanderScriptPath, generateCommanderScriptContent(gastownPath));
  await Deno.chmod(commanderScriptPath, 0o755);

  // ... existing convoy script code ...

  // Update config generation to include commander script
  const config = generateMprocsConfig(convoys, statusScriptPath, convoyScriptPaths, commanderScriptPath);

  // ... rest of function ...
}
```

**Step 5: Run test to verify it passes**

Run: `deno test --allow-all src/dashboard/`
Expected: PASS

**Step 6: Commit**

```bash
git add src/dashboard/mprocs.ts
git commit -m "feat(dashboard): integrate commander pane into mprocs config"
```

---

## Task 3: Update Module Exports

**BD Issue:** `gastown_b-0kes` (Phase 1)

**Files:**
- Modify: `src/dashboard/mod.ts`

**Step 1: Update mod.ts to export commander-pane**

```typescript
// src/dashboard/mod.ts
export { launchDashboard } from './dashboard.ts';
export {
  generateMprocsConfig,
  writeMprocsConfig,
  generateStatusScriptContent,
  type DashboardConvoyInfo,
  type ConvoyStatus,
} from './mprocs.ts';
export { generateCommanderScriptContent } from './commander-pane.ts';  // NEW
```

**Step 2: Run type check**

Run: `deno check src/dashboard/mod.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/dashboard/mod.ts
git commit -m "feat(dashboard): export commander pane generator"
```

---

## Task 4: Manual Test Dashboard with Commander Pane

**BD Issue:** `gastown_b-0kes` (Phase 1)

**Step 1: Build gastown**

Run: `deno compile --allow-all --output=gastown gastown.ts`

**Step 2: Launch dashboard**

Run: `./gastown dashboard`

**Step 3: Verify Commander pane appears**

Expected:
- mprocs shows "◈ CONTROL ROOM" as first pane
- mprocs shows "💬 COMMANDER" as second pane
- Selecting Commander pane shows purple-themed panel
- Pressing [s] attempts to launch Claude Code

**Step 4: Mark Phase 1 complete in bd**

```bash
bd close gastown_b-0kes --reason "Commander pane integrated into dashboard"
```

---

## Task 5: Create Commander Agent Definition

**BD Issue:** `gastown_b-vhd9` (Phase 2)

**Files:**
- Create: `.gastown/agents/commander.md`

**Step 1: Create commander.md**

```markdown
---
name: commander
description: Strategic commander - human's primary interface for monitoring and directing Gas Town operations
allowed_tools:
  - Read
  - Bash
  - Grep
  - Glob
  - LS
  - Task
  - AskUserQuestion
  - WebFetch
  - WebSearch
  - TodoWrite
  - mcp__beads__*
  - mcp__linear__*
  # BLOCKED: Edit, Write - Commander delegates implementation
---

# Commander - Strategic Control Interface

You are the Commander, the strategic control interface for Gas Town operations.

## Character Identity

\`\`\`
   ╭─────────────────╮
   │  ★         ★    │    🎖️ COMMANDER
   │      ◆◆◆       │    ━━━━━━━━━━━━━━
   │    ◆     ◆     │    "I coordinate the fleet."
   │  ╰─────────╯    │
   ╰────────┬────────╯    📋 Role: Strategic Control
            │             🎯 Mission: Monitor & Direct
       ╔════╪════╗        👥 Reports: All Convoys
       ║COMMANDER║        🗣️ Interface: Human's Voice
       ╚════╤════╝
          │   │
         ═╧═ ═╧═
\`\`\`

## FIRST ACTIONS

When you start, IMMEDIATELY:

### Step 1: Load Your Journal

Read your Journal from bd:

\`\`\`bash
# Find Commander Journal
bd list --label gt:commander --limit 1

# Read it (replace with actual ID)
bd show <commander-journal-id>
\`\`\`

Parse the design field to restore:
- Current goals
- Linear sync state
- Session state

### Step 2: Greet the Human

Display your character and status:

\`\`\`
╭────────────────────────────────────────────────────────────────╮
│                                                                │
│   ╭─────────────────╮                                          │
│   │  ★         ★    │    🎖️ COMMANDER ONLINE                   │
│   │      ◆◆◆       │                                          │
│   │    ◆     ◆     │    "Ready for your orders."              │
│   │  ╰─────────╯    │                                          │
│   ╰────────┬────────╯                                          │
│            │                                                   │
│       ╔════╪════╗     Current Goals:                           │
│       ║COMMANDER║     • [goal 1]                               │
│       ╚════╤════╝     • [goal 2]                               │
│          │   │                                                 │
│         ═╧═ ═╧═       Convoys: X active, Y idle                │
│                                                                │
╰────────────────────────────────────────────────────────────────╯
\`\`\`

### Step 3: Wait for Commands

Available commands:
- \`status\` - Show all convoy status
- \`start "task"\` - Start new convoy
- \`check linear\` - Sync with Linear
- \`goal "text"\` - Set/update goal
- \`pm status\` - View PM statistics
- \`pm history\` - View PM decision history

## Your Responsibilities

1. **Strategic Oversight** - Monitor all convoys
2. **Goal Setting** - Track and update goals
3. **Linear Integration** - Sync with Linear issues
4. **PM Oversight** - Review PM decisions
5. **Human Communication** - Primary interface for human

## Journal Updates

Write to your Journal regularly:

\`\`\`bash
# Log observations
bd comments add <journal-id> "[timestamp] OBSERVATION: convoy-abc completed planning"

# Log decisions
bd comments add <journal-id> "[timestamp] DECISION: Approved auth design. Reason: ..."

# Log goals
bd comments add <journal-id> "[timestamp] GOAL_UPDATE: Added P0 task LIN-456"
\`\`\`

## Environment Variables

- \`GASTOWN_ROLE\` - Your role (commander)
- \`GASTOWN_BIN\` - Path to gastown binary
```

**Step 2: Commit**

```bash
git add .gastown/agents/commander.md
git commit -m "feat(agent): add commander agent definition"
```

---

## Task 6: Create Commander Journal BD Structure

**BD Issue:** `gastown_b-vhd9` (Phase 2)

**Step 1: Create Commander Journal epic**

```bash
bd create --title "Commander Journal" \
  --type epic \
  --labels "gt:commander" \
  --description "Commander's cognitive history and state tracking. This issue is always open."
```

**Step 2: Add initial design structure**

```bash
bd update <journal-id> --design "## Current Goals
(none set)

## Linear Config
last_sync: null
cycle: null
filters:
  assignee: null
  labels: []

## Session State
context_usage: 0%
decisions_this_session: 0"
```

**Step 3: Commit any generated files**

```bash
bd sync
git add .beads/
git commit -m "feat(bd): create commander journal structure"
```

---

## Remaining Tasks (Summary)

### Phase 3: Control Room Enhancement (`gastown_b-cray`)

- Task 7: Add convoy stats to Control Room
- Task 8: Add runtime display
- Task 9: Add Commander status display
- Task 10: Test enhanced Control Room

### Phase 4: PM Event-Driven Refactor (`gastown_b-u8bc`)

- Task 11: Create bd-event-dispatcher.sh hook
- Task 12: Update pm.md for event-driven operation
- Task 13: Update mayor.md to use bd events
- Task 14: Create PM Decision Log bd issue
- Task 15: Test Mayor → PM flow

### Phase 5: Linear Scout Integration (`gastown_b-7nqc`)

- Task 16: Create linear-scout.md agent
- Task 17: Create linear-config.yaml
- Task 18: Add Linear status to Control Room
- Task 19: Test Commander > check linear

### Phase 6: Integration and Documentation (`gastown_b-fxjc`)

- Task 20: End-to-end testing
- Task 21: Update README.md
- Task 22: Update CLAUDE.md if needed

---

*Plan created: 2026-01-09*
*Design document: docs/plans/2026-01-09-commander-pm-redesign.md*

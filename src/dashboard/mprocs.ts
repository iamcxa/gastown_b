// src/dashboard/mprocs.ts

import { buildCommanderCommands, buildCommanderAgentFile } from "../claude/command.ts";

/**
 * mprocs configuration generator for Gastown dashboard.
 * Generates YAML configuration for mprocs TUI to manage convoy sessions.
 *
 * Design: SOVIET SPACE PROGRAM / INDUSTRIAL BRUTALISM
 * - Heavy ASCII art banner with imposing presence
 * - Animated spinning indicators for active processes
 * - Dense information displays with gauge meters
 * - Industrial frame patterns with rivet details
 * - Utilitarian, mission-critical aesthetic
 */

/**
 * Status of a convoy for dashboard display.
 */
export type ConvoyStatus = 'running' | 'stopped' | 'idle';

/**
 * Convoy information for dashboard display.
 */
export interface DashboardConvoyInfo {
  id: string;
  name: string;
  status: ConvoyStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASCII ART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const ASCII_BANNER = `
 ██████╗  █████╗ ███████╗    ████████╗ ██████╗ ██╗    ██╗███╗   ██╗
██╔════╝ ██╔══██╗██╔════╝    ╚══██╔══╝██╔═══██╗██║    ██║████╗  ██║
██║  ███╗███████║███████╗       ██║   ██║   ██║██║ █╗ ██║██╔██╗ ██║
██║   ██║██╔══██║╚════██║       ██║   ██║   ██║██║███╗██║██║╚██╗██║
╚██████╔╝██║  ██║███████║       ██║   ╚██████╔╝╚███╔███╔╝██║ ╚████║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝       ╚═╝    ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝
`.trim();

const MINI_BANNER = `
 ▄▄ •  ▄▄▄· .▄▄ ·     ▄▄▄▄▄      ▄▄▌ ▐ ▄▌ ▐ ▄
▐█ ▀ ▪▐█ ▀█ ▐█ ▀.     •██  ▪     ██· █▌▐█•█▌▐█
▄█ ▀█▄▄█▀▀█ ▄▀▀▀█▄     ▐█.▪ ▄█▀▄ ██▪▐█▐▐▌▐█▐▐▌
▐█▄▪▐█▐█ ▪▐▌▐█▄▪▐█     ▐█▌·▐█▌.▐▌▐█▌██▐█▌██▐█▌
·▀▀▀▀  ▀  ▀  ▀▀▀▀      ▀▀▀  ▀█▄▀▪ ▀▀▀▀ ▀▪▀▀ █▪
`.trim();

// Industrial border components
const BORDER = {
  TL: '╔', TR: '╗', BL: '╚', BR: '╝',
  H: '═', V: '║',
  LT: '╠', RT: '╣', TT: '╦', BT: '╩', X: '╬',
  RIVET: '●',
  RIVET_HOLLOW: '○',
  DOUBLE_H: '══════════════════════════════════════════════════════════════',
};

// Status indicators
const INDICATOR = {
  SPIN: ['◐', '◓', '◑', '◒'],  // Animated spinner frames
  RUNNING: '▶',
  STOPPED: '■',
  IDLE: '◇',
  ACTIVE: '●',
  INACTIVE: '○',
  ALERT: '⚠',
  OK: '✓',
  FAIL: '✗',
};

// Gauge blocks (low to high)
const GAUGE = {
  BLOCKS: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
  PROGRESS_FULL: '█',
  PROGRESS_EMPTY: '░',
  PROGRESS_HALF: '▒',
};

// Braille sparkline characters (for activity visualization)
const BRAILLE = ['⠀', '⠄', '⠆', '⠇', '⡇', '⣇', '⣧', '⣷', '⣿'];

/**
 * Generate the main control room status display script.
 * Creates an imposing industrial-themed ASCII dashboard.
 * Uses ANSI colors: Navy blue background with cyan/gold accents.
 */
function generateStatusScriptContent(): string {
  return `#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# GAS TOWN CONTROL ROOM - Mission Control Interface
# Soviet Space Program / Industrial Brutalism Aesthetic
# ══════════════════════════════════════════════════════════════════════════════

# ANSI Color Codes - Control Room Theme (Navy/Cyan)
BG="\\033[48;5;17m"       # Dark navy blue background
FG="\\033[38;5;51m"       # Cyan foreground
GOLD="\\033[38;5;220m"    # Gold accent
DIM="\\033[38;5;244m"     # Dim gray
BOLD="\\033[1m"
RESET="\\033[0m"

# Session start time for runtime calculation
SESSION_START=\$(date +%s)

# Spinner animation frames
SPIN=('◐' '◓' '◑' '◒')
FRAME=0

# Set full screen background
set_background() {
  # Fill screen with background color
  echo -ne "\${BG}"
  clear
}

print_header() {
  echo -e "\${BG}\${GOLD}"
  echo "  ██████╗  █████╗ ███████╗    ████████╗ ██████╗ ██╗    ██╗███╗   ██╗"
  echo " ██╔════╝ ██╔══██╗██╔════╝    ╚══██╔══╝██╔═══██╗██║    ██║████╗  ██║"
  echo " ██║  ███╗███████║███████╗       ██║   ██║   ██║██║ █╗ ██║██╔██╗ ██║"
  echo " ██║   ██║██╔══██║╚════██║       ██║   ██║   ██║██║███╗██║██║╚██╗██║"
  echo " ╚██████╔╝██║  ██║███████║       ██║   ╚██████╔╝╚███╔███╔╝██║ ╚████║"
  echo "  ╚═════╝ ╚═╝  ╚═╝╚══════╝       ╚═╝    ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝"
  echo ""
  echo -e "\${FG} ○────────────────────────────────────────────────────────────────────○"
  echo -e " │\${BOLD}  M U L T I - A G E N T   O R C H E S T R A T O R   v 1 . 0       \${FG} │"
  echo -e " ○────────────────────────────────────────────────────────────────────○"
}

print_system_panel() {
  local spin=\${SPIN[\$FRAME]}
  local time=\$(date '+%Y-%m-%d %H:%M:%S')

  # Calculate session runtime
  local now=\$(date +%s)
  local elapsed=\$((now - SESSION_START))
  local hours=\$((elapsed / 3600))
  local mins=\$(( (elapsed % 3600) / 60 ))
  local secs=\$((elapsed % 60))
  local runtime_str=\$(printf "%02d:%02d:%02d" \$hours \$mins \$secs)

  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}\$spin SYSTEM STATUS\${FG}                                                  ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  echo -e " ║                                                                      ║"
  printf " ║  \${DIM}◈ TIMESTAMP    │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$time"
  printf " ║  \${DIM}◈ RUNTIME      │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$runtime_str"
  printf " ║  \${DIM}◈ PLATFORM     │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$(uname -s) \$(uname -m)"
  echo -e " ║                                                                      ║"
  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_convoy_stats() {
  # Count convoys by status using bd CLI
  local active=0
  local idle=0

  if command -v bd &> /dev/null; then
    active=\$(bd list --label gt:convoy --status in_progress --brief 2>/dev/null | wc -l | tr -d ' ')
    idle=\$(bd list --label gt:convoy --status open --brief 2>/dev/null | wc -l | tr -d ' ')
  fi

  local total=\$((active + idle))

  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}◈ CONVOY STATUS\${FG}                                                      ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  printf " ║  Active: \${GOLD}%-4s\${FG} │  Idle: \${DIM}%-4s\${FG} │  Total: %-4s                       ║\\n" "\$active" "\$idle" "\$total"
  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_linear_status() {
  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}◈ LINEAR STATUS\${FG}                                                        ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"

  # Try to read Linear status from Commander Journal
  local journal_id=\$(bd list --label gt:commander --limit 1 --brief 2>/dev/null | head -1 | awk '{print \$1}')

  if [ -n "\$journal_id" ]; then
    # Look for LINEAR_SYNC comment with counts
    local linear_data=\$(bd comments "\$journal_id" 2>/dev/null | grep -E "^LINEAR_SYNC:" | tail -1)
    if [ -n "\$linear_data" ]; then
      # Parse counts from format: LINEAR_SYNC: P0=1 P1=3 P2+=5
      local p0=\$(echo "\$linear_data" | grep -oE "P0=[0-9]+" | cut -d= -f2)
      local p1=\$(echo "\$linear_data" | grep -oE "P1=[0-9]+" | cut -d= -f2)
      local p2=\$(echo "\$linear_data" | grep -oE "P2\\+=[0-9]+" | cut -d= -f2)
      p0=\${p0:-0}
      p1=\${p1:-0}
      p2=\${p2:-0}
      printf " ║  P0: \${GOLD}%-3s\${FG} │  P1: %-3s │  P2+: \${DIM}%-3s\${FG}                                 ║\\n" "\$p0" "\$p1" "\$p2"
    else
      echo -e " ║  \${DIM}No Linear data - run 'check linear' in Commander\${FG}                   ║"
    fi
  else
    echo -e " ║  \${DIM}Commander Journal not found\${FG}                                          ║"
  fi

  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_convoy_panel() {
  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}▶ CONVOY OPERATIONS\${FG}                                                 ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  echo -e " ║                                                                      ║"

  # Get actual status if gastown is available
  if command -v gastown &> /dev/null; then
    gastown --status 2>/dev/null | while IFS= read -r line; do
      printf " ║  %-68s ║\\n" "\$line"
    done
  else
    echo -e " ║   ┌─────────────────────────────────────────────────────────────┐   ║"
    echo -e " ║   │  \${GOLD}⚠  GASTOWN CLI NOT IN PATH\${FG}                                │   ║"
    echo -e " ║   │     Execute from project directory or add to PATH          │   ║"
    echo -e " ║   └─────────────────────────────────────────────────────────────┘   ║"
  fi

  echo -e " ║                                                                      ║"
  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_commander_status() {
  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}◆ COMMANDER STATUS\${FG}                                                   ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"

  # Try to find Commander Journal
  local journal_id=\$(bd list --label gt:commander --limit 1 --brief 2>/dev/null | head -1 | awk '{print \$1}')

  if [ -n "\$journal_id" ]; then
    # Get latest comment (last activity)
    local last_activity=\$(bd comments "\$journal_id" --limit 1 2>/dev/null | head -1 | cut -c1-60)
    if [ -n "\$last_activity" ]; then
      printf " ║  Last: %-62s ║\\n" "\$last_activity"
    else
      echo -e " ║  \${DIM}No recent activity\${FG}                                                   ║"
    fi
    printf " ║  \${DIM}Journal: %-61s\${FG}║\\n" "\$journal_id"
  else
    echo -e " ║  \${DIM}Commander Journal not found\${FG}                                          ║"
    echo -e " ║  \${DIM}Create with: bd create --type epic --labels gt:commander\${FG}             ║"
  fi

  echo -e " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_controls_panel() {
  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}◆ MPROCS CONTROLS\${FG}                                                    ║"
  echo -e " ╠════════════════════╦════════════════════╦════════════════════════════╣"
  echo -e " ║  [C-a] Focus List  ║  [r] Restart Proc  ║  [q] Exit Dashboard        ║"
  echo -e " ║  [j/k] Navigate    ║  [x] Stop Process  ║  [z] Zoom Terminal         ║"
  echo -e " ╚════════════════════╩════════════════════╩════════════════════════════╝"
  echo ""
  echo -e "\${DIM} ○──────────────────────────────────────────────────────────────────────○"
  printf "  ░░░ REFRESH: %s ░░░  PROCESSES: Active ░░░  MODE: Monitoring ░░░\\n" "\$(date '+%H:%M:%S')"
  echo -e " ○──────────────────────────────────────────────────────────────────────○\${RESET}"
}

# Main loop
while true; do
  set_background
  print_header
  print_system_panel
  print_convoy_stats
  print_linear_status
  print_convoy_panel
  print_commander_status
  print_controls_panel

  # Advance spinner frame
  FRAME=$(( (FRAME + 1) % 4 ))

  sleep 2
done
`;
}


/**
 * Generate convoy panel script that shows Claude directly in mprocs.
 *
 * Behavior:
 * - If tmux session exists: attach directly (show Claude Code in mprocs pane)
 * - If tmux session doesn't exist: show detail panel with [s] to start
 * - After detach (Ctrl+b d): return to detail panel
 *
 * @param convoyId - Convoy ID
 * @param convoyName - Convoy display name
 * @param status - Convoy status
 * @param gastownPath - Full path to gastown binary
 */
function generateConvoyScriptContent(convoyId: string, convoyName: string, status: ConvoyStatus, gastownPath: string): string {
  const statusGlyph = status === 'running' ? '▶' : status === 'idle' ? '◇' : '■';
  const statusLabel = status.toUpperCase();
  const progressFill = status === 'running' ? 5 : status === 'idle' ? 3 : 0;
  const progressBar = '█'.repeat(progressFill) + '░'.repeat(5 - progressFill);
  const safeName = convoyName.replace(/"/g, '\\"').substring(0, 42);
  const safeId = convoyId.substring(0, 20);
  const sessionName = `gastown-${convoyId}`;

  return `#!/bin/bash
# GAS TOWN - Convoy Panel (Shows Claude directly or detail view)
SESSION_NAME="${sessionName}"
CONVOY_ID="${safeId}"
CONVOY_NAME="${safeName}"

# Colors
BG="\\033[48;5;22m"
FG="\\033[38;5;156m"
AMBER="\\033[38;5;214m"
DIM="\\033[38;5;242m"
RESET="\\033[0m"

SPIN=('◐' '◓' '◑' '◒')
FRAME=0

show_detail_panel() {
  local spin=\${SPIN[\$FRAME]}
  FRAME=$(( (FRAME + 1) % 4 ))
  echo -ne "\${BG}"
  clear
  echo -e "\${AMBER}"
  echo "  ▄▄ •  ▄▄▄· .▄▄ ·     ▄▄▄▄▄      ▄▄▌ ▐ ▄▌ ▐ ▄ "
  echo " ▐█ ▀ ▪▐█ ▀█ ▐█ ▀.     •██  ▪     ██· █▌▐█•█▌▐█"
  echo " ▄█ ▀█▄▄█▀▀█ ▄▀▀▀█▄     ▐█.▪ ▄█▀▄ ██▪▐█▐▐▌▐█▐▐▌"
  echo " ▐█▄▪▐█▐█ ▪▐▌▐█▄▪▐█     ▐█▌·▐█▌.▐▌▐█▌██▐█▌██▐█▌"
  echo " ·▀▀▀▀  ▀  ▀  ▀▀▀▀      ▀▀▀  ▀█▄▀▪ ▀▀▀▀ ▀▪▀▀ █▪"
  echo -e "\${FG}"
  echo " ╔══════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}\$spin CONVOY:\${FG} \$CONVOY_NAME"
  echo " ╠══════════════════════════════════════════════════════════════╣"
  printf " ║  ID: %-54s  ║\\n" "\$CONVOY_ID"
  echo -e " ║  STATUS: \${AMBER}${statusGlyph} ${statusLabel}\${FG} [${progressBar}]"
  echo " ╠══════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${AMBER}[s]\${FG} START convoy (launch Claude Mayor)                     ║"
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

start_convoy() {
  echo -e "\\n\${AMBER}▶ Starting convoy...\${RESET}"
  if ! tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    nohup "${gastownPath}" --resume ${convoyId} </dev/null >/tmp/gastown-\$\$.log 2>&1 &
    echo -e "\${FG}Waiting for Claude to start...\${RESET}"
    for i in {1..30}; do
      if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
        echo -e "\${FG}✓ Claude Mayor started!\${RESET}"
        sleep 1
        return 0
      fi
      echo -n "."
      sleep 0.5
    done
    echo -e "\\n\${AMBER}⚠ Timeout. Check /tmp/gastown-\$\$.log\${RESET}"
    sleep 2
    return 1
  fi
  return 0
}

attach_to_session() {
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    echo -e "\\n\${FG}▶ Attaching to Claude Mayor...\${RESET}"
    echo -e "\${DIM}(Press Ctrl+b d to detach)\${RESET}"
    sleep 1
    tmux attach -t "\$SESSION_NAME"
    echo -e "\\n\${FG}◇ Detached\${RESET}"
    sleep 1
  else
    echo -e "\\n\${AMBER}⚠ No active session\${RESET}"
    sleep 2
  fi
}

# MAIN LOOP
while true; do
  # Auto-attach if session exists
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    attach_to_session
    continue
  fi
  # Show detail panel
  show_detail_panel
  read -t 1 -n 1 key 2>/dev/null || key=""
  case "\$key" in
    s|S) start_convoy ;;
    a|A) attach_to_session ;;
  esac
done
`;
}

/**
 * Generate PM (Prime Minister) pane script for a convoy.
 * PM monitors for QUESTION comments and answers them from context.
 *
 * @param convoyId - Convoy ID to monitor
 * @param gastownPath - Full path to gastown binary
 */
function generatePMScriptContent(convoyId: string, gastownPath: string): string {
  const safeId = convoyId.substring(0, 20);

  return `#!/bin/bash
# GAS TOWN - PM (Prime Minister) Pane
# Monitors for QUESTION comments and spawns PM to answer them
CONVOY_ID="${safeId}"

# Colors
BG="\\033[48;5;54m"      # Purple background for PM
FG="\\033[38;5;219m"     # Light pink foreground
AMBER="\\033[38;5;214m"
CYAN="\\033[38;5;51m"
DIM="\\033[38;5;242m"
RESET="\\033[0m"

SPIN=('◐' '◓' '◑' '◒')
FRAME=0

check_pending_questions() {
  # Get all comments from bd
  local comments=\$(bd comments "\$CONVOY_ID" 2>/dev/null || echo "")

  # Count QUESTION and ANSWER entries
  local q_count=\$(echo "\$comments" | grep -c "QUESTION \\[" 2>/dev/null || echo 0)
  local a_count=\$(echo "\$comments" | grep -c "ANSWER \\[" 2>/dev/null || echo 0)

  # Return difference (pending questions)
  echo \$((q_count - a_count))
}

get_latest_question() {
  bd comments "\$CONVOY_ID" 2>/dev/null | grep "QUESTION \\[" | tail -1 | head -c 60
}

show_status_panel() {
  local spin=\${SPIN[\$FRAME]}
  FRAME=\$(( (FRAME + 1) % 4 ))
  local pending=\$(check_pending_questions)
  local latest_q=\$(get_latest_question)

  echo -ne "\${BG}"
  clear
  echo -e "\${AMBER}"
  echo "       🎩 PRIME MINISTER"
  echo -e "\${FG}"
  echo " ╔══════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}\$spin PM Monitor\${FG} - Convoy: \$CONVOY_ID"
  echo " ╠══════════════════════════════════════════════════════════════╣"

  if [[ \$pending -gt 0 ]]; then
    echo -e " ║  \${CYAN}◉ \$pending pending question(s)\${FG}"
    echo -e " ║  \${DIM}Latest: \${latest_q}...\${FG}"
    echo " ╠══════════════════════════════════════════════════════════════╣"
    echo -e " ║  \${AMBER}[p]\${FG} Process questions (spawn PM)                          ║"
  else
    echo -e " ║  \${FG}○ No pending questions\${FG}"
    echo " ╠══════════════════════════════════════════════════════════════╣"
    echo -e " ║  \${DIM}Monitoring for QUESTION comments...\${FG}                       ║"
  fi

  echo -e " ╠══════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${AMBER}[a]\${FG} Auto-mode (spawn PM automatically when questions arrive) ║"
  echo -e " ║  \${DIM}[C-a] Focus process list  [q] Exit\${FG}                         ║"
  echo -e " ╚══════════════════════════════════════════════════════════════╝\${RESET}"
}

spawn_pm() {
  echo -e "\\n\${AMBER}🎩 Spawning Prime Minister...\${RESET}"
  # Set environment for spawn
  export GASTOWN_BD="\$CONVOY_ID"
  export GASTOWN_CONVOY="\$CONVOY_ID"

  # Run PM inline (not in background) so we see output
  "${gastownPath}" spawn prime --convoy "\$CONVOY_ID" 2>&1

  echo -e "\${FG}✓ PM completed\${RESET}"
  sleep 2
}

auto_mode() {
  echo -e "\\n\${CYAN}◉ Auto-mode enabled - will spawn PM when questions detected\${RESET}"
  while true; do
    local pending=\$(check_pending_questions)
    if [[ \$pending -gt 0 ]]; then
      spawn_pm
    fi
    show_status_panel
    # Check for 'q' to exit auto-mode
    read -t 2 -n 1 key 2>/dev/null || key=""
    if [[ "\$key" == "q" || "\$key" == "Q" ]]; then
      echo -e "\\n\${FG}◇ Auto-mode disabled\${RESET}"
      sleep 1
      break
    fi
  done
}

# MAIN LOOP
while true; do
  show_status_panel

  read -t 2 -n 1 key 2>/dev/null || key=""
  case "\$key" in
    p|P)
      pending=\$(check_pending_questions)
      if [[ \$pending -gt 0 ]]; then
        spawn_pm
      else
        echo -e "\\n\${DIM}No pending questions\${RESET}"
        sleep 1
      fi
      ;;
    a|A) auto_mode ;;
  esac
done
`;
}

/**
 * Generate welcome message for empty dashboard with industrial aesthetic.
 */
function generateWelcomeScript(): string {
  const lines = [
    'clear',
    'echo \\"\\"',
    'echo \\" ╔════════════════════════════════════════════════════════════════╗\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   ██████╗  █████╗ ███████╗    ████████╗ ██████╗ ██╗    ██╗███╗ ║\\"',
    'echo \\" ║  ██╔════╝ ██╔══██╗██╔════╝    ╚══██╔══╝██╔═══██╗██║    ██║████╗║\\"',
    'echo \\" ║  ██║  ███╗███████║███████╗       ██║   ██║   ██║██║ █╗ ██║██╔██║\\"',
    'echo \\" ║  ██║   ██║██╔══██║╚════██║       ██║   ██║   ██║██║███╗██║██║╚█║\\"',
    'echo \\" ║  ╚██████╔╝██║  ██║███████║       ██║   ╚██████╔╝╚███╔███╔╝██║ ╚║\\"',
    'echo \\" ║   ╚═════╝ ╚═╝  ╚═╝╚══════╝       ╚═╝    ╚═════╝  ╚══╝╚══╝ ╚═╝  ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║  ◇ WELCOME TO THE CONTROL ROOM                                 ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   No active convoys detected in the system.                    ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   ┌──────────────────────────────────────────────────────┐     ║\\"',
    'echo \\" ║   │  AVAILABLE OPERATIONS                                │     ║\\"',
    'echo \\" ║   ├──────────────────────────────────────────────────────┤     ║\\"',
    'echo \\" ║   │                                                      │     ║\\"',
    'echo \\" ║   │  ▶ START NEW CONVOY                                  │     ║\\"',
    'echo \\" ║   │    gastown \\\\\\"Your task description\\\\\\"                │     ║\\"',
    'echo \\" ║   │                                                      │     ║\\"',
    'echo \\" ║   │  ◇ RESUME EXISTING CONVOY                            │     ║\\"',
    'echo \\" ║   │    gastown --resume <convoy-id>                      │     ║\\"',
    'echo \\" ║   │                                                      │     ║\\"',
    'echo \\" ║   │  ■ LIST ALL CONVOYS                                  │     ║\\"',
    'echo \\" ║   │    gastown --list                                    │     ║\\"',
    'echo \\" ║   │                                                      │     ║\\"',
    'echo \\" ║   └──────────────────────────────────────────────────────┘     ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ╚════════════════════════════════════════════════════════════════╝\\"',
    'echo \\"\\"',
    'read -r -p \\" Press any key to refresh... \\" -n1 -s',
  ];

  return lines.join('; ');
}

/**
 * Generate mprocs YAML configuration for convoys.
 *
 * Configuration leverages mprocs features:
 * - proc_list_width: Sized for industrial aesthetic
 * - scrollback: Large buffer for output history
 * - autorestart: Keep status panel alive
 *
 * @param convoys - List of convoy info objects
 * @param statusScriptPath - Path to the status script
 * @param convoyScriptPaths - Map of convoy ID to script path
 * @param commanderScriptPath - Path to the commander pane script
 * @returns YAML configuration string
 */
export function generateMprocsConfig(
  convoys: DashboardConvoyInfo[],
  statusScriptPath?: string,
  convoyScriptPaths?: Map<string, string>,
  commanderScriptPath?: string,
  pmScriptPaths?: Map<string, string>,
): string {
  const lines: string[] = [];

  // YAML header with industrial branding
  lines.push('# ══════════════════════════════════════════════════════════════════════════════');
  lines.push('#  ██████╗  █████╗ ███████╗    ████████╗ ██████╗ ██╗    ██╗███╗   ██╗');
  lines.push('# ██╔════╝ ██╔══██╗██╔════╝    ╚══██╔══╝██╔═══██╗██║    ██║████╗  ██║');
  lines.push('# ██║  ███╗███████║███████╗       ██║   ██║   ██║██║ █╗ ██║██╔██╗ ██║');
  lines.push('# ██║   ██║██╔══██║╚════██║       ██║   ██║   ██║██║███╗██║██║╚██╗██║');
  lines.push('# ╚██████╔╝██║  ██║███████║       ██║   ╚██████╔╝╚███╔███╔╝██║ ╚████║');
  lines.push('#  ╚═════╝ ╚═╝  ╚═╝╚══════╝       ╚═╝    ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝');
  lines.push('# ══════════════════════════════════════════════════════════════════════════════');
  lines.push('# MULTI-AGENT ORCHESTRATOR - Control Room Configuration');
  lines.push('# ══════════════════════════════════════════════════════════════════════════════');
  lines.push('');

  // Global mprocs settings - leveraging full feature set
  lines.push('# ┌─────────────────────────────────────────────────────────────────────────────┐');
  lines.push('# │ GLOBAL CONFIGURATION                                                       │');
  lines.push('# └─────────────────────────────────────────────────────────────────────────────┘');
  lines.push('');
  lines.push('proc_list_width: 24');
  lines.push('scrollback: 5000');
  lines.push('mouse_scroll_speed: 3');
  lines.push('hide_keymap_window: true');  // More space for industrial aesthetic
  lines.push('');
  lines.push('# Remote control server for automation');
  lines.push('server: "127.0.0.1:4050"');
  lines.push('');

  // Process definitions
  lines.push('# ┌─────────────────────────────────────────────────────────────────────────────┐');
  lines.push('# │ PROCESS DEFINITIONS                                                        │');
  lines.push('# └─────────────────────────────────────────────────────────────────────────────┘');
  lines.push('');
  lines.push('procs:');

  // Control Room - main status panel
  lines.push('');
  lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
  lines.push('  # CONTROL ROOM - System Status Overview');
  lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
  lines.push('  "◈ CONTROL ROOM":');
  if (statusScriptPath) {
    lines.push(`    shell: "bash ${statusScriptPath}"`);
  } else {
    lines.push(`    shell: "bash -c 'while true; do clear; echo \\"GAS TOWN CONTROL ROOM\\"; date; sleep 2; done'"`);
  }
  lines.push('    autorestart: true');

  // Commander pane - Strategic Control Interface
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

  // Add convoy processes (paired with PM panes)
  if (convoys.length > 0) {
    lines.push('');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
    lines.push('  # CONVOY + PM PAIRS - Agent Sessions with Decision Proxies');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');

    for (const convoy of convoys) {
      const sessionName = `gastown-${convoy.id}`;
      const statusGlyph = convoy.status === 'running' ? '▶' : convoy.status === 'idle' ? '◇' : '■';
      const paneLabel = convoy.id.substring(0, 18);

      // Convoy pane
      lines.push('');
      lines.push(`  "${statusGlyph} ${paneLabel}":`);

      // Use script file if available, otherwise fall back to simple inline
      const scriptPath = convoyScriptPaths?.get(convoy.id);
      if (scriptPath) {
        lines.push(`    shell: "tmux attach -t ${sessionName} 2>/dev/null || bash ${scriptPath}"`);
      } else {
        // Simple fallback without colors
        lines.push(`    shell: "tmux attach -t ${sessionName} 2>/dev/null || bash -c 'while true; do clear; echo \\"Convoy: ${convoy.id}\\"; echo \\"Status: ${convoy.status}\\"; echo; echo \\"Press [s] to start, [C-a] to retry...\\"; read -t 1 -n 1 key; case \\"\$key\\" in s|S) gastown --resume ${convoy.id} ;; esac; done'"`);
      }

      // PM pane (paired with convoy)
      const pmScriptPath = pmScriptPaths?.get(convoy.id);
      if (pmScriptPath) {
        const pmLabel = convoy.id.substring(0, 14);
        lines.push('');
        lines.push(`  "🎩 PM ${pmLabel}":`);
        lines.push(`    shell: "bash ${pmScriptPath}"`);
        lines.push('    autorestart: true');
      }
    }
  } else {
    // Welcome pane when no convoys
    lines.push('');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
    lines.push('  # WELCOME PANEL - Getting Started');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
    lines.push('  "◇ WELCOME":');
    lines.push(`    shell: "bash -c 'while true; do ${generateWelcomeScript()}; done'"`);
  }

  lines.push('');

  return lines.join('\n') + '\n';
}


/**
 * Write Commander slash commands to .claude/commands/ directory.
 * Overwrites existing commands to ensure latest version is always used.
 *
 * @param projectRoot - Project root directory (where .claude/ is)
 */
export async function writeCommanderCommands(projectRoot: string): Promise<void> {
  const commandsDir = `${projectRoot}/.claude/commands`;

  // Ensure directory exists
  try {
    await Deno.mkdir(commandsDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  // Get command definitions and write each one
  const commands = buildCommanderCommands();
  for (const cmd of commands) {
    const filePath = `${commandsDir}/${cmd.name}.md`;
    await Deno.writeTextFile(filePath, cmd.content);
  }
}

/**
 * Write Commander agent file to .claude/agents/ directory.
 * Overwrites existing agent to ensure latest version is always used.
 *
 * @param projectRoot - Project root directory (where .claude/ is)
 * @returns Path to the agent file
 */
export async function writeCommanderAgent(projectRoot: string): Promise<string> {
  const agentsDir = `${projectRoot}/.claude/agents`;

  // Ensure directory exists
  try {
    await Deno.mkdir(agentsDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  // Write agent file
  const agentPath = `${agentsDir}/commander.md`;
  const agentContent = buildCommanderAgentFile();
  await Deno.writeTextFile(agentPath, agentContent);

  return agentPath;
}

/**
 * Write mprocs configuration and supporting scripts to temp directory.
 *
 * @param convoys - List of convoy info objects
 * @param gastownPath - Full path to gastown binary
 * @param projectRoot - Optional project root for writing commands (defaults to cwd)
 * @returns Path to the created config file
 */
export async function writeMprocsConfig(convoys: DashboardConvoyInfo[], gastownPath: string, projectRoot?: string): Promise<string> {
  // Write Commander config to project .claude/ directory
  // Always overwrite to ensure latest version
  const root = projectRoot ?? Deno.cwd();
  await writeCommanderCommands(root);
  const commanderAgentPath = await writeCommanderAgent(root);

  const tempDir = await Deno.makeTempDir({ prefix: 'gastown-dashboard-' });

  // Write the Control Room status script
  const statusScriptPath = `${tempDir}/control-room.sh`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  await Deno.chmod(statusScriptPath, 0o755);

  // Write Commander pane script with agent path and project root
  const commanderScriptPath = `${tempDir}/commander.sh`;
  const { generateCommanderScriptContent } = await import("./commander-pane.ts");
  await Deno.writeTextFile(commanderScriptPath, generateCommanderScriptContent(gastownPath, commanderAgentPath, root));
  await Deno.chmod(commanderScriptPath, 0o755);

  // Write convoy detail scripts
  const convoyScriptPaths = new Map<string, string>();
  for (const convoy of convoys) {
    const scriptPath = `${tempDir}/convoy-${convoy.id}.sh`;
    const scriptContent = generateConvoyScriptContent(convoy.id, convoy.name, convoy.status, gastownPath);
    await Deno.writeTextFile(scriptPath, scriptContent);
    await Deno.chmod(scriptPath, 0o755);
    convoyScriptPaths.set(convoy.id, scriptPath);
  }

  // Write PM (Prime Minister) pane scripts for each convoy
  const pmScriptPaths = new Map<string, string>();
  for (const convoy of convoys) {
    const scriptPath = `${tempDir}/pm-${convoy.id}.sh`;
    const scriptContent = generatePMScriptContent(convoy.id, gastownPath);
    await Deno.writeTextFile(scriptPath, scriptContent);
    await Deno.chmod(scriptPath, 0o755);
    pmScriptPaths.set(convoy.id, scriptPath);
  }

  // Generate and write the mprocs config
  const config = generateMprocsConfig(convoys, statusScriptPath, convoyScriptPaths, commanderScriptPath, pmScriptPaths);
  const configPath = `${tempDir}/mprocs.yaml`;
  await Deno.writeTextFile(configPath, config);

  return configPath;
}

// Re-export for backward compatibility
export { generateStatusScriptContent };

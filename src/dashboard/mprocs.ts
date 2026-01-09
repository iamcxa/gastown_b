// src/dashboard/mprocs.ts

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
  local uptime_str=\$(uptime | sed 's/.*up //' | sed 's/,.*//')

  echo ""
  echo -e "\${FG} ╔══════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}\$spin SYSTEM STATUS\${FG}                                                  ║"
  echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
  echo -e " ║                                                                      ║"
  printf " ║  \${DIM}◈ TIMESTAMP    │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$time"
  printf " ║  \${DIM}◈ UPTIME       │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$uptime_str"
  printf " ║  \${DIM}◈ PLATFORM     │\${RESET}\${BG}\${FG} %-40s\${FG}         ║\\n" "\$(uname -s) \$(uname -m)"
  echo -e " ║                                                                      ║"
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
  print_convoy_panel
  print_controls_panel

  # Advance spinner frame
  FRAME=$(( (FRAME + 1) % 4 ))

  sleep 2
done
`;
}

/**
 * Generate convoy detail display script content (written to file).
 * Uses ANSI colors: Dark olive/green military theme.
 * Provides interactive options:
 * - [s] Open new terminal window and attach to convoy (via osascript on macOS)
 * - [C-a] Focus process list (mprocs built-in)
 * - [q] Exit dashboard (mprocs built-in)
 */
function generateConvoyScriptContent(convoyId: string, convoyName: string, status: ConvoyStatus): string {
  // Status visualization
  const statusGlyph = status === 'running' ? '▶' : status === 'idle' ? '◇' : '■';
  const statusLabel = status.toUpperCase();

  // Progress bar based on status
  const progressFill = status === 'running' ? 5 : status === 'idle' ? 3 : 0;
  const progressBar = '█'.repeat(progressFill) + '░'.repeat(5 - progressFill);

  // Activity sparkline (simulated)
  const sparkline = status === 'running' ? '⣿⣷⣧⣇⡇⣇⣧⣷⣿' : '⠀⠀⠀⠀⠀⠀⠀⠀⠀';

  // Escape for shell embedding
  const safeName = convoyName.replace(/"/g, '\\"').substring(0, 42);
  const safeId = convoyId.substring(0, 20);

  return `#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# GAS TOWN - Convoy Detail Panel
# Dark Olive/Green Military Theme (contrast with Control Room's navy)
# ══════════════════════════════════════════════════════════════════════════════

# ANSI Color Codes - Convoy Theme (Olive/Green)
BG="\\033[48;5;22m"       # Dark olive green background
FG="\\033[38;5;156m"      # Light green foreground
AMBER="\\033[38;5;214m"   # Amber/orange accent
DIM="\\033[38;5;242m"     # Dim gray
BOLD="\\033[1m"
RESET="\\033[0m"

# Spinner animation frames
SPIN=('◐' '◓' '◑' '◒')
FRAME=0

# Convoy info
CONVOY_ID="${safeId}"
CONVOY_NAME="${safeName}"
STATUS_GLYPH="${statusGlyph}"
STATUS_LABEL="${statusLabel}"
PROGRESS_BAR="${progressBar}"
SPARKLINE="${sparkline}"

set_background() {
  echo -ne "\${BG}"
  clear
}

print_header() {
  echo -e "\${BG}\${AMBER}"
  echo " ║   ▄▄ •  ▄▄▄· .▄▄ ·     ▄▄▄▄▄      ▄▄▌ ▐ ▄▌ ▐ ▄                ║"
  echo " ║  ▐█ ▀ ▪▐█ ▀█ ▐█ ▀.     •██  ▪     ██· █▌▐█•█▌▐█               ║"
  echo " ║  ▄█ ▀█▄▄█▀▀█ ▄▀▀▀█▄     ▐█.▪ ▄█▀▄ ██▪▐█▐▐▌▐█▐▐▌               ║"
  echo " ║  ▐█▄▪▐█▐█ ▪▐▌▐█▄▪▐█     ▐█▌·▐█▌.▐▌▐█▌██▐█▌██▐█▌               ║"
  echo " ║  ·▀▀▀▀  ▀  ▀  ▀▀▀▀      ▀▀▀  ▀█▄▀▪ ▀▀▀▀ ▀▪▀▀ █▪               ║"
}

print_details_panel() {
  local spin=\${SPIN[\$FRAME]}

  echo -e "\${FG}"
  echo " ╔════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${AMBER}\$spin CONVOY DETAILS\${FG}                                             ║"
  echo " ╠════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                ║"
  printf " ║  \${DIM}◈ ID\${FG}        │ %-45s  ║\\n" "\$CONVOY_ID"
  echo " ║                                                                ║"
  printf " ║  \${DIM}◈ NAME\${FG}      │ %-45s  ║\\n" "\$CONVOY_NAME"
  echo " ║                                                                ║"
  echo -e " ║  \${DIM}◈ STATUS\${FG}    │ \${AMBER}\$STATUS_GLYPH \$STATUS_LABEL    \${FG}[\$PROGRESS_BAR]                  ║"
  echo " ║                                                                ║"
  echo -e " ║  \${DIM}◈ ACTIVITY\${FG}  │ \$SPARKLINE                               ║"
  echo " ║                                                                ║"
  echo " ╠════════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${AMBER}◆ ACTIONS\${FG}                                                     ║"
  echo " ╠════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                ║"
  echo " ║   ┌──────────────────────────────────────────────────────┐     ║"
  echo -e " ║   │  \${AMBER}[s]\${FG} OPEN new terminal & attach convoy          │     ║"
  echo -e " ║   │  \${AMBER}[C-a]\${FG} Focus process list (mprocs key)         │     ║"
  echo -e " ║   │  \${AMBER}[q]\${FG} EXIT dashboard (quit mprocs)            │     ║"
  echo " ║   └──────────────────────────────────────────────────────┘     ║"
  echo " ║                                                                ║"
  echo -e " ║   \${AMBER}⚠\${FG}  Press [s] to open convoy in new terminal            ║"
  echo " ║                                                                ║"
  echo -e " ╚════════════════════════════════════════════════════════════════╝\${RESET}"
}

# Main loop with keyboard input
while true; do
  set_background
  print_header
  print_details_panel

  # Advance spinner frame
  FRAME=$(( (FRAME + 1) % 4 ))

  # Read with timeout - allows animation while waiting for input
  read -t 1 -n 1 key 2>/dev/null || key=""

  case "\$key" in
    s|S)
      echo -e "\\n \${AMBER}▶ Opening convoy in new terminal...\${RESET}"
      # First ensure the convoy is started
      gastown --resume ${convoyId} 2>/dev/null
      # Open new Terminal window with tmux attach (macOS)
      if [[ "\$(uname)" == "Darwin" ]]; then
        osascript -e "tell application \\"Terminal\\" to do script \\"tmux attach -t gastown-${convoyId} || echo 'Session not found. Run: gastown --resume ${convoyId}'; read\\""
        osascript -e "tell application \\"Terminal\\" to activate"
        echo -e " \${FG}✓ New terminal window opened\${RESET}"
      else
        # Linux fallback - try common terminal emulators
        if command -v gnome-terminal &>/dev/null; then
          gnome-terminal -- tmux attach -t gastown-${convoyId}
        elif command -v xterm &>/dev/null; then
          xterm -e "tmux attach -t gastown-${convoyId}" &
        else
          echo -e " \${AMBER}⚠ Please run manually: tmux attach -t gastown-${convoyId}\${RESET}"
        fi
      fi
      sleep 2
      ;;
    *)
      # Other keys - just continue the loop (no auto-attach attempt)
      ;;
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
 * @returns YAML configuration string
 */
export function generateMprocsConfig(
  convoys: DashboardConvoyInfo[],
  statusScriptPath?: string,
  convoyScriptPaths?: Map<string, string>,
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

  // Add convoy processes
  if (convoys.length > 0) {
    lines.push('');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');
    lines.push('  # CONVOY PROCESSES - Active Agent Sessions');
    lines.push('  # ═══════════════════════════════════════════════════════════════════════════');

    for (const convoy of convoys) {
      const sessionName = `gastown-${convoy.id}`;
      const statusGlyph = convoy.status === 'running' ? '▶' : convoy.status === 'idle' ? '◇' : '■';
      const paneLabel = convoy.id.substring(0, 18);

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
 * Write mprocs configuration and supporting scripts to temp directory.
 *
 * @param convoys - List of convoy info objects
 * @returns Path to the created config file
 */
export async function writeMprocsConfig(convoys: DashboardConvoyInfo[]): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'gastown-dashboard-' });

  // Write the Control Room status script
  const statusScriptPath = `${tempDir}/control-room.sh`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  await Deno.chmod(statusScriptPath, 0o755);

  // Write convoy detail scripts
  const convoyScriptPaths = new Map<string, string>();
  for (const convoy of convoys) {
    const scriptPath = `${tempDir}/convoy-${convoy.id}.sh`;
    const scriptContent = generateConvoyScriptContent(convoy.id, convoy.name, convoy.status);
    await Deno.writeTextFile(scriptPath, scriptContent);
    await Deno.chmod(scriptPath, 0o755);
    convoyScriptPaths.set(convoy.id, scriptPath);
  }

  // Generate and write the mprocs config
  const config = generateMprocsConfig(convoys, statusScriptPath, convoyScriptPaths);
  const configPath = `${tempDir}/mprocs.yaml`;
  await Deno.writeTextFile(configPath, config);

  return configPath;
}

// Re-export for backward compatibility
export { generateStatusScriptContent };

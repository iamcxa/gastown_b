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
 */
function generateStatusScriptContent(): string {
  return `#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# GAS TOWN CONTROL ROOM - Mission Control Interface
# Soviet Space Program / Industrial Brutalism Aesthetic
# ══════════════════════════════════════════════════════════════════════════════

# Spinner animation frames
SPIN=('◐' '◓' '◑' '◒')
FRAME=0

print_header() {
  echo ""
  echo "  ██████╗  █████╗ ███████╗    ████████╗ ██████╗ ██╗    ██╗███╗   ██╗"
  echo " ██╔════╝ ██╔══██╗██╔════╝    ╚══██╔══╝██╔═══██╗██║    ██║████╗  ██║"
  echo " ██║  ███╗███████║███████╗       ██║   ██║   ██║██║ █╗ ██║██╔██╗ ██║"
  echo " ██║   ██║██╔══██║╚════██║       ██║   ██║   ██║██║███╗██║██║╚██╗██║"
  echo " ╚██████╔╝██║  ██║███████║       ██║   ╚██████╔╝╚███╔███╔╝██║ ╚████║"
  echo "  ╚═════╝ ╚═╝  ╚═╝╚══════╝       ╚═╝    ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝"
  echo ""
  echo " ○────────────────────────────────────────────────────────────────────○"
  echo " │  M U L T I - A G E N T   O R C H E S T R A T O R   v 1 . 0        │"
  echo " ○────────────────────────────────────────────────────────────────────○"
}

print_system_panel() {
  local spin=\${SPIN[\$FRAME]}
  local time=\$(date '+%Y-%m-%d %H:%M:%S')
  local uptime_str=\$(uptime | sed 's/.*up //' | sed 's/,.*//')

  echo ""
  echo " ╔══════════════════════════════════════════════════════════════════════╗"
  echo " ║  \$spin SYSTEM STATUS                                                  ║"
  echo " ╠══════════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                      ║"
  printf " ║  %-68s ║\\n" "◈ TIMESTAMP    │ \$time"
  printf " ║  %-68s ║\\n" "◈ UPTIME       │ \$uptime_str"
  printf " ║  %-68s ║\\n" "◈ PLATFORM     │ \$(uname -s) \$(uname -m)"
  echo " ║                                                                      ║"
  echo " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_convoy_panel() {
  echo ""
  echo " ╔══════════════════════════════════════════════════════════════════════╗"
  echo " ║  ▶ CONVOY OPERATIONS                                                 ║"
  echo " ╠══════════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                      ║"

  # Get actual status if gastown is available
  if command -v gastown &> /dev/null; then
    gastown --status 2>/dev/null | while IFS= read -r line; do
      printf " ║  %-68s ║\\n" "\$line"
    done
  else
    echo " ║   ┌─────────────────────────────────────────────────────────────┐   ║"
    echo " ║   │  ⚠  GASTOWN CLI NOT IN PATH                                │   ║"
    echo " ║   │     Execute from project directory or add to PATH          │   ║"
    echo " ║   └─────────────────────────────────────────────────────────────┘   ║"
  fi

  echo " ║                                                                      ║"
  echo " ╚══════════════════════════════════════════════════════════════════════╝"
}

print_controls_panel() {
  echo ""
  echo " ╔══════════════════════════════════════════════════════════════════════╗"
  echo " ║  ◆ CONTROL INTERFACE                                                 ║"
  echo " ╠════════════════════╦════════════════════╦════════════════════════════╣"
  echo " ║  [j/k] Navigate    ║  [r] Restart Proc  ║  [q] Exit Dashboard        ║"
  echo " ║  [↑/↓] Scroll      ║  [x] Stop Process  ║  [z] Zoom Terminal         ║"
  echo " ╚════════════════════╩════════════════════╩════════════════════════════╝"
  echo ""
  echo " ○──────────────────────────────────────────────────────────────────────○"
  printf "  ░░░ REFRESH: %s ░░░  PROCESSES: Active ░░░  MODE: Monitoring ░░░\\n" "\$(date '+%H:%M:%S')"
  echo " ○──────────────────────────────────────────────────────────────────────○"
}

# Main loop
while true; do
  clear
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
 * Generate convoy detail display script with industrial aesthetic.
 * Shows when not attached to tmux session.
 * Provides interactive options:
 * - [s] Start/resume the convoy via gastown
 * - [r] Retry tmux attach (mprocs built-in)
 */
function generateConvoyDetailScript(convoyId: string, convoyName: string, status: ConvoyStatus): string {
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

  // Interactive script with keyboard input handling
  const lines = [
    'SPIN=(◐ ◓ ◑ ◒); F=0',
    'show_panel() { clear; S=${SPIN[$F]}',
    'echo \\"\\"',
    'echo \\" ╔════════════════════════════════════════════════════════════════╗\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   ▄▄ •  ▄▄▄· .▄▄ ·     ▄▄▄▄▄      ▄▄▌ ▐ ▄▌ ▐ ▄                ║\\"',
    'echo \\" ║  ▐█ ▀ ▪▐█ ▀█ ▐█ ▀.     •██  ▪     ██· █▌▐█•█▌▐█               ║\\"',
    'echo \\" ║  ▄█ ▀█▄▄█▀▀█ ▄▀▀▀█▄     ▐█.▪ ▄█▀▄ ██▪▐█▐▐▌▐█▐▐▌               ║\\"',
    'echo \\" ║  ▐█▄▪▐█▐█ ▪▐▌▐█▄▪▐█     ▐█▌·▐█▌.▐▌▐█▌██▐█▌██▐█▌               ║\\"',
    'echo \\" ║  ·▀▀▀▀  ▀  ▀  ▀▀▀▀      ▀▀▀  ▀█▄▀▪ ▀▀▀▀ ▀▪▀▀ █▪               ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║  $S CONVOY DETAILS                                             ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║                                                                ║\\"',
    `printf \\" ║  ◈ ID        │ %-45s  ║\\\\n\\" \\"${safeId}\\"`,
    'echo \\" ║                                                                ║\\"',
    `printf \\" ║  ◈ NAME      │ %-45s  ║\\\\n\\" \\"${safeName}\\"`,
    'echo \\" ║                                                                ║\\"',
    `echo \\" ║  ◈ STATUS    │ ${statusGlyph} ${statusLabel.padEnd(10)} [${progressBar}]                  ║\\"`,
    'echo \\" ║                                                                ║\\"',
    `echo \\" ║  ◈ ACTIVITY  │ ${sparkline}                               ║\\"`,
    'echo \\" ║                                                                ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║  ◆ ACTIONS                                                     ║\\"',
    'echo \\" ╠════════════════════════════════════════════════════════════════╣\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   ┌──────────────────────────────────────────────────────┐     ║\\"',
    'echo \\" ║   │  [s] START / RESUME this convoy                     │     ║\\"',
    'echo \\" ║   │  [r] RETRY tmux attach (mprocs reload)              │     ║\\"',
    'echo \\" ║   │  [q] BACK to process list                          │     ║\\"',
    'echo \\" ║   └──────────────────────────────────────────────────────┘     ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ║   ⚠  SESSION NOT ATTACHED - Waiting for input...              ║\\"',
    'echo \\" ║                                                                ║\\"',
    'echo \\" ╚════════════════════════════════════════════════════════════════╝\\"',
    'echo \\"\\"',
    '}',
    // Main loop with keyboard input
    'while true; do',
    'show_panel',
    'F=$(( (F + 1) % 4 ))',
    // Read with timeout - allows animation while waiting for input
    'read -t 1 -n 1 key 2>/dev/null || key=\\"\\"',
    'case \\"$key\\" in',
    // [s] Start/resume convoy
    `s|S) echo \\" ▶ Starting convoy ${safeId}...\\"; gastown --resume ${convoyId} 2>/dev/null; tmux attach -t gastown-${convoyId} 2>/dev/null && exit 0 ;;`,
    // [a] Also start (alternative key)
    `a|A) echo \\" ▶ Starting convoy ${safeId}...\\"; gastown --resume ${convoyId} 2>/dev/null; tmux attach -t gastown-${convoyId} 2>/dev/null && exit 0 ;;`,
    // Any other key - try to attach (maybe session started externally)
    `*) tmux attach -t gastown-${convoyId} 2>/dev/null && exit 0 ;;`,
    'esac',
    'done',
  ];

  return lines.join('; ');
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
 * @returns YAML configuration string
 */
export function generateMprocsConfig(convoys: DashboardConvoyInfo[], statusScriptPath?: string): string {
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
      const detailScript = generateConvoyDetailScript(convoy.id, convoy.name, convoy.status);
      lines.push(`    shell: "tmux attach -t ${sessionName} 2>/dev/null || { ${detailScript} }"`);
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

  // Write the status script
  const statusScriptPath = `${tempDir}/control-room.sh`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  await Deno.chmod(statusScriptPath, 0o755);

  // Generate and write the mprocs config
  const config = generateMprocsConfig(convoys, statusScriptPath);
  const configPath = `${tempDir}/mprocs.yaml`;
  await Deno.writeTextFile(configPath, config);

  return configPath;
}

// Re-export for backward compatibility
export { generateStatusScriptContent };

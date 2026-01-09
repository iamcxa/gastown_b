// src/dashboard/mprocs.ts

/**
 * mprocs configuration generator for Gastown dashboard.
 * Generates YAML configuration for mprocs TUI to manage convoy sessions.
 *
 * Design: Industrial Control Room / Retro-Futurism aesthetic
 * - Amber/Gold theme (vintage CRT monitor feel)
 * - Box-drawing characters for frames
 * - Industrial iconography (gauges, meters)
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

/**
 * Generate the status display script content.
 * Creates an industrial-themed ASCII dashboard.
 */
function generateStatusScriptContent(): string {
  // Industrial Control Room aesthetic with box-drawing characters
  return `#!/bin/bash
# Gas Town Dashboard - Industrial Control Room Theme

while true; do
  clear

  # Header with industrial frame
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║  ⛽  G A S   T O W N   C O N T R O L   R O O M       ║"
  echo "║      Multi-Agent Orchestrator v1.0                    ║"
  echo "╠═══════════════════════════════════════════════════════╣"
  echo "║                                                       ║"

  # System clock
  echo "║  ⏱  SYSTEM TIME: $(date '+%Y-%m-%d %H:%M:%S')            ║"
  echo "║                                                       ║"
  echo "╠═══════════════════════════════════════════════════════╣"
  echo "║  📊 CONVOY STATUS                                     ║"
  echo "║  ───────────────────────────────────────────────────  ║"

  # Get actual status if gastown is available
  if command -v gastown &> /dev/null; then
    gastown --status 2>/dev/null | while IFS= read -r line; do
      printf "║  %-53s ║\\n" "\$line"
    done
  else
    echo "║  ⚠  gastown command not found                        ║"
    echo "║     Add gastown to PATH or run from project dir      ║"
  fi

  echo "║                                                       ║"
  echo "╠═══════════════════════════════════════════════════════╣"
  echo "║  🔧 CONTROLS                                          ║"
  echo "║  ───────────────────────────────────────────────────  ║"
  echo "║  [j/k] Navigate  [r] Retry  [x] Stop  [q] Quit        ║"
  echo "╚═══════════════════════════════════════════════════════╝"

  sleep 2
done
`;
}

/**
 * Generate convoy detail display script.
 * Shows when not attached to tmux session.
 */
function generateConvoyDetailScript(convoyId: string, convoyName: string, status: ConvoyStatus): string {
  const statusSymbol = status === 'running' ? '●' : status === 'idle' ? '○' : '◌';
  const statusBar = status === 'running' ? '▰▰▰▰▰' : status === 'idle' ? '▰▰▰▱▱' : '▱▱▱▱▱';

  // Escape double quotes in convoy name for shell (we use double quotes in the script)
  const safeName = convoyName.replace(/"/g, '\\"').substring(0, 50);

  // Single-line script with proper shell syntax
  // Uses double quotes for echo to avoid single-quote escaping issues in YAML
  const lines = [
    'while true; do clear',
    'echo \\"╔═══════════════════════════════════════════════════════╗\\"',
    'echo \\"║  ⛽ CONVOY DETAILS                                     ║\\"',
    'echo \\"╠═══════════════════════════════════════════════════════╣\\"',
    'echo \\"║                                                       ║\\"',
    `printf \\"║  ID:     %-45s ║\\\\n\\" \\"${convoyId}\\"`,
    'echo \\"║                                                       ║\\"',
    `printf \\"║  NAME:   %-45s ║\\\\n\\" \\"${safeName}\\"`,
    'echo \\"║                                                       ║\\"',
    `echo \\"║  STATUS: ${statusSymbol} ${status.toUpperCase().padEnd(10)} [${statusBar}]               ║\\"`,
    'echo \\"║                                                       ║\\"',
    'echo \\"╠═══════════════════════════════════════════════════════╣\\"',
    'echo \\"║  ⚠  SESSION NOT ATTACHED                              ║\\"',
    'echo \\"║     Retrying in 3s... (Press [r] to retry now)        ║\\"',
    'echo \\"╚═══════════════════════════════════════════════════════╝\\"',
    'sleep 3',
    `tmux attach -t gastown-${convoyId} 2>/dev/null && exit 0`,
    'done',
  ];

  return lines.join('; ');
}

/**
 * Generate welcome message for empty dashboard.
 */
function generateWelcomeScript(): string {
  return `echo '╔═══════════════════════════════════════════════════════╗'
echo '║  ⛽  W E L C O M E   T O   G A S   T O W N           ║'
echo '╠═══════════════════════════════════════════════════════╣'
echo '║                                                       ║'
echo '║  No active convoys found.                             ║'
echo '║                                                       ║'
echo '║  ───────────────────────────────────────────────────  ║'
echo '║                                                       ║'
echo '║  🚀 START A NEW CONVOY:                               ║'
echo '║     gastown "Your task description"                   ║'
echo '║                                                       ║'
echo '║  🔄 RESUME AN EXISTING CONVOY:                        ║'
echo '║     gastown --resume <convoy-id>                      ║'
echo '║                                                       ║'
echo '║  📊 VIEW ALL CONVOYS:                                 ║'
echo '║     gastown --list                                    ║'
echo '║                                                       ║'
echo '╚═══════════════════════════════════════════════════════╝'`;
}

/**
 * Generate mprocs YAML configuration for convoys.
 *
 * Creates a config with:
 * - status: Industrial-themed status pane with box-drawing frames
 * - One pane per convoy for attaching to its tmux session
 * - Gastown "Control Room" branding
 *
 * @param convoys - List of convoy info objects
 * @param statusScriptPath - Path to the status script (written by writeMprocsConfig)
 * @returns YAML configuration string
 */
export function generateMprocsConfig(convoys: DashboardConvoyInfo[], statusScriptPath?: string): string {
  const lines: string[] = [];

  // mprocs global settings - Industrial Control Room theme
  lines.push('# ═══════════════════════════════════════════════════════');
  lines.push('# ⛽ GAS TOWN CONTROL ROOM - mprocs Configuration');
  lines.push('# ═══════════════════════════════════════════════════════');
  lines.push('# Press [q] to quit (tmux sessions continue running)');
  lines.push('');
  lines.push('proc_list_width: 25');
  lines.push('');
  lines.push('procs:');

  // Status overview pane - uses external script if provided
  lines.push('  "⛽ Control Room":');
  if (statusScriptPath) {
    lines.push(`    shell: "bash ${statusScriptPath}"`);
  } else {
    // Fallback: simple inline status
    lines.push(
      `    shell: "bash -c 'while true; do clear; echo \\"╔═══════════════════════════════════════╗\\"; echo \\"║  ⛽ GAS TOWN CONTROL ROOM            ║\\"; echo \\"╚═══════════════════════════════════════╝\\"; echo; date \\"+%Y-%m-%d %H:%M:%S\\"; echo; gastown --status 2>/dev/null || echo \\"No status available\\"; sleep 2; done'"`,
    );
  }

  // Add a pane for each convoy with status indicator
  for (const convoy of convoys) {
    const sessionName = `gastown-${convoy.id}`;
    const statusIcon = convoy.status === 'running' ? '●' : convoy.status === 'idle' ? '○' : '◌';
    const paneLabel = convoy.id;

    lines.push(`  "${statusIcon} ${paneLabel}":`);
    // Try to attach to tmux session, show styled details if not available
    const detailScript = generateConvoyDetailScript(convoy.id, convoy.name, convoy.status);
    lines.push(`    shell: "tmux attach -t ${sessionName} 2>/dev/null || { ${detailScript} }"`);
  }

  // If no convoys, add a welcome pane
  if (convoys.length === 0) {
    lines.push('  "📋 Welcome":');
    lines.push(`    shell: "${generateWelcomeScript().replace(/\n/g, '; ').replace(/"/g, '\\"')}"`);
  }

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
  const statusScriptPath = `${tempDir}/status.sh`;
  await Deno.writeTextFile(statusScriptPath, generateStatusScriptContent());
  // Make it executable
  await Deno.chmod(statusScriptPath, 0o755);

  // Generate and write the mprocs config with reference to status script
  const config = generateMprocsConfig(convoys, statusScriptPath);
  const configPath = `${tempDir}/mprocs.yaml`;
  await Deno.writeTextFile(configPath, config);

  return configPath;
}

// Re-export for backward compatibility (tests may call generateMprocsConfig directly)
export { generateStatusScriptContent };

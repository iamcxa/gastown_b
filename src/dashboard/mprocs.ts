// src/dashboard/mprocs.ts

/**
 * mprocs configuration generator for Gastown dashboard.
 * Generates YAML configuration for mprocs TUI to manage convoy sessions.
 *
 * Gastown branding: Uses ANSI colors for status display
 * - Yellow/Gold for headers (matches Mayor theme)
 * - Green for running convoys
 * - Red for stopped convoys
 * - Cyan for info
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
 * ANSI color codes for terminal output.
 */
const COLORS = {
  reset: '\\033[0m',
  bold: '\\033[1m',
  yellow: '\\033[33m',
  green: '\\033[32m',
  red: '\\033[31m',
  cyan: '\\033[36m',
  dim: '\\033[2m',
};

/**
 * Escape a string for safe use in YAML.
 * Wraps in quotes if needed.
 */
function yamlEscape(str: string): string {
  // If string contains special chars, wrap in double quotes and escape internal quotes
  if (str.match(/[:\n"'#{}[\]&*!|>%@`]/)) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Build the status display shell script.
 * Uses a bash while loop instead of `watch` for cross-platform compatibility.
 */
function buildStatusScript(): string {
  // Gastown ASCII banner with colors
  const banner = `echo -e "${COLORS.bold}${COLORS.yellow}`;
  const bannerArt = `
   ╔═══════════════════════════════════════╗
   ║     ⛽  G A S   T O W N  ⛽          ║
   ║         Dashboard v1.0                ║
   ╚═══════════════════════════════════════╝
${COLORS.reset}"`;

  // Build a cross-platform status refresh loop
  // Uses bash while loop instead of watch (not available on macOS by default)
  return `bash -c 'while true; do clear; ${banner}${bannerArt}; echo -e "${COLORS.cyan}Last updated: $(date +%H:%M:%S)${COLORS.reset}"; echo; gastown --status 2>/dev/null || echo -e "${COLORS.dim}No status available${COLORS.reset}"; sleep 2; done'`;
}

/**
 * Generate mprocs YAML configuration for convoys.
 *
 * Creates a config with:
 * - status: Styled status pane showing gastown --status (cross-platform)
 * - One pane per convoy for attaching to its tmux session
 * - Gastown branding with ANSI colors
 *
 * @param convoys - List of convoy info objects
 * @returns YAML configuration string
 */
export function generateMprocsConfig(convoys: DashboardConvoyInfo[]): string {
  const lines: string[] = [];

  // mprocs global settings
  lines.push('# Gastown Dashboard Configuration');
  lines.push('# Press q to quit (tmux sessions continue running)');
  lines.push('');
  lines.push('proc_list_width: 25');
  lines.push('');
  lines.push('procs:');

  // Status overview pane with styled output
  lines.push('  "⛽ Status":');
  lines.push(`    shell: "${buildStatusScript().replace(/"/g, '\\"')}"`);

  // Add a pane for each convoy with status indicator
  for (const convoy of convoys) {
    const sessionName = `gastown-${convoy.id}`;
    const safeName = convoy.name.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 25);
    const statusIcon = convoy.status === 'running' ? '🟢' : convoy.status === 'idle' ? '🟡' : '🔴';
    const statusColor = convoy.status === 'running' ? COLORS.green : convoy.status === 'idle' ? COLORS.yellow : COLORS.red;

    lines.push(`  "${statusIcon} ${safeName}":`);
    lines.push(
      `    shell: "tmux attach -t ${yamlEscape(sessionName)} 2>/dev/null || echo -e \\"${statusColor}${COLORS.bold}Session: ${sessionName}${COLORS.reset}\\\\n${COLORS.dim}Status: ${convoy.status}\\\\nNot attached. Press 'r' to retry.${COLORS.reset}\\""`,
    );
  }

  // If no convoys, add a welcome pane
  if (convoys.length === 0) {
    lines.push('  "📋 Welcome":');
    lines.push(
      `    shell: "echo -e \\"${COLORS.yellow}${COLORS.bold}Welcome to Gas Town!${COLORS.reset}\\\\n\\\\n${COLORS.cyan}No active convoys found.${COLORS.reset}\\\\n\\\\nStart a new convoy with:\\\\n  ${COLORS.green}gastown \\\\\\"Your task description\\\\\\"${COLORS.reset}\\\\n\\\\nOr resume an existing one:\\\\n  ${COLORS.green}gastown --resume <convoy-id>${COLORS.reset}\\""`,
    );
  }

  return lines.join('\n') + '\n';
}

/**
 * Write mprocs configuration to a temporary file.
 *
 * @param config - YAML configuration string
 * @returns Path to the created config file
 */
export async function writeMprocsConfig(config: string): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'gastown-dashboard-' });
  const configPath = `${tempDir}/mprocs.yaml`;
  await Deno.writeTextFile(configPath, config);
  return configPath;
}

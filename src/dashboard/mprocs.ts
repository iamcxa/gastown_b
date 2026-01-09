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

// Note: ANSI codes removed - mprocs has issues with escape sequences in YAML
// The status icons (🟢🟡🔴) provide visual distinction instead

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
  // Simple cross-platform status refresh loop
  // Avoids ANSI escape codes which cause issues in mprocs YAML
  return `bash -c 'while true; do clear; echo "=== Gas Town Dashboard ==="; echo; date "+Last updated: %H:%M:%S"; echo; gastown --status 2>/dev/null || echo "No status available"; sleep 2; done'`;
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
  // Use convoy ID as pane name (names may be in any language)
  for (const convoy of convoys) {
    const sessionName = `gastown-${convoy.id}`;
    const statusIcon = convoy.status === 'running' ? '🟢' : convoy.status === 'idle' ? '🟡' : '🔴';
    // Use convoy ID directly - it's always unique and ASCII-safe
    // Full name shown in terminal output when not attached
    const paneLabel = convoy.id;

    lines.push(`  "${statusIcon} ${paneLabel}":`);
    lines.push(
      `    shell: "tmux attach -t ${sessionName} 2>/dev/null || echo 'Convoy: ${convoy.id}'; echo 'Name: ${convoy.name.replace(/'/g, "\\'")}'; echo 'Status: ${convoy.status}'; echo; echo 'Not attached. Press r to retry.'"`,
    );
  }

  // If no convoys, add a welcome pane
  if (convoys.length === 0) {
    lines.push('  "📋 Welcome":');
    lines.push(
      `    shell: "echo 'Welcome to Gas Town!'; echo; echo 'No active convoys found.'; echo; echo 'Start a new convoy with:'; echo '  gastown \"Your task description\"'; echo; echo 'Or resume an existing one:'; echo '  gastown --resume <convoy-id>'"`,
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

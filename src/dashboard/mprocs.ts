// src/dashboard/mprocs.ts

/**
 * mprocs configuration generator for Gastown dashboard.
 * Generates YAML configuration for mprocs TUI to manage convoy sessions.
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
 * Generate mprocs YAML configuration for convoys.
 *
 * Creates a config with:
 * - status: Watch pane showing gastown --status
 * - One pane per convoy for attaching to its tmux session
 *
 * @param convoys - List of convoy info objects
 * @returns YAML configuration string
 */
export function generateMprocsConfig(convoys: DashboardConvoyInfo[]): string {
  const lines: string[] = [];

  lines.push('procs:');

  // Status overview pane
  lines.push('  status:');
  lines.push('    shell: "watch -n 2 -c \\"gastown --status\\""');

  // Add a pane for each convoy
  for (const convoy of convoys) {
    const sessionName = `gastown-${convoy.id}`;
    const safeName = convoy.name.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 30);

    lines.push(`  ${yamlEscape(safeName)}:`);
    lines.push(
      `    shell: "tmux attach -t ${yamlEscape(sessionName)} 2>/dev/null || echo \\"Session '${sessionName}' not running. Status: ${convoy.status}\\""`,
    );
  }

  // If no convoys, add a placeholder
  if (convoys.length === 0) {
    lines.push('  no-convoys:');
    lines.push('    shell: "echo \\"No active convoys. Start one with: gastown <task>\\""');
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

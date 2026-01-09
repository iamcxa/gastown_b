// src/dashboard/dashboard.ts

/**
 * Dashboard launcher for Gastown.
 * Uses mprocs to provide a TUI overview of all running convoys.
 */

import { listConvoys, type ConvoyInfo } from '../bd-cli/mod.ts';
import { listSessions } from '../tmux/operations.ts';
import {
  generateMprocsConfig,
  writeMprocsConfig,
  type DashboardConvoyInfo,
  type ConvoyStatus,
} from './mprocs.ts';

/**
 * Map bd convoy status to dashboard status based on tmux session presence.
 *
 * @param convoy - Convoy info from bd
 * @param tmuxSessions - List of active gastown tmux session names
 * @returns Dashboard status
 */
export function mapConvoyStatus(convoy: ConvoyInfo, tmuxSessions: string[]): ConvoyStatus {
  const expectedSession = `gastown-${convoy.id}`;
  const hasSession = tmuxSessions.includes(expectedSession);

  if (hasSession) {
    return 'running';
  }

  // No tmux session - check if convoy is open (idle) or closed (stopped)
  if (convoy.status === 'open' || convoy.status === 'in_progress') {
    return 'idle';
  }

  return 'stopped';
}

/**
 * Convert bd convoy info to dashboard convoy info.
 *
 * @param convoys - List of bd convoy info
 * @param tmuxSessions - List of active gastown tmux session names
 * @returns List of dashboard convoy info
 */
export function mapConvoysToDashboard(
  convoys: ConvoyInfo[],
  tmuxSessions: string[],
): DashboardConvoyInfo[] {
  return convoys.map((convoy) => ({
    id: convoy.id,
    name: convoy.title,
    status: mapConvoyStatus(convoy, tmuxSessions),
  }));
}

/**
 * Launch the mprocs dashboard.
 *
 * Gets open convoys and their tmux session status, generates an mprocs
 * configuration, and launches mprocs with that configuration.
 *
 * Note: mprocs only "attaches" to tmux sessions - closing mprocs
 * leaves the sessions running.
 */
export async function launchDashboard(): Promise<void> {
  console.log('Launching Gastown dashboard...');

  // Get open convoys from bd
  let convoys: ConvoyInfo[] = [];
  try {
    convoys = await listConvoys('open');
  } catch (error) {
    // bd may not be initialized - that's OK, show empty dashboard
    console.error('Note: Could not list convoys:', (error as Error).message);
  }

  // Get active tmux sessions
  const tmuxSessions = await listSessions();

  // Map convoys to dashboard format
  const dashboardConvoys = mapConvoysToDashboard(convoys, tmuxSessions);

  console.log(`Found ${dashboardConvoys.length} convoy(s)`);
  for (const convoy of dashboardConvoys) {
    console.log(`  - ${convoy.name} (${convoy.id}): ${convoy.status}`);
  }

  // Generate and write mprocs config (writeMprocsConfig handles status script too)
  const configPath = await writeMprocsConfig(dashboardConvoys);

  console.log(`Starting mprocs...`);

  // Launch mprocs with interactive terminal
  const process = new Deno.Command('mprocs', {
    args: ['--config', configPath],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  try {
    const status = await process.output();
    if (!status.success) {
      console.error('mprocs exited with error');
      Deno.exit(status.code);
    }
  } catch (error) {
    if ((error as Error).message.includes('No such file')) {
      console.error('Error: mprocs not found. Install it with: brew install mprocs');
      Deno.exit(1);
    }
    throw error;
  } finally {
    // Clean up temp config
    try {
      await Deno.remove(configPath);
      const tempDir = configPath.substring(0, configPath.lastIndexOf('/'));
      await Deno.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

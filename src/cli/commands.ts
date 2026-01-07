import { loadConfig, saveConfig, generateDefaultConfig } from './config.ts';
import { createNewBd, writeBdFile, parseBdFile } from '../bd/mod.ts';
import { launchMayor } from '../claude/launcher.ts';
import {
  attachSession,
  killSession,
  listSessions,
  sessionExists,
} from '../tmux/operations.ts';
import { getConvoyProgress } from '../scheduler/scheduler.ts';
import type { BdFile } from '../types.ts';

export interface StartOptions {
  maxWorkers?: number;
  projectDir?: string;
}

export async function startConvoy(task: string, options: StartOptions = {}): Promise<void> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  const bd = createNewBd(task, maxWorkers);
  const bdPath = `${projectDir}/${bd.path}`;
  bd.path = bdPath;
  await writeBdFile(bd);
  console.log(`Created bd file: ${bd.path}`);

  const sessionName = `gastown-${bd.convoyName}`;

  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists. Use 'gastown attach' to connect.`);
    return;
  }

  const success = await launchMayor(sessionName, projectDir, bdPath, bd.convoyName, task);

  if (!success) {
    console.error('Failed to start convoy');
    return;
  }

  console.log(`Convoy started: ${sessionName}`);
  console.log('Attaching to session...');
  await attachSession(sessionName);
}

export async function resumeConvoy(bdPath: string): Promise<void> {
  console.log(`Resuming convoy from: ${bdPath}`);

  const bd = await parseBdFile(bdPath);
  const sessionName = `gastown-${bd.convoyName}`;

  if (await sessionExists(sessionName)) {
    console.log('Session already running. Attaching...');
    await attachSession(sessionName);
    return;
  }

  console.log('Rebuilding session from bd state...');

  const projectDir = Deno.cwd();
  await loadConfig(projectDir);

  const success = await launchMayor(
    sessionName,
    projectDir,
    bdPath,
    bd.convoyName,
    bd.convoyDescription
  );

  if (!success) {
    console.error('Failed to resume convoy');
    return;
  }

  console.log('Convoy resumed. Attaching...');
  await attachSession(sessionName);
}

export async function showStatus(bdPath?: string): Promise<void> {
  if (bdPath) {
    const bd = await parseBdFile(bdPath);
    displayBdStatus(bd);
  } else {
    const sessions = await listSessions();

    if (sessions.length === 0) {
      console.log('No active convoys.');
      return;
    }

    console.log('Active convoys:');
    for (const session of sessions) {
      console.log(`  - ${session}`);
    }
  }
}

function displayBdStatus(bd: BdFile): void {
  console.log(`\nConvoy: ${bd.convoyName}`);
  console.log(`Description: ${bd.convoyDescription}`);
  console.log(`Phase: ${bd.meta['phase'] || 'unknown'}`);
  console.log('');

  const progress = getConvoyProgress(bd);
  console.log(`Progress: ${progress.completed}/${progress.total} (${progress.percent}%)`);
  console.log('');

  for (const section of bd.sections) {
    console.log(`### ${section.name}`);
    for (const task of section.tasks) {
      const roleStr = task.roleInstance ? `${task.role}-${task.roleInstance}` : task.role;
      console.log(`  ${task.status} [${roleStr}] ${task.description}`);
    }
    console.log('');
  }
}

export async function attachToConvoy(sessionName?: string): Promise<void> {
  if (sessionName) {
    const fullName = sessionName.startsWith('gastown-') ? sessionName : `gastown-${sessionName}`;
    await attachSession(fullName);
  } else {
    const sessions = await listSessions();
    if (sessions.length === 0) {
      console.log('No active convoys.');
      return;
    }
    await attachSession(sessions[0]);
  }
}

export async function stopConvoy(archive: boolean = false): Promise<void> {
  const sessions = await listSessions();

  if (sessions.length === 0) {
    console.log('No active convoys.');
    return;
  }

  for (const session of sessions) {
    console.log(`Stopping ${session}...`);
    await killSession(session);
  }

  if (archive) {
    console.log('Archiving bd files...');
    // TODO: Move bd files to archive directory
  }

  console.log('All convoys stopped.');
}

export async function initConfig(): Promise<void> {
  const projectDir = Deno.cwd();
  const config = generateDefaultConfig();
  await saveConfig(projectDir, config);
  console.log(`Created gastown.json with default configuration.`);

  const agentsDir = `${projectDir}/.gastown/agents`;
  await Deno.mkdir(agentsDir, { recursive: true });
  console.log(`Created ${agentsDir}/`);

  console.log('\nNext steps:');
  console.log('1. Create agent definitions in .gastown/agents/');
  console.log('2. Run: gastown "your task description"');
}

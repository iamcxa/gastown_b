import { loadConfig, saveConfig, generateDefaultConfig } from './config.ts';
import { createNewBd, writeBdFile, parseBdFile } from '../bd/mod.ts';
import { launchMayor, launchPrime } from '../claude/launcher.ts';
import {
  attachSession,
  killSession,
  listSessions,
  sessionExists,
} from '../tmux/operations.ts';
import { getConvoyProgress } from '../scheduler/scheduler.ts';
import type { BdFile } from '../types.ts';
import {
  createConvoy,
  createAgentBead,
  setAgentState,
  type ConvoyInfo,
} from '../bd-cli/mod.ts';

export interface StartOptions {
  maxWorkers?: number;
  projectDir?: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
  primeMode?: boolean; // Enable Prime Minister mode for autonomous convoy
}

export interface ConvoyState {
  convoyId: string;
  convoyInfo: ConvoyInfo;
  mayorId: string;
  plannerId?: string;
  foremanId?: string;
  mode: 'mayor' | 'prime';
  tmuxSession: string;
}

export interface StartOptionsV2 extends StartOptions {
  dryRun?: boolean;
}

export async function startConvoy(task: string, options: StartOptions = {}): Promise<void> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  const contextPath = options.contextPath;
  const primeMode = options.primeMode || false;

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);
  if (contextPath) {
    console.log(`Autopilot mode: ${contextPath}`);
  }
  if (primeMode) {
    console.log('Prime Minister mode enabled');
    if (!contextPath) {
      console.warn('Warning: Prime Minister mode works best with a context file (--context)');
    }
  }

  const bd = createNewBd(task, maxWorkers);
  const bdPath = `${projectDir}/${bd.path}`;
  bd.path = bdPath;

  // Store context path in bd meta for resume
  if (contextPath) {
    bd.contextPath = contextPath;
    bd.meta['context-path'] = contextPath;
  }

  // Set mode based on primeMode flag
  if (primeMode) {
    bd.mode = 'prime';
    bd.meta['mode'] = 'prime';
    bd.primeEnabled = true;
  } else if (contextPath) {
    bd.meta['mode'] = 'autopilot';
  } else {
    bd.meta['mode'] = 'manual';
  }

  await writeBdFile(bd);
  console.log(`Created bd file: ${bd.path}`);

  const sessionName = `gastown-${bd.convoyName}`;

  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists. Use 'gastown attach' to connect.`);
    return;
  }

  const success = await launchMayor(sessionName, projectDir, bdPath, bd.convoyName, task, contextPath, primeMode);

  if (!success) {
    console.error('Failed to start convoy');
    return;
  }

  console.log(`Convoy started: ${sessionName}`);

  // Launch Prime Minister in second pane if primeMode is enabled
  if (primeMode) {
    console.log('Launching Prime Minister in split pane...');
    const primeContextPath = contextPath || ''; // PM needs context, but we warned above if missing
    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      bdPath,
      bd.convoyName,
      task,
      primeContextPath,
      '0' // Mayor is in pane 0
    );

    if (!primeSuccess) {
      console.error('Failed to launch Prime Minister');
      // Continue anyway - Mayor is running
    } else {
      console.log('Prime Minister launched');
    }
  }

  console.log('Attaching to session...');
  await attachSession(sessionName);
}

export async function startConvoyWithBd(
  task: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  const primeMode = options.primeMode || false;
  const mode = primeMode ? 'prime' : 'mayor';

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  // 1. Create convoy epic via bd CLI
  const convoy = await createConvoy({
    title: task,
    description: `Convoy: ${task}`,
    maxWorkers,
    labels: primeMode ? ['mode:prime'] : [],
  });

  console.log(`Created convoy: ${convoy.id}`);

  // 2. Create core agent beads
  const mayor = await createAgentBead({
    role: 'mayor',
    convoyId: convoy.id,
  });
  await setAgentState(mayor.id, 'spawning');

  const planner = await createAgentBead({
    role: 'planner',
    convoyId: convoy.id,
  });

  const foreman = await createAgentBead({
    role: 'foreman',
    convoyId: convoy.id,
  });

  console.log(`Created agents: ${mayor.id}, ${planner.id}, ${foreman.id}`);

  const sessionName = `gastown-${convoy.id}`;

  const state: ConvoyState = {
    convoyId: convoy.id,
    convoyInfo: convoy,
    mayorId: mayor.id,
    plannerId: planner.id,
    foremanId: foreman.id,
    mode,
    tmuxSession: sessionName,
  };

  if (options.dryRun) {
    return state;
  }

  // 3. Launch tmux and Mayor
  if (await sessionExists(sessionName)) {
    console.log(`Session ${sessionName} already exists.`);
    return state;
  }

  const success = await launchMayor(
    sessionName,
    projectDir,
    convoy.id, // Pass convoy ID instead of bd path
    convoy.id,
    task,
    options.contextPath,
    primeMode
  );

  if (!success) {
    console.error('Failed to start convoy');
    throw new Error('Failed to launch Mayor');
  }

  await setAgentState(mayor.id, 'working');

  // 4. Launch Prime Minister if enabled
  if (primeMode) {
    console.log('Launching Prime Minister...');
    const prime = await createAgentBead({
      role: 'prime',
      convoyId: convoy.id,
    });

    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      convoy.id,
      convoy.id,
      task,
      options.contextPath || '',
      '0'
    );

    if (primeSuccess) {
      await setAgentState(prime.id, 'working');
    }
  }

  console.log(`Convoy started: ${sessionName}`);
  console.log('Attaching to session...');
  await attachSession(sessionName);

  return state;
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

  // Get context path from bd meta (for autopilot mode)
  const contextPath = bd.contextPath || bd.meta['context-path'];
  if (contextPath) {
    console.log(`Resuming in autopilot mode: ${contextPath}`);
  }

  // Check if prime mode was enabled
  const isPrimeMode = bd.mode === 'prime' || bd.meta['mode'] === 'prime' || bd.primeEnabled;
  if (isPrimeMode) {
    console.log('Prime Minister mode enabled');
  }

  const success = await launchMayor(
    sessionName,
    projectDir,
    bdPath,
    bd.convoyName,
    bd.convoyDescription,
    contextPath,
    isPrimeMode
  );

  if (!success) {
    console.error('Failed to resume convoy');
    return;
  }

  // Launch Prime Minister if prime mode was enabled
  if (isPrimeMode) {
    console.log('Launching Prime Minister in split pane...');
    const primeContextPath = contextPath || '';
    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      bdPath,
      bd.convoyName,
      bd.convoyDescription,
      primeContextPath,
      '0' // Mayor is in pane 0
    );

    if (!primeSuccess) {
      console.error('Failed to launch Prime Minister');
      // Continue anyway - Mayor is running
    } else {
      console.log('Prime Minister launched');
    }
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

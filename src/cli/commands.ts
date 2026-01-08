import { loadConfig, saveConfig, generateDefaultConfig } from './config.ts';
import { extractIssueIds, findDuplicateConvoys } from './duplicate-check.ts';
import { promptConvoySelection } from './prompt.ts';
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
  getConvoy,
  listAgentBeads,
  listConvoys,
  getReadyTasks,
  closeConvoy,
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
  primeId?: string;
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
  // Input validation
  if (!task || task.trim() === '') {
    throw new Error('Task description is required');
  }

  // === Duplicate detection ===
  const issueIds = extractIssueIds(task);
  if (issueIds.length > 0) {
    const duplicates = await findDuplicateConvoys(issueIds);
    if (duplicates.length > 0) {
      const selection = await promptConvoySelection(duplicates);

      if (selection.action === 'resume') {
        return resumeConvoyWithBd(selection.convoyId, options);
      }
      if (selection.action === 'cancel') {
        throw new Error('Cancelled by user');
      }
      // action === 'create': continue with normal flow
      console.log('創建新的 convoy...');
    }
  }
  // === End duplicate detection ===

  const projectDir = options.projectDir || Deno.cwd();
  const config = await loadConfig(projectDir);
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  const primeMode = options.primeMode || false;
  const mode = primeMode ? 'prime' : 'mayor';

  console.log(`Starting convoy for: "${task}"`);
  console.log(`Max workers: ${maxWorkers}`);

  // Build labels including contextPath for resume support
  const labels: string[] = [];
  if (primeMode) {
    labels.push('mode:prime');
  }
  if (options.contextPath) {
    labels.push(`context:${options.contextPath}`);
  }

  // 1. Create convoy epic via bd CLI
  const convoy = await createConvoy({
    title: task,
    description: `Convoy: ${task}`,
    maxWorkers,
    labels,
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
    // Note: Orphaned beads remain in bd - acceptable for debugging/resume purposes
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
    state.primeId = prime.id;

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

// Constants for convoy labels
const MODE_PRIME_LABEL = 'mode:prime';
const CONTEXT_PREFIX = 'context:';

export async function resumeConvoyWithBd(
  convoyId: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  // Input validation
  if (!convoyId || convoyId.trim() === '') {
    throw new Error('Convoy ID is required');
  }

  console.log(`Resuming convoy: ${convoyId}`);

  // 1. Get convoy info from bd
  const convoy = await getConvoy(convoyId);
  const sessionName = `gastown-${convoyId}`;

  // 2. Get agent beads
  const agents = await listAgentBeads(convoyId);
  const mayor = agents.find((a) => a.role === 'mayor');
  const planner = agents.find((a) => a.role === 'planner');
  const foreman = agents.find((a) => a.role === 'foreman');
  const prime = agents.find((a) => a.role === 'prime');

  if (!mayor) {
    throw new Error('Mayor agent not found in convoy');
  }

  // 3. Determine mode from labels
  const isPrimeMode = convoy.labels.includes(MODE_PRIME_LABEL);
  const mode = isPrimeMode ? 'prime' : 'mayor';

  const state: ConvoyState = {
    convoyId: convoy.id,
    convoyInfo: convoy,
    mayorId: mayor.id,
    plannerId: planner?.id,
    foremanId: foreman?.id,
    primeId: prime?.id,
    mode,
    tmuxSession: sessionName,
  };

  // 4. Check if already running - return early if so
  if (await sessionExists(sessionName)) {
    console.log('Session already running. Attaching...');
    if (!options.dryRun) {
      await attachSession(sessionName);
    }
    return state;
  }

  if (options.dryRun) {
    return state;
  }

  // 5. Rebuild tmux session
  console.log('Rebuilding session...');
  const projectDir = options.projectDir || Deno.cwd();
  await loadConfig(projectDir);

  // Extract contextPath from convoy labels
  const contextLabel = convoy.labels.find((l) => l.startsWith(CONTEXT_PREFIX));
  const contextPath = contextLabel?.replace(CONTEXT_PREFIX, '') ?? options.contextPath;

  const success = await launchMayor(
    sessionName,
    projectDir,
    convoyId,
    convoyId,
    convoy.title,
    contextPath,
    isPrimeMode
  );

  if (!success) {
    throw new Error('Failed to resume convoy');
  }

  await setAgentState(mayor.id, 'working');

  // 6. Launch Prime if needed
  if (isPrimeMode && prime) {
    const primeSuccess = await launchPrime(
      sessionName,
      projectDir,
      convoyId,
      convoyId,
      convoy.title,
      contextPath ?? '',
      '0'
    );
    if (primeSuccess) {
      await setAgentState(prime.id, 'working');
    } else {
      console.warn('Warning: Failed to launch Prime Minister');
    }
  }

  console.log('Convoy resumed. Attaching...');
  await attachSession(sessionName);

  return state;
}

// Constants for showStatusWithBd
const STATUS_OPEN = 'open';
const MAX_DISPLAYED_TASKS = 5;
const GASTOWN_SESSION_PREFIX = 'gastown-';

export async function showStatusWithBd(convoyId?: string): Promise<void> {
  if (convoyId) {
    try {
      const convoy = await getConvoy(convoyId);
      const agents = await listAgentBeads(convoyId);
      const tasks = await getReadyTasks(convoyId);

      console.log(`\nConvoy: ${convoy.id}`);
      console.log(`Title: ${convoy.title}`);
      console.log(`Status: ${convoy.status}`);
      console.log('');

      console.log('Agents:');
      if (agents.length === 0) {
        console.log('  (none)');
      } else {
        for (const agent of agents) {
          console.log(`  ${agent.role}: ${agent.state}`);
        }
      }
      console.log('');

      const displayedTasks = tasks.slice(0, MAX_DISPLAYED_TASKS);
      const remainingCount = tasks.length - displayedTasks.length;
      console.log(`Ready tasks: ${tasks.length}`);
      for (const task of displayedTasks) {
        console.log(`  - ${task.title}`);
      }
      if (remainingCount > 0) {
        console.log(`  ... and ${remainingCount} more`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to get convoy status: ${message}`);
    }
  } else {
    // List all convoys
    try {
      const convoys = await listConvoys(STATUS_OPEN);
      const sessions = await listSessions();

      if (convoys.length === 0) {
        console.log('No active convoys.');
        return;
      }

      console.log('Active convoys:');
      for (const convoy of convoys) {
        // Match gastown session naming convention: gastown-{convoyId}
        const expectedSessionName = `${GASTOWN_SESSION_PREFIX}${convoy.id}`;
        const hasSession = sessions.includes(expectedSessionName);
        const status = hasSession ? '(running)' : '(stopped)';
        console.log(`  - ${convoy.id}: ${convoy.title} ${status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to list convoys: ${message}`);
    }
  }
}

export interface StopOptions {
  dryRun?: boolean;
}

// Constants for stop messages
const STOP_REASON = 'Stopped by user';

export async function stopConvoyWithBd(
  convoyId?: string,
  options: StopOptions = {}
): Promise<void> {
  if (convoyId) {
    // Stop specific convoy
    const sessionName = `${GASTOWN_SESSION_PREFIX}${convoyId}`;

    try {
      // 1. Update agent states (only when not dry run)
      if (!options.dryRun) {
        const agents = await listAgentBeads(convoyId);
        for (const agent of agents) {
          await setAgentState(agent.id, 'stopped');
        }
      }

      // 2. Kill tmux session
      if (!options.dryRun && await sessionExists(sessionName)) {
        console.log(`Stopping ${sessionName}...`);
        await killSession(sessionName);
      }

      // 3. Close convoy (only when not dry run)
      if (!options.dryRun) {
        await closeConvoy(convoyId, STOP_REASON);
      }
      console.log(`Convoy ${convoyId} stopped.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to stop convoy ${convoyId}: ${message}`);
      throw error; // Re-throw for programmatic callers
    }
  } else {
    // Stop all convoys
    try {
      const convoys = await listConvoys(STATUS_OPEN);
      const sessions = await listSessions();

      if (convoys.length === 0 && sessions.length === 0) {
        console.log('No active convoys.');
        return;
      }

      for (const convoy of convoys) {
        await stopConvoyWithBd(convoy.id, options);
      }

      // Kill any orphaned gastown sessions
      for (const session of sessions) {
        if (session.startsWith(GASTOWN_SESSION_PREFIX) && !options.dryRun) {
          await killSession(session);
        }
      }

      console.log('All convoys stopped.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to stop convoys: ${message}`);
      throw error; // Re-throw for programmatic callers
    }
  }
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

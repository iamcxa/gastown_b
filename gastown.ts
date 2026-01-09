#!/usr/bin/env -S deno run --allow-all

/**
 * Gas Town - Multi-Agent Orchestrator for Claude Code
 *
 * Usage:
 *   gastown "task description"     Start new convoy
 *   gastown --context <file>       Start in autopilot mode with context file
 *   gastown --prime <task>         Start in Prime Minister mode
 *   gastown --resume <bd-file>     Resume from bd
 *   gastown --status [bd-file]     Show status
 *   gastown attach [session]       Attach to session
 *   gastown stop [--archive]       Stop convoy
 *   gastown init                   Generate config
 */

import { parseArgs } from 'https://deno.land/std@0.224.0/cli/parse_args.ts';
import {
  startConvoyWithBd,
  resumeConvoyWithBd,
  showStatusWithBd,
  attachToConvoy,
  stopConvoyWithBd,
  initConfig,
} from './src/cli/commands.ts';
import { spawnAgent } from './src/spawn/mod.ts';
import { checkForReadyWork, triggerWork } from './src/gupp/mod.ts';
import type { RoleName } from './src/types.ts';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
Gas Town v${VERSION} - Multi-Agent Orchestrator for Claude Code

USAGE:
  gastown <task>                    Start new convoy with task
  gastown --context <file> <task>   Start in autopilot mode with context file
  gastown --prime <task>            Start in Prime Minister mode
  gastown --resume <bd-file>        Resume convoy from bd file
  gastown --status [bd-file]        Show convoy status
  gastown attach [session-name]     Attach to running convoy
  gastown stop [--archive]          Stop all convoys
  gastown init                      Initialize gastown in project
  gastown spawn <role> --task "..."   Spawn agent in current convoy
  gastown gupp check [--dry-run]    Check for ready work and trigger spawning

OPTIONS:
  --max-workers <n>    Maximum parallel workers (default: 3)
  --context <file>     Path to convoy-context.md for autopilot mode
  --prime, -p          Enable Prime Minister mode (autonomous convoy)
  --help, -h           Show this help
  --version, -v        Show version

SPAWN OPTIONS:
  --task "<desc>"      Task description for the agent (required for spawn)
  --convoy <id>        Override convoy ID (default: $GASTOWN_BD)
  --convoy-name <n>    Override convoy name (default: $GASTOWN_CONVOY)

GUPP OPTIONS:
  --dry-run            Show what would be done without taking action

SPAWN ROLES:
  planner    Design and architecture
  foreman    Task breakdown and planning
  polecat    Implementation (TDD)
  witness    Code review
  dog        Testing
  refinery   Code quality

MODES:
  Mayor Mode (default):
    Human interacts with Mayor agent for convoy coordination.
    Mayor asks questions and waits for human decisions.

  Autopilot Mode (--context):
    Mayor reads pre-defined answers from context file.
    Proceeds without interaction unless blocked by critical issues.

  Prime Minister Mode (--prime):
    PM agent makes decisions autonomously. Human observes in
    two-pane UI (Mayor | Prime Minister) and can intervene.
    Best used with --context to provide PM decision context.

  Create a context file from the template:
    cp .gastown/templates/convoy-context.template.md my-context.md

EXAMPLES:
  gastown "Implement user authentication"
  gastown --context auth-context.md "Implement user authentication"
  gastown --prime "Implement user authentication"
  gastown --prime --context auth-context.md "Implement auth"
  gastown -p -c auth-context.md "Implement auth"
  gastown --max-workers 5 "Refactor payment module"
  gastown --resume convoy-2026-01-07.bd
  gastown --status
  gastown attach convoy-2026-01-07
  gastown stop --archive
`);
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ['resume', 'status', 'max-workers', 'context', 'task', 'convoy', 'convoy-name'],
    boolean: ['help', 'version', 'archive', 'prime', 'dry-run'],
    alias: {
      h: 'help',
      v: 'version',
      c: 'context',
      p: 'prime',
      t: 'task',
    },
  });

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log(`Gas Town v${VERSION}`);
    return;
  }

  const [command, ...rest] = args._;

  if (command === 'attach') {
    await attachToConvoy(rest[0]?.toString());
    return;
  }

  if (command === 'stop') {
    await stopConvoyWithBd();
    return;
  }

  if (command === 'init') {
    await initConfig();
    return;
  }

  if (command === 'spawn') {
    const role = rest[0]?.toString();
    const validRoles = ['planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery'];

    if (!role || !validRoles.includes(role)) {
      console.error(`Usage: gastown spawn <role> --task "<description>"`);
      console.error(`Roles: ${validRoles.join(', ')}`);
      Deno.exit(1);
    }

    if (!args.task) {
      console.error('Error: --task is required for spawn command');
      console.error('Usage: gastown spawn <role> --task "<description>"');
      Deno.exit(1);
    }

    try {
      const result = await spawnAgent({
        role: role as RoleName,
        task: args.task,
        convoyId: args.convoy,
        convoyName: args['convoy-name'],
        contextPath: args.context,
      });

      console.log(`Spawned ${role} agent`);
      console.log(`  Agent ID: ${result.agentId}`);
      console.log(`  Convoy: ${result.convoyId}`);
      console.log(`  Pane: ${result.paneIndex}`);
    } catch (error) {
      console.error(`Failed to spawn ${role}:`, (error as Error).message);
      Deno.exit(1);
    }
    return;
  }

  if (command === 'gupp') {
    const subcommand = rest[0]?.toString();

    if (subcommand !== 'check') {
      console.error('Usage: gastown gupp check [--dry-run]');
      Deno.exit(1);
    }

    try {
      const checkResult = await checkForReadyWork(args.convoy);

      if (args['dry-run']) {
        console.log('GUPP Check Results (dry-run):');
        console.log(`  Convoy ID: ${checkResult.convoyId || 'none'}`);
        console.log(`  Convoy: ${checkResult.convoy?.title || 'not found'}`);
        console.log(`  Has Work: ${checkResult.hasWork}`);
        console.log(`  Ready Tasks: ${checkResult.readyTasks.length}`);
        checkResult.readyTasks.forEach((t) => {
          console.log(`    - ${t.id}: ${t.title}`);
        });
        console.log(`  All Tasks Done: ${checkResult.allTasksDone}`);
        console.log(`  Idle Worker Slots: ${checkResult.idleWorkerSlots}`);
        console.log(`  Active Agents: ${checkResult.agents.length}`);
        checkResult.agents.forEach((a) => {
          console.log(`    - ${a.id}: ${a.role} (${a.state})`);
        });

        // Show what would be triggered
        const triggerResult = await triggerWork(checkResult, true);
        console.log(`\n  Would trigger: ${triggerResult.message}`);
      } else {
        const triggerResult = await triggerWork(checkResult, false);

        if (triggerResult.triggered) {
          console.log(`[GUPP] ${triggerResult.message}`);
        } else if (checkResult.convoyId) {
          console.log(`[GUPP] No action: ${triggerResult.message}`);
        }
        // Silent exit if no convoy context (typical for non-convoy environments)
      }
    } catch (error) {
      console.error('GUPP check failed:', (error as Error).message);
      Deno.exit(1);
    }
    return;
  }

  if (args.resume) {
    await resumeConvoyWithBd(args.resume);
    return;
  }

  if (args.status !== undefined) {
    await showStatusWithBd(args.status || undefined);
    return;
  }

  if (command) {
    const task = [command, ...rest].join(' ');
    await startConvoyWithBd(task, {
      maxWorkers: args['max-workers'] ? parseInt(args['max-workers']) : undefined,
      contextPath: args.context,
      primeMode: args.prime,
    });
    return;
  }

  printHelp();
}

main().catch(console.error);

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
  startConvoy,
  resumeConvoy,
  showStatus,
  attachToConvoy,
  stopConvoy,
  initConfig,
} from './src/cli/commands.ts';

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

OPTIONS:
  --max-workers <n>    Maximum parallel workers (default: 3)
  --context <file>     Path to convoy-context.md for autopilot mode
  --prime, -p          Enable Prime Minister mode (autonomous convoy)
  --help, -h           Show this help
  --version, -v        Show version

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
    string: ['resume', 'status', 'max-workers', 'context'],
    boolean: ['help', 'version', 'archive', 'prime'],
    alias: {
      h: 'help',
      v: 'version',
      c: 'context',
      p: 'prime',
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
    await stopConvoy(args.archive);
    return;
  }

  if (command === 'init') {
    await initConfig();
    return;
  }

  if (args.resume) {
    await resumeConvoy(args.resume);
    return;
  }

  if (args.status !== undefined) {
    await showStatus(args.status || undefined);
    return;
  }

  if (command) {
    const task = [command, ...rest].join(' ');
    await startConvoy(task, {
      maxWorkers: args['max-workers'] ? parseInt(args['max-workers']) : undefined,
      contextPath: args.context,
      primeMode: args.prime,
    });
    return;
  }

  printHelp();
}

main().catch(console.error);

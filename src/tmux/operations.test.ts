import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildNewSessionCommand,
  buildSplitPaneCommand,
  buildKillPaneCommand,
  buildAttachCommand,
  parseSessionList,
} from './operations.ts';

Deno.test('buildNewSessionCommand - creates session with name', () => {
  const cmd = buildNewSessionCommand('gastown-test', 'echo hello');
  assertStringIncludes(cmd, 'tmux new-session');
  // Session names and commands are shell-escaped with single quotes
  assertStringIncludes(cmd, "-s 'gastown-test'");
  assertStringIncludes(cmd, '-d');
  assertStringIncludes(cmd, "'echo hello'");
});

Deno.test('buildSplitPaneCommand - splits horizontally', () => {
  const cmd = buildSplitPaneCommand('gastown-test', 'echo worker', 'horizontal');
  assertStringIncludes(cmd, 'tmux split-window');
  assertStringIncludes(cmd, "-t 'gastown-test'");
  assertStringIncludes(cmd, '-h');
});

Deno.test('buildSplitPaneCommand - splits vertically', () => {
  const cmd = buildSplitPaneCommand('gastown-test', 'echo worker', 'vertical');
  assertStringIncludes(cmd, '-v');
});

Deno.test('buildKillPaneCommand - kills specific pane', () => {
  const cmd = buildKillPaneCommand('gastown-test', '1');
  assertStringIncludes(cmd, 'tmux kill-pane');
  assertStringIncludes(cmd, '-t gastown-test:0.1');
});

Deno.test('buildAttachCommand - attaches to session', () => {
  const cmd = buildAttachCommand('gastown-test');
  assertStringIncludes(cmd, 'tmux attach-session');
  // Session name is shell-escaped
  assertStringIncludes(cmd, "-t 'gastown-test'");
});

Deno.test('parseSessionList - parses tmux list-sessions output', () => {
  const output = `gastown-convoy1: 2 windows (created Mon Jan  7 10:00:00 2026)
gastown-convoy2: 1 windows (created Mon Jan  7 11:00:00 2026)
other-session: 1 windows (created Mon Jan  7 09:00:00 2026)`;

  const sessions = parseSessionList(output);
  assertEquals(sessions.length, 2);
  assertEquals(sessions[0], 'gastown-convoy1');
  assertEquals(sessions[1], 'gastown-convoy2');
});

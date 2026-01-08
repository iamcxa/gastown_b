import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildSessionInitCommands,
  buildSetPaneTitleCommand,
  buildStatusBarConfig,
  ROLE_COLORS,
  ROLE_ICONS,
} from './status.ts';

Deno.test('ROLE_ICONS contains all roles', () => {
  const expectedRoles = [
    'mayor',
    'planner',
    'foreman',
    'polecat',
    'witness',
    'dog',
    'refinery',
    'prime',
  ];
  for (const role of expectedRoles) {
    assertEquals(role in ROLE_ICONS, true, `Missing icon for: ${role}`);
  }
});

Deno.test('ROLE_COLORS contains all roles', () => {
  const expectedRoles = [
    'mayor',
    'planner',
    'foreman',
    'polecat',
    'witness',
    'dog',
    'refinery',
    'prime',
  ];
  for (const role of expectedRoles) {
    assertEquals(role in ROLE_COLORS, true, `Missing color for: ${role}`);
  }
});

Deno.test('buildStatusBarConfig returns valid tmux commands', () => {
  const config = buildStatusBarConfig('mayor', 'test-convoy', 'Build chess game');
  assertEquals(Array.isArray(config), true);
  assertEquals(config.length > 0, true);

  // Check that config contains set-option commands
  const hasSetOption = config.some((cmd) => cmd.includes('set-option'));
  assertEquals(hasSetOption, true);

  // Check for status-left configuration
  const hasStatusLeft = config.some((cmd) => cmd.includes('status-left'));
  assertEquals(hasStatusLeft, true);

  // Check for status-right configuration
  const hasStatusRight = config.some((cmd) => cmd.includes('status-right'));
  assertEquals(hasStatusRight, true);
});

Deno.test('buildStatusBarConfig includes role icon and name', () => {
  const config = buildStatusBarConfig('planner', 'test-convoy', 'Design API');
  const statusLeft = config.find((cmd) => cmd.includes('status-left') && !cmd.includes('length'));
  assertEquals(statusLeft !== undefined, true);
  assertStringIncludes(statusLeft!, ROLE_ICONS.planner);
  assertStringIncludes(statusLeft!, 'PLANNER');
});

Deno.test('buildStatusBarConfig truncates long tasks', () => {
  const longTask =
    'This is a very long task description that should be truncated to fit in the status bar nicely';
  const config = buildStatusBarConfig('foreman', 'test-convoy', longTask);
  const statusRight = config.find((cmd) => cmd.includes('status-right') && !cmd.includes('length'));
  assertEquals(statusRight !== undefined, true);
  // Should be truncated with '...'
  assertStringIncludes(statusRight!, '...');
  // Should not contain the full task
  assertEquals(statusRight!.includes(longTask), false);
});

Deno.test('buildStatusBarConfig uses role color', () => {
  const config = buildStatusBarConfig('polecat', 'convoy-123', 'Implement feature');
  const statusLeft = config.find((cmd) => cmd.includes('status-left') && !cmd.includes('length'));
  assertEquals(statusLeft !== undefined, true);
  assertStringIncludes(statusLeft!, ROLE_COLORS.polecat);
});

Deno.test('buildSetPaneTitleCommand creates correct tmux command', () => {
  const cmd = buildSetPaneTitleCommand('gastown-convoy', '0', 'mayor');
  assertStringIncludes(cmd, 'tmux select-pane');
  assertStringIncludes(cmd, '-t "gastown-convoy:0.0"');
  assertStringIncludes(cmd, '-T');
  assertStringIncludes(cmd, ROLE_ICONS.mayor);
  assertStringIncludes(cmd, 'mayor');
});

Deno.test('buildSessionInitCommands creates targeted commands', () => {
  const commands = buildSessionInitCommands('gastown-test', 'witness', 'convoy-abc', 'Review code');
  assertEquals(Array.isArray(commands), true);

  // All commands should target the session
  for (const cmd of commands) {
    assertStringIncludes(cmd, 'tmux');
    assertStringIncludes(cmd, 'gastown-test');
  }

  // Should include pane title command
  const hasPaneTitleCmd = commands.some((cmd) => cmd.includes('select-pane') && cmd.includes('-T'));
  assertEquals(hasPaneTitleCmd, true);
});

Deno.test('buildSessionInitCommands includes status bar commands', () => {
  const commands = buildSessionInitCommands('gastown-convoy', 'dog', 'convoy-xyz', 'Run tests');

  // Should have status-left command
  const hasStatusLeft = commands.some((cmd) => cmd.includes('status-left'));
  assertEquals(hasStatusLeft, true);

  // Should have status-right command
  const hasStatusRight = commands.some((cmd) => cmd.includes('status-right'));
  assertEquals(hasStatusRight, true);
});

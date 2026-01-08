import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildClaudeCommand } from '../src/claude/command.ts';
import { generateDefaultConfig } from '../src/cli/config.ts';

Deno.test('Integration: Claude command generation', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/project/.gastown/agents',
    convoyId: 'test-convoy-id',
    convoyName: 'test-convoy',
    prompt: 'Implement JWT service',
    workingDir: '/project',
  });

  // Should include all required parts
  assertEquals(cmd.includes('GASTOWN_ROLE=polecat'), true);
  assertEquals(cmd.includes('GASTOWN_BD=test-convoy-id'), true);
  assertEquals(cmd.includes('GASTOWN_CONVOY=test-convoy'), true);
  assertEquals(cmd.includes('--agent /project/.gastown/agents/polecat.md'), true);
  // Working directory is shell-escaped with single quotes
  assertEquals(cmd.includes("cd '/project'"), true);
  assertEquals(cmd.includes('Implement JWT service'), true);
});

Deno.test('Integration: Claude command generation with resume', () => {
  const cmd = buildClaudeCommand({
    role: 'witness',
    agentDir: '/project/.gastown/agents',
    convoyId: 'review-convoy-id',
    convoyName: 'review-convoy',
    resume: true,
  });

  assertEquals(cmd.includes('GASTOWN_ROLE=witness'), true);
  assertEquals(cmd.includes('--resume'), true);
});

Deno.test('Integration: config defaults', () => {
  const config = generateDefaultConfig();

  assertEquals(config.maxWorkers, 3);
  assertEquals(config.respawn.contextThreshold, 80);
  assertExists(config.convoy.bdDir);
  assertExists(config.convoy.archiveDir);
  assertEquals(config.convoy.bdDir, './');
  assertEquals(config.convoy.archiveDir, 'docs/tasks/archive');
});

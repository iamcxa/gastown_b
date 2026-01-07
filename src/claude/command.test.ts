import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildClaudeCommand,
  buildClaudeEnvVars,
  buildAgentFlag,
} from './command.ts';
Deno.test('buildAgentFlag - returns correct flag for role', () => {
  assertEquals(buildAgentFlag('mayor', '/path/to/agents'), '--agent /path/to/agents/mayor.md');
  assertEquals(buildAgentFlag('polecat', '/path'), '--agent /path/polecat.md');
});

Deno.test('buildClaudeEnvVars - includes role and bd path', () => {
  const env = buildClaudeEnvVars('polecat', '/convoy.bd', 'convoy-test');
  assertEquals(env['GASTOWN_ROLE'], 'polecat');
  assertEquals(env['GASTOWN_BD'], '/convoy.bd');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
});

Deno.test('buildClaudeCommand - basic command without prompt', () => {
  const cmd = buildClaudeCommand({
    role: 'mayor',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
  });

  assertStringIncludes(cmd, 'claude');
  assertStringIncludes(cmd, '--agent /agents/mayor.md');
  assertStringIncludes(cmd, 'GASTOWN_ROLE=mayor');
});

Deno.test('buildClaudeCommand - includes prompt when provided', () => {
  const cmd = buildClaudeCommand({
    role: 'mayor',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    prompt: 'Implement auth feature',
  });

  assertStringIncludes(cmd, '--prompt');
  assertStringIncludes(cmd, 'Implement auth feature');
});

Deno.test('buildClaudeCommand - includes resume flag', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    resume: true,
  });

  assertStringIncludes(cmd, '--resume');
});

Deno.test('buildClaudeCommand - includes working directory', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    bdPath: '/test.bd',
    convoyName: 'test',
    workingDir: '/project',
  });

  assertStringIncludes(cmd, 'cd /project');
});

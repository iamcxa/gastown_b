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
    convoyId: 'test-convoy-id',
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
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    prompt: 'Implement auth feature',
  });

  // Prompt is passed as positional argument (shell-escaped), not with --prompt flag
  assertStringIncludes(cmd, "'Implement auth feature'");
});

Deno.test('buildClaudeCommand - includes resume flag', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    resume: true,
  });

  assertStringIncludes(cmd, '--resume');
});

Deno.test('buildClaudeCommand - includes working directory', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    workingDir: '/project',
  });

  // Working directory is shell-escaped with single quotes
  assertStringIncludes(cmd, "cd '/project'");
});

Deno.test('buildClaudeEnvVars - includes context path when provided', () => {
  const env = buildClaudeEnvVars('mayor', '/convoy.bd', 'convoy-test', '/context.md');
  assertEquals(env['GASTOWN_ROLE'], 'mayor');
  assertEquals(env['GASTOWN_BD'], '/convoy.bd');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
  assertEquals(env['GASTOWN_CONTEXT'], '/context.md');
});

Deno.test('buildClaudeEnvVars - omits context path when not provided', () => {
  const env = buildClaudeEnvVars('mayor', '/convoy.bd', 'convoy-test');
  assertEquals(env['GASTOWN_CONTEXT'], undefined);
});

Deno.test('buildClaudeCommand - includes context env var for autopilot mode', () => {
  const cmd = buildClaudeCommand({
    role: 'mayor',
    agentDir: '/agents',
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    contextPath: '/path/to/context.md',
  });

  assertStringIncludes(cmd, 'GASTOWN_CONTEXT=/path/to/context.md');
});

Deno.test('buildClaudeEnvVars - includes mayor pane index when provided', () => {
  const env = buildClaudeEnvVars('prime', '/convoy.bd', 'convoy-test', '/context.md', '0');
  assertEquals(env['GASTOWN_ROLE'], 'prime');
  assertEquals(env['GASTOWN_BD'], '/convoy.bd');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
  assertEquals(env['GASTOWN_CONTEXT'], '/context.md');
  assertEquals(env['GASTOWN_MAYOR_PANE'], '0');
});

Deno.test('buildClaudeEnvVars - omits mayor pane index when not provided', () => {
  const env = buildClaudeEnvVars('prime', '/convoy.bd', 'convoy-test', '/context.md');
  assertEquals(env['GASTOWN_MAYOR_PANE'], undefined);
});

Deno.test('buildClaudeCommand - includes mayor pane env var for prime role', () => {
  const cmd = buildClaudeCommand({
    role: 'prime',
    agentDir: '/agents',
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    contextPath: '/path/to/context.md',
    mayorPaneIndex: '0',
  });

  assertStringIncludes(cmd, 'GASTOWN_MAYOR_PANE=0');
  assertStringIncludes(cmd, 'GASTOWN_CONTEXT=/path/to/context.md');
});

Deno.test('buildClaudeEnvVars - includes agent id when provided', () => {
  const env = buildClaudeEnvVars('polecat', 'convoy-123', 'convoy-test', undefined, undefined, 'agent-456');
  assertEquals(env['GASTOWN_ROLE'], 'polecat');
  assertEquals(env['GASTOWN_BD'], 'convoy-123');
  assertEquals(env['GASTOWN_CONVOY'], 'convoy-test');
  assertEquals(env['GASTOWN_AGENT_ID'], 'agent-456');
});

Deno.test('buildClaudeEnvVars - omits agent id when not provided', () => {
  const env = buildClaudeEnvVars('polecat', 'convoy-123', 'convoy-test');
  assertEquals(env['GASTOWN_AGENT_ID'], undefined);
});

Deno.test('buildClaudeCommand - includes agent id env var when provided', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/agents',
    convoyId: 'convoy-123',
    convoyName: 'test-convoy',
    agentId: 'agent-456',
  });

  assertStringIncludes(cmd, 'GASTOWN_AGENT_ID=agent-456');
});

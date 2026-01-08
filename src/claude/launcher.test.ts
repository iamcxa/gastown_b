import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getRoleAgentPath,
  getDefaultAgentDir,
  buildLaunchConfig,
  getGastownInstallDir,
} from './launcher.ts';

Deno.test('getGastownInstallDir - returns gastown root directory', () => {
  const dir = getGastownInstallDir();
  // Should end with gastown_b (the project root)
  assertStringIncludes(dir, 'gastown');
});

Deno.test('getDefaultAgentDir - falls back to gastown install dir', () => {
  // When project doesn't have .gastown/agents with the agent file, use install dir
  const dir = getDefaultAgentDir('/nonexistent/project', 'mayor');
  const installDir = getGastownInstallDir();
  assertEquals(dir, `${installDir}/.gastown/agents`);
});

Deno.test('getDefaultAgentDir - uses explicit agentsDir when provided', () => {
  const dir = getDefaultAgentDir('/project', 'mayor', '/custom/agents');
  assertEquals(dir, '/custom/agents');
});

Deno.test('getRoleAgentPath - returns full path', () => {
  const path = getRoleAgentPath('mayor', '/project/.gastown/agents');
  assertEquals(path, '/project/.gastown/agents/mayor.md');
});

Deno.test('buildLaunchConfig - creates valid config for mayor', () => {
  const config = buildLaunchConfig({
    role: 'mayor',
    projectDir: '/project',
    convoyId: 'test-convoy-id',
    convoyName: 'test-convoy',
    task: 'Implement feature',
    agentsDir: '/custom/agents', // Explicitly set for test
  });

  assertEquals(config.role, 'mayor');
  assertEquals(config.agentDir, '/custom/agents');
  assertEquals(config.convoyId, 'test-convoy-id');
  assertEquals(config.convoyName, 'test-convoy');
  assertEquals(config.workingDir, '/project');
});

Deno.test('buildLaunchConfig - includes checkpoint for respawn', () => {
  const config = buildLaunchConfig({
    role: 'polecat',
    projectDir: '/project',
    convoyId: 'test-convoy-id',
    convoyName: 'test',
    task: 'Task',
    checkpoint: 'Completed step 3',
  });

  assertEquals(config.resume, true);
});

Deno.test('buildLaunchConfig - includes mayorPaneIndex for prime role', () => {
  const config = buildLaunchConfig({
    role: 'prime',
    projectDir: '/project',
    convoyId: 'test-convoy-id',
    convoyName: 'test-convoy',
    task: 'Monitor and answer questions',
    contextPath: '/project/context.md',
    mayorPaneIndex: '0',
    agentsDir: '/custom/agents',
  });

  assertEquals(config.role, 'prime');
  assertEquals(config.contextPath, '/project/context.md');
  assertEquals(config.mayorPaneIndex, '0');
  assertEquals(config.agentDir, '/custom/agents');
});

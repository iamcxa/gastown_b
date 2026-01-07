import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getRoleAgentPath,
  getDefaultAgentDir,
  buildLaunchConfig,
} from './launcher.ts';

Deno.test('getDefaultAgentDir - returns .gastown/agents', () => {
  const dir = getDefaultAgentDir('/project');
  assertEquals(dir, '/project/.gastown/agents');
});

Deno.test('getRoleAgentPath - returns full path', () => {
  const path = getRoleAgentPath('mayor', '/project/.gastown/agents');
  assertEquals(path, '/project/.gastown/agents/mayor.md');
});

Deno.test('buildLaunchConfig - creates valid config for mayor', () => {
  const config = buildLaunchConfig({
    role: 'mayor',
    projectDir: '/project',
    bdPath: '/project/convoy.bd',
    convoyName: 'test-convoy',
    task: 'Implement feature',
  });

  assertEquals(config.role, 'mayor');
  assertEquals(config.agentDir, '/project/.gastown/agents');
  assertEquals(config.bdPath, '/project/convoy.bd');
  assertEquals(config.convoyName, 'test-convoy');
  assertEquals(config.workingDir, '/project');
});

Deno.test('buildLaunchConfig - includes checkpoint for respawn', () => {
  const config = buildLaunchConfig({
    role: 'polecat',
    projectDir: '/project',
    bdPath: '/project/convoy.bd',
    convoyName: 'test',
    task: 'Task',
    checkpoint: 'Completed step 3',
  });

  assertEquals(config.resume, true);
});

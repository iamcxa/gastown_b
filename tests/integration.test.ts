import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createNewBd, writeBdContent, parseBdContent } from '../src/bd/mod.ts';
import { buildClaudeCommand } from '../src/claude/command.ts';
import { getNextTasks, hasCircularDependency } from '../src/scheduler/deps.ts';
import { generateDefaultConfig } from '../src/cli/config.ts';

Deno.test('Integration: bd round-trip with full convoy', () => {
  // Create a new bd
  const bd = createNewBd('Implement user authentication', 3);

  // Find the Execution section
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection) throw new Error('Execution section not found');

  // Add execution tasks
  executionSection.tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Implement JWT service',
      status: '🔵',
      notes: [],
    },
    {
      id: 'polecat-2',
      role: 'polecat',
      roleInstance: 2,
      description: 'Implement refresh tokens',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1' }],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review auth implementation',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
    },
    {
      id: 'dog-1',
      role: 'dog',
      roleInstance: 1,
      description: 'Run auth tests',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Witness-1' }],
    },
  ];

  // Write and parse back
  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  // Find Execution section in parsed result
  const parsedExecution = parsed.sections.find((s) => s.name === 'Execution');
  if (!parsedExecution) throw new Error('Parsed Execution section not found');

  // Verify structure preserved
  assertEquals(parsedExecution.tasks.length, 4);
  assertEquals(parsedExecution.tasks[0].id, 'polecat-1');
  assertEquals(parsedExecution.tasks[0].description, 'Implement JWT service');
  assertEquals(parsedExecution.tasks[1].notes[0].key, 'depends');
  assertEquals(parsedExecution.tasks[1].notes[0].value, 'Polecat-1');

  // Verify no circular dependencies
  assertEquals(hasCircularDependency(parsed), false);

  // Verify correct next tasks (only polecat-1 should be ready)
  // Need to account for Planning section tasks too
  const next = getNextTasks(parsed, 10);
  const polecatTask = next.find((t) => t.id === 'polecat-1');
  assertExists(polecatTask, 'polecat-1 should be in next tasks');
});

Deno.test('Integration: Claude command generation', () => {
  const cmd = buildClaudeCommand({
    role: 'polecat',
    agentDir: '/project/.gastown/agents',
    bdPath: '/project/convoy.bd',
    convoyName: 'test-convoy',
    prompt: 'Implement JWT service',
    workingDir: '/project',
  });

  // Should include all required parts
  assertEquals(cmd.includes('GASTOWN_ROLE=polecat'), true);
  assertEquals(cmd.includes('GASTOWN_BD=/project/convoy.bd'), true);
  assertEquals(cmd.includes('GASTOWN_CONVOY=test-convoy'), true);
  assertEquals(cmd.includes('--agent /project/.gastown/agents/polecat.md'), true);
  assertEquals(cmd.includes('cd /project'), true);
  assertEquals(cmd.includes('Implement JWT service'), true);
});

Deno.test('Integration: Claude command generation with resume', () => {
  const cmd = buildClaudeCommand({
    role: 'witness',
    agentDir: '/project/.gastown/agents',
    bdPath: '/project/convoy.bd',
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

Deno.test('Integration: dependency resolution order', () => {
  const bd = createNewBd('Test', 3);

  // Find Execution section
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection) throw new Error('Execution section not found');

  executionSection.tasks = [
    { id: 'a', role: 'polecat', roleInstance: 1, description: 'A', status: '✅', notes: [] },
    {
      id: 'b',
      role: 'polecat',
      roleInstance: 2,
      description: 'B',
      status: '🔵',
      notes: [{ key: 'depends', value: 'A' }],
    },
    {
      id: 'c',
      role: 'polecat',
      roleInstance: 3,
      description: 'C',
      status: '🔵',
      notes: [{ key: 'depends', value: 'A' }],
    },
    {
      id: 'd',
      role: 'witness',
      roleInstance: 1,
      description: 'D',
      status: '🔵',
      notes: [{ key: 'depends', value: 'B, C' }],
    },
  ];

  // Clear Planning section tasks to isolate test
  const planningSection = bd.sections.find((s) => s.name === 'Planning');
  if (planningSection) {
    planningSection.tasks = [];
  }

  // A is done, B and C should be ready
  const next = getNextTasks(bd, 3);
  assertEquals(next.length, 2);
  assertEquals(
    next.map((t) => t.id).sort(),
    ['b', 'c']
  );

  // Mark B done, C still needed for D
  executionSection.tasks[1].status = '✅';
  const next2 = getNextTasks(bd, 3);
  assertEquals(next2.length, 1);
  assertEquals(next2[0].id, 'c');

  // Mark C done, D should be ready
  executionSection.tasks[2].status = '✅';
  const next3 = getNextTasks(bd, 3);
  assertEquals(next3.length, 1);
  assertEquals(next3[0].id, 'd');
});

Deno.test('Integration: circular dependency detection', () => {
  const bd = createNewBd('Test circular', 3);

  // Find Execution section
  const executionSection = bd.sections.find((s) => s.name === 'Execution');
  if (!executionSection) throw new Error('Execution section not found');

  // Create circular dependency: A -> B -> C -> A
  executionSection.tasks = [
    {
      id: 'a',
      role: 'polecat',
      roleInstance: 1,
      description: 'A',
      status: '🔵',
      notes: [{ key: 'depends', value: 'C' }],
    },
    {
      id: 'b',
      role: 'polecat',
      roleInstance: 2,
      description: 'B',
      status: '🔵',
      notes: [{ key: 'depends', value: 'A' }],
    },
    {
      id: 'c',
      role: 'polecat',
      roleInstance: 3,
      description: 'C',
      status: '🔵',
      notes: [{ key: 'depends', value: 'B' }],
    },
  ];

  // Should detect circular dependency
  assertEquals(hasCircularDependency(bd), true);
});

Deno.test('Integration: bd preserves all sections after round-trip', () => {
  const bd = createNewBd('Test sections', 3);

  // Verify initial structure
  assertEquals(bd.sections.length, 3);
  assertEquals(bd.sections[0].name, 'Coordination');
  assertEquals(bd.sections[1].name, 'Planning');
  assertEquals(bd.sections[2].name, 'Execution');

  // Round-trip
  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  // Verify all sections preserved
  assertEquals(parsed.sections.length, 3);
  assertEquals(parsed.sections[0].name, 'Coordination');
  assertEquals(parsed.sections[1].name, 'Planning');
  assertEquals(parsed.sections[2].name, 'Execution');

  // Verify Coordination section has mayor task
  const coordination = parsed.sections.find((s) => s.name === 'Coordination');
  assertExists(coordination);
  assertEquals(coordination.tasks.length, 1);
  assertEquals(coordination.tasks[0].role, 'mayor');
  assertEquals(coordination.tasks[0].status, '🟡');

  // Verify Planning section has planner and foreman tasks
  const planning = parsed.sections.find((s) => s.name === 'Planning');
  assertExists(planning);
  assertEquals(planning.tasks.length, 2);
  assertEquals(planning.tasks[0].role, 'planner');
  assertEquals(planning.tasks[1].role, 'foreman');
});

Deno.test('Integration: meta fields preserved after round-trip', () => {
  const bd = createNewBd('Test meta', 3);

  // Add custom meta
  bd.meta['custom-field'] = 'custom-value';
  bd.meta['linear-issue'] = 'SC-123';

  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  // Verify meta preserved
  assertExists(parsed.meta['created']);
  assertEquals(parsed.meta['phase'], 'planning');
  assertEquals(parsed.meta['max-workers'], '3');
  assertEquals(parsed.meta['custom-field'], 'custom-value');
  assertEquals(parsed.meta['linear-issue'], 'SC-123');
});

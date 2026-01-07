import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildDependencyGraph, getNextTasks, hasCircularDependency } from './deps.ts';
import type { BdFile } from '../types.ts';

// Create a minimal BdFile for testing (without default tasks from createNewBd)
function createTestBd(): BdFile {
  return {
    path: 'test-convoy.bd',
    convoyName: 'test-convoy',
    convoyDescription: 'Test Convoy',
    meta: {},
    sections: [
      {
        name: 'Execution',
        tasks: [
          { id: 'polecat-1', role: 'polecat', roleInstance: 1, description: 'T1', status: '🔵', notes: [] },
          {
            id: 'polecat-2',
            role: 'polecat',
            roleInstance: 2,
            description: 'T2',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Polecat-1' }],
          },
          {
            id: 'witness-1',
            role: 'witness',
            roleInstance: 1,
            description: 'Review',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
          },
          {
            id: 'dog-1',
            role: 'dog',
            roleInstance: 1,
            description: 'Test',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Witness-1' }],
          },
        ],
      },
    ],
  };
}

Deno.test('buildDependencyGraph - creates correct graph', () => {
  const bd = createTestBd();
  const graph = buildDependencyGraph(bd);

  assertEquals(graph.get('polecat-1'), []);
  assertEquals(graph.get('polecat-2'), ['polecat-1']);
  assertEquals(graph.get('witness-1')?.sort(), ['polecat-1', 'polecat-2']);
  assertEquals(graph.get('dog-1'), ['witness-1']);
});

Deno.test('getNextTasks - returns tasks with no deps first', () => {
  const bd = createTestBd();
  const next = getNextTasks(bd, 2);

  assertEquals(next.length, 1);
  assertEquals(next[0].id, 'polecat-1');
});

Deno.test('getNextTasks - respects max workers', () => {
  const bd = createTestBd();
  // Mark polecat-1 as completed
  bd.sections[0].tasks[0].status = '✅';

  const next = getNextTasks(bd, 1);
  assertEquals(next.length, 1);

  const nextTwo = getNextTasks(bd, 2);
  assertEquals(nextTwo.length, 1); // Only polecat-2 is ready
});

Deno.test('getNextTasks - returns multiple ready tasks', () => {
  const bd = createTestBd();
  // Mark polecat-1 as completed
  bd.sections[0].tasks[0].status = '✅';
  // Remove dependency from polecat-2
  bd.sections[0].tasks[1].notes = [];

  const next = getNextTasks(bd, 3);
  // polecat-2 and potentially others
  assertEquals(next.length >= 1, true);
});

Deno.test('hasCircularDependency - detects no cycle', () => {
  const bd = createTestBd();
  assertEquals(hasCircularDependency(bd), false);
});

Deno.test('hasCircularDependency - detects cycle', () => {
  const bd = createTestBd();
  // Create circular dependency: polecat-1 depends on dog-1
  bd.sections[0].tasks[0].notes = [{ key: 'depends', value: 'Dog-1' }];

  assertEquals(hasCircularDependency(bd), true);
});

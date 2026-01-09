// src/gupp/check.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkForReadyWork, type GuppCheckResult } from './check.ts';

Deno.test('checkForReadyWork returns empty when no convoy ID', async () => {
  // Ensure GASTOWN_BD is not set for this test
  const originalBd = Deno.env.get('GASTOWN_BD');
  Deno.env.delete('GASTOWN_BD');

  try {
    const result = await checkForReadyWork();

    assertEquals(result.hasWork, false);
    assertEquals(result.readyTasks.length, 0);
    assertEquals(result.allTasksDone, false);
    assertEquals(result.idleWorkerSlots, 0);
    assertEquals(result.convoyId, null);
    assertEquals(result.convoy, null);
    assertEquals(result.agents.length, 0);
  } finally {
    // Restore environment
    if (originalBd) {
      Deno.env.set('GASTOWN_BD', originalBd);
    }
  }
});

Deno.test('checkForReadyWork returns empty for non-existent convoy', async () => {
  const result = await checkForReadyWork('non-existent-convoy-xyz');

  assertEquals(result.hasWork, false);
  assertEquals(result.readyTasks.length, 0);
  assertEquals(result.allTasksDone, false);
  assertEquals(result.convoyId, 'non-existent-convoy-xyz');
  assertEquals(result.convoy, null);
});

Deno.test('GuppCheckResult has expected shape', () => {
  // Type check - this test verifies the interface is correctly defined
  const mockResult: GuppCheckResult = {
    hasWork: true,
    readyTasks: [
      {
        id: 'task-1',
        title: 'Test task',
        description: 'A test task',
        status: 'open',
        labels: ['gt:task'],
        deps: [],
      },
    ],
    allTasksDone: false,
    idleWorkerSlots: 2,
    convoyId: 'convoy-1',
    convoy: {
      id: 'convoy-1',
      title: 'Test Convoy',
      description: 'Test description',
      status: 'open',
      labels: ['convoy'],
      createdAt: '2026-01-01T00:00:00Z',
    },
    agents: [
      {
        id: 'agent-1',
        role: 'mayor',
        state: 'running',
      },
    ],
  };

  assertExists(mockResult.hasWork);
  assertExists(mockResult.readyTasks);
  assertExists(mockResult.convoyId);
  assertEquals(mockResult.readyTasks.length, 1);
  assertEquals(mockResult.agents.length, 1);
});

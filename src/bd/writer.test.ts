import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { writeBdContent, createNewBd } from './writer.ts';
import { parseBdContent } from './parser.ts';
import type { BdFile } from '../types.ts';

Deno.test('writeBdContent - round-trip preserves structure', () => {
  const bd: BdFile = {
    path: 'test.bd',
    convoyName: 'convoy-2026-01-07',
    convoyDescription: 'Test Task (SC-123)',
    meta: {
      created: '2026-01-07T10:00:00',
      phase: 'planning',
      'max-workers': '3',
    },
    sections: [
      {
        name: 'Coordination',
        tasks: [
          {
            id: 'mayor',
            role: 'mayor',
            description: 'Coordinating',
            status: '🟡',
            notes: [{ key: 'context-usage', value: '20%' }],
          },
        ],
      },
    ],
  };

  const content = writeBdContent(bd);
  const parsed = parseBdContent(content, 'test.bd');

  assertEquals(parsed.convoyName, bd.convoyName);
  assertEquals(parsed.convoyDescription, bd.convoyDescription);
  assertEquals(parsed.meta['created'], bd.meta['created']);
  assertEquals(parsed.sections.length, bd.sections.length);
  assertEquals(parsed.sections[0].tasks[0].status, '🟡');
});

Deno.test('createNewBd - creates valid bd structure', () => {
  const bd = createNewBd('Implement auth feature', 3);

  assertEquals(bd.convoyDescription, 'Implement auth feature');
  assertEquals(bd.meta['max-workers'], '3');
  assertEquals(bd.sections.length, 3);
  assertEquals(bd.sections[0].name, 'Coordination');
  assertEquals(bd.sections[1].name, 'Planning');
  assertEquals(bd.sections[2].name, 'Execution');

  // Mayor task should exist
  const mayorTask = bd.sections[0].tasks[0];
  assertEquals(mayorTask.role, 'mayor');
  assertEquals(mayorTask.status, '🟡');
});

Deno.test('writeBdContent - formats task with instance number', () => {
  const bd: BdFile = {
    path: 'test.bd',
    convoyName: 'convoy-test',
    convoyDescription: 'Test',
    meta: {},
    sections: [
      {
        name: 'Execution',
        tasks: [
          {
            id: 'polecat-1',
            role: 'polecat',
            roleInstance: 1,
            description: 'Task 1',
            status: '🟡',
            notes: [],
          },
          {
            id: 'polecat-2',
            role: 'polecat',
            roleInstance: 2,
            description: 'Task 2',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Polecat-1' }],
          },
        ],
      },
    ],
  };

  const content = writeBdContent(bd);
  assertEquals(content.includes('[Polecat-1]'), true);
  assertEquals(content.includes('[Polecat-2]'), true);
  assertEquals(content.includes('📝 depends: Polecat-1'), true);
});

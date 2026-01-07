import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseBdFile, parseBdContent } from './parser.ts';

const SAMPLE_BD = `# convoy-2026-01-07.bd

## 🟡 Convoy: Implement User Auth (SC-456)

### Meta
📝 created: 2026-01-07T10:30:00
📝 phase: execution
📝 max-workers: 3

### Coordination
🟡 [Mayor] Coordinating convoy
  📝 last-checkpoint: delegated to Foreman
  📝 context-usage: 45%

### Planning
✅ [Planner] Brainstorming & Design
  📝 output: docs/plans/design.md
  📝 completed: 2026-01-07T11:00:00

### Execution
🟡 [Polecat-1] Implement JWT service
  📝 files: src/auth/jwt.ts
  📝 progress: 3/5 functions done

🔵 [Polecat-2] Implement refresh token
  📝 depends: Polecat-1

🔵 [Witness-1] Review implementation
  📝 depends: Polecat-1, Polecat-2
`;

Deno.test('parseBdContent - parses convoy name', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.convoyName, 'convoy-2026-01-07');
  assertEquals(bd.convoyDescription, 'Implement User Auth (SC-456)');
});

Deno.test('parseBdContent - parses meta section', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.meta['created'], '2026-01-07T10:30:00');
  assertEquals(bd.meta['phase'], 'execution');
  assertEquals(bd.meta['max-workers'], '3');
});

Deno.test('parseBdContent - parses sections', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  assertEquals(bd.sections.length, 3);
  assertEquals(bd.sections[0].name, 'Coordination');
  assertEquals(bd.sections[1].name, 'Planning');
  assertEquals(bd.sections[2].name, 'Execution');
});

Deno.test('parseBdContent - parses tasks with status', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const coordination = bd.sections[0];

  assertEquals(coordination.tasks.length, 1);
  assertEquals(coordination.tasks[0].role, 'mayor');
  assertEquals(coordination.tasks[0].status, '🟡');
  assertEquals(coordination.tasks[0].description, 'Coordinating convoy');
});

Deno.test('parseBdContent - parses task notes', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const mayorTask = bd.sections[0].tasks[0];

  assertEquals(mayorTask.notes.length, 2);
  assertEquals(mayorTask.notes[0].key, 'last-checkpoint');
  assertEquals(mayorTask.notes[0].value, 'delegated to Foreman');
  assertEquals(mayorTask.notes[1].key, 'context-usage');
  assertEquals(mayorTask.notes[1].value, '45%');
});

Deno.test('parseBdContent - parses role instances', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const execution = bd.sections[2];

  assertEquals(execution.tasks[0].role, 'polecat');
  assertEquals(execution.tasks[0].roleInstance, 1);
  assertEquals(execution.tasks[1].role, 'polecat');
  assertEquals(execution.tasks[1].roleInstance, 2);
});

Deno.test('parseBdContent - parses depends note', () => {
  const bd = parseBdContent(SAMPLE_BD, 'test.bd');
  const polecat2 = bd.sections[2].tasks[1];
  const dependsNote = polecat2.notes.find((n) => n.key === 'depends');

  assertExists(dependsNote);
  assertEquals(dependsNote.value, 'Polecat-1');
});

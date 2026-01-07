import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  updateTaskStatus,
  updateTaskNote,
  addTask,
  findTaskById,
  getTaskDependencies,
  getReadyTasks,
  getActiveWorkerCount,
} from './operations.ts';
import { createNewBd } from './writer.ts';
import type { BdFile, BdTask } from '../types.ts';

Deno.test('updateTaskStatus - changes task status', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskStatus(bd, 'mayor', '✅');

  const task = findTaskById(updated, 'mayor');
  assertEquals(task?.status, '✅');
});

Deno.test('updateTaskNote - adds new note', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskNote(bd, 'mayor', 'progress', '50%');

  const task = findTaskById(updated, 'mayor');
  const note = task?.notes.find((n) => n.key === 'progress');
  assertEquals(note?.value, '50%');
});

Deno.test('updateTaskNote - updates existing note', () => {
  const bd = createNewBd('Test', 3);
  const updated = updateTaskNote(bd, 'mayor', 'context-usage', '75%');

  const task = findTaskById(updated, 'mayor');
  const note = task?.notes.find((n) => n.key === 'context-usage');
  assertEquals(note?.value, '75%');
});

Deno.test('addTask - adds task to Execution section', () => {
  const bd = createNewBd('Test', 3);
  const newTask: BdTask = {
    id: 'polecat-1',
    role: 'polecat',
    roleInstance: 1,
    description: 'Implement feature',
    status: '🔵',
    notes: [],
  };

  const updated = addTask(bd, 'Execution', newTask);
  const execSection = updated.sections.find((s) => s.name === 'Execution');
  assertEquals(execSection?.tasks.length, 1);
  assertEquals(execSection?.tasks[0].id, 'polecat-1');
});

Deno.test('getTaskDependencies - returns dependency list', () => {
  const bd = createNewBd('Test', 3);
  bd.sections[2].tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Task 1',
      status: '🟡',
      notes: [],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1, Polecat-2' }],
    },
  ];

  const deps = getTaskDependencies(bd, 'witness-1');
  assertEquals(deps, ['polecat-1', 'polecat-2']);
});

Deno.test('getReadyTasks - returns tasks with satisfied dependencies', () => {
  const bd = createNewBd('Test', 3);
  // Clear other sections to isolate the test
  bd.sections[0].tasks = [];
  bd.sections[1].tasks = [];
  bd.sections[2].tasks = [
    {
      id: 'polecat-1',
      role: 'polecat',
      roleInstance: 1,
      description: 'Task 1',
      status: '✅',
      notes: [],
    },
    {
      id: 'polecat-2',
      role: 'polecat',
      roleInstance: 2,
      description: 'Task 2',
      status: '🔵',
      notes: [],
    },
    {
      id: 'witness-1',
      role: 'witness',
      roleInstance: 1,
      description: 'Review',
      status: '🔵',
      notes: [{ key: 'depends', value: 'Polecat-1' }],
    },
  ];

  const ready = getReadyTasks(bd);
  assertEquals(ready.length, 2);
  assertEquals(ready.map((t) => t.id).sort(), ['polecat-2', 'witness-1']);
});

Deno.test('getActiveWorkerCount - counts active workers', () => {
  const bd = createNewBd('Test', 3);
  // Clear other sections to isolate the test
  bd.sections[0].tasks = [];
  bd.sections[1].tasks = [];
  bd.sections[2].tasks = [
    { id: 'polecat-1', role: 'polecat', roleInstance: 1, description: 'T1', status: '🟡', notes: [] },
    { id: 'polecat-2', role: 'polecat', roleInstance: 2, description: 'T2', status: '🔵', notes: [] },
    { id: 'witness-1', role: 'witness', roleInstance: 1, description: 'T3', status: '🟡', notes: [] },
  ];

  assertEquals(getActiveWorkerCount(bd), 2);
});

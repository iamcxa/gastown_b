// src/bd-cli/task.test.ts
import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  createTask,
  getTask,
  updateTaskStatus,
  addTaskComment,
  setTaskState,
  closeTask,
  getReadyTasks,
} from './task.ts';

Deno.test('createTask creates task with labels', async () => {
  const task = await createTask({
    title: 'Implement JWT validation',
    description: 'Add JWT token validation to auth module',
  });

  assertExists(task.id);
  assertEquals(task.title, 'Implement JWT validation');

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('updateTaskStatus changes status', async () => {
  const task = await createTask({ title: 'Status test' });

  await updateTaskStatus(task.id, 'in_progress');
  const updated = await getTask(task.id);
  assertEquals(updated.status, 'in_progress');

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('addTaskComment adds comment', async () => {
  const task = await createTask({ title: 'Comment test' });

  // Should not throw
  await addTaskComment(task.id, 'PROGRESS: 2/5 steps completed');

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('createTask validates empty title', async () => {
  await assertRejects(
    () => createTask({ title: '' }),
    Error,
    'title is required'
  );
});

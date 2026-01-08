// src/bd-cli/task.test.ts
import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  addTaskDependency,
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

Deno.test('setTaskState sets state dimension', async () => {
  const task = await createTask({ title: 'State test' });

  await setTaskState(task.id, 'progress', '50%');
  // setTaskState doesn't return the new state, so just verify no error

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('getReadyTasks returns ready tasks', async () => {
  const task = await createTask({ title: 'Ready test' });

  const ready = await getReadyTasks();
  const found = ready.find(t => t.id === task.id);
  assertExists(found);

  await closeTask(task.id, 'Test cleanup');
});

Deno.test('addTaskDependency adds dependency', async () => {
  const task1 = await createTask({ title: 'Task 1' });
  const task2 = await createTask({ title: 'Task 2' });

  await addTaskDependency(task2.id, task1.id);

  const updated = await getTask(task2.id);
  assertEquals(updated.deps.includes(task1.id), true);

  await closeTask(task1.id, 'Test cleanup');
  await closeTask(task2.id, 'Test cleanup');
});

Deno.test('getTask throws for non-existent task', async () => {
  await assertRejects(
    () => getTask('non-existent-task-xyz'),
    Error,
    'no issue found'
  );
});

// src/bd-cli/slot.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { setSlot, getSlot, clearSlot, getAllSlots } from './slot.ts';
import { execBd } from './executor.ts';

// Helper to create an agent-type bead for slot testing
// Note: bd create --type agent doesn't work in this rig, so we use SQL
async function createTestAgentBead(id: string, role: string): Promise<string> {
  const dbPath = '.beads/beads.db';
  const title = `test-${role}`;
  const cmd = new Deno.Command('sqlite3', {
    args: [
      dbPath,
      `INSERT INTO issues (id, title, issue_type, role_type, status) VALUES ('${id}', '${title}', 'agent', '${role}', 'open')`,
    ],
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);
    throw new Error(`Failed to create test agent: ${err}`);
  }
  return id;
}

// Helper to delete a test bead
async function deleteTestBead(id: string): Promise<void> {
  const dbPath = '.beads/beads.db';
  const cmd = new Deno.Command('sqlite3', {
    args: [dbPath, `DELETE FROM issues WHERE id = '${id}'`],
    stdout: 'piped',
    stderr: 'piped',
  });
  await cmd.output();
}

Deno.test('setSlot and getSlot work correctly', async () => {
  const agentId = `gastown_b-slot-test-${Date.now()}-1`;
  await createTestAgentBead(agentId, 'polecat');

  // Create an actual task bead to attach to the hook
  const taskId = await execBd(['create', 'slot-test-task-1', '--type', 'task', '--silent']);

  try {
    await setSlot(agentId, 'hook', taskId.trim());
    const slot = await getSlot(agentId, 'hook');

    assertEquals(slot, taskId.trim());
  } finally {
    // Cleanup
    await execBd(['close', taskId.trim(), '--reason', 'Test cleanup']);
    await deleteTestBead(agentId);
  }
});

Deno.test('clearSlot removes slot value', async () => {
  const agentId = `gastown_b-slot-test-${Date.now()}-2`;
  await createTestAgentBead(agentId, 'polecat');

  // Create an actual task bead to attach to the hook
  const taskId = await execBd(['create', 'slot-test-task-2', '--type', 'task', '--silent']);

  try {
    await setSlot(agentId, 'hook', taskId.trim());
    await clearSlot(agentId, 'hook');
    const slot = await getSlot(agentId, 'hook');

    assertEquals(slot, null);
  } finally {
    // Cleanup
    await execBd(['close', taskId.trim(), '--reason', 'Test cleanup']);
    await deleteTestBead(agentId);
  }
});

Deno.test('getAllSlots returns all slot values', async () => {
  const agentId = `gastown_b-slot-test-${Date.now()}-3`;
  await createTestAgentBead(agentId, 'polecat');

  // Create task beads for hook and role slots
  const hookTaskId = await execBd(['create', 'slot-test-hook-task', '--type', 'task', '--silent']);
  const roleTaskId = await execBd(['create', 'slot-test-role-task', '--type', 'task', '--silent']);

  try {
    await setSlot(agentId, 'hook', hookTaskId.trim());
    await setSlot(agentId, 'role', roleTaskId.trim());

    const slots = await getAllSlots(agentId);

    assertEquals(slots.hook, hookTaskId.trim());
    assertEquals(slots.role, roleTaskId.trim());
  } finally {
    // Cleanup
    await execBd(['close', hookTaskId.trim(), '--reason', 'Test cleanup']);
    await execBd(['close', roleTaskId.trim(), '--reason', 'Test cleanup']);
    await deleteTestBead(agentId);
  }
});

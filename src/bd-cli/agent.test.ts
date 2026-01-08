// src/bd-cli/agent.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  createAgentBead,
  setAgentState,
  getAgentState,
  updateHeartbeat,
} from './agent.ts';
import { execBd } from './executor.ts';

Deno.test('createAgentBead creates agent with role', async () => {
  const agent = await createAgentBead({
    role: 'polecat',
  });

  assertExists(agent.id);
  assertEquals(agent.role, 'polecat');

  // Cleanup
  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

Deno.test('setAgentState and getAgentState work correctly', async () => {
  const agent = await createAgentBead({ role: 'polecat' });

  await setAgentState(agent.id, 'working');
  const state = await getAgentState(agent.id);
  assertEquals(state, 'working');

  await setAgentState(agent.id, 'done');
  const state2 = await getAgentState(agent.id);
  assertEquals(state2, 'done');

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

Deno.test('updateHeartbeat updates timestamp', async () => {
  const agent = await createAgentBead({ role: 'witness' });

  // Should not throw
  await updateHeartbeat(agent.id);

  await execBd(['close', agent.id, '--reason', 'Test cleanup']);
});

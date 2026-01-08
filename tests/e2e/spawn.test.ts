import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { startConvoyWithBd } from '../../src/cli/commands.ts';
import { spawnAgent } from '../../src/spawn/mod.ts';
import { killSession, sessionExists } from '../../src/tmux/operations.ts';
import { getAgentState } from '../../src/bd-cli/agent.ts';
import { closeConvoy, execBd } from '../../src/bd-cli/mod.ts';

Deno.test({
  name: 'E2E: spawn agent within convoy',
  async fn() {
    // 1. Start a convoy (no dryRun - we need actual tmux session for spawning)
    const state = await startConvoyWithBd('Spawn test convoy');

    assertExists(state.convoyId);

    // Set env vars that spawn expects
    Deno.env.set('GASTOWN_BD', state.convoyId);
    Deno.env.set('GASTOWN_CONVOY', state.tmuxSession);

    try {
      // 2. Spawn a planner agent
      const result = await spawnAgent({
        role: 'planner',
        task: 'Test planning task',
      });

      assertExists(result.agentId);
      assertEquals(result.convoyId, state.convoyId);
      assertEquals(result.role, 'planner');

      // 3. Verify agent state is running
      const agentState = await getAgentState(result.agentId);
      assertEquals(agentState, 'running');

      // 4. Cleanup spawned agent
      await execBd(['close', result.agentId, '--reason', 'Test cleanup']);
    } finally {
      // 5. Cleanup convoy
      await closeConvoy(state.convoyId, 'Test cleanup');

      // Clean env
      Deno.env.delete('GASTOWN_BD');
      Deno.env.delete('GASTOWN_CONVOY');

      // Kill tmux session if exists
      if (await sessionExists(state.tmuxSession)) {
        await killSession(state.tmuxSession);
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

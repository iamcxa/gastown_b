// tests/e2e/convoy.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  startConvoyWithBd,
  stopConvoyWithBd,
  showStatusWithBd,
} from '../../src/cli/commands.ts';
import { closeConvoy, getConvoy } from '../../src/bd-cli/mod.ts';

Deno.test({
  name: 'E2E: Full convoy lifecycle',
  async fn() {
    // 1. Start convoy (dry run)
    const state = await startConvoyWithBd('E2E Test Convoy', {
      dryRun: true,
      maxWorkers: 2,
    });

    assertExists(state.convoyId);
    assertExists(state.mayorId);
    assertEquals(state.mode, 'mayor');

    // 2. Check status (no error = success)
    await showStatusWithBd(state.convoyId);

    // 3. Verify convoy exists in bd
    const convoy = await getConvoy(state.convoyId);
    assertEquals(convoy.title, 'E2E Test Convoy');

    // 4. Stop convoy
    await stopConvoyWithBd(state.convoyId, { dryRun: false });

    // 5. Verify convoy is closed
    const closedConvoy = await getConvoy(state.convoyId);
    assertEquals(closedConvoy.status, 'closed');

    console.log('E2E test passed!');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'E2E: Prime mode convoy',
  async fn() {
    // 1. Start prime mode convoy
    const state = await startConvoyWithBd('E2E Prime Mode Test', {
      dryRun: true,
      primeMode: true,
    });

    assertExists(state.convoyId);
    assertEquals(state.mode, 'prime');

    // 2. Verify convoy has prime label
    const convoy = await getConvoy(state.convoyId);
    assertEquals(convoy.labels.includes('mode:prime'), true);

    // 3. Cleanup
    await closeConvoy(state.convoyId, 'E2E test cleanup');

    console.log('E2E prime mode test passed!');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: 'E2E: Respawn check workflow',
  async fn() {
    // Test the respawn check pure function
    const { shouldRespawn } = await import('../../src/respawn/mod.ts');

    // Below threshold
    const low = shouldRespawn({ contextUsage: 50, threshold: 80 });
    assertEquals(low.shouldRespawn, false);

    // Above threshold
    const high = shouldRespawn({ contextUsage: 85, threshold: 80 });
    assertEquals(high.shouldRespawn, true);
    assertEquals(high.reason, 'context_threshold');

    // Exact threshold (should not respawn)
    const exact = shouldRespawn({ contextUsage: 80, threshold: 80 });
    assertEquals(exact.shouldRespawn, false);

    console.log('E2E respawn check test passed!');
  },
});

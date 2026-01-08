import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  startConvoyWithBd,
  resumeConvoyWithBd,
  showStatusWithBd,
  stopConvoyWithBd,
} from './commands.ts';
import { closeConvoy, getConvoy } from '../bd-cli/mod.ts';

// Note: These tests require bd to be initialized
// Run `bd init` in a test directory first

Deno.test('resumeConvoyWithBd resumes from convoy ID', async () => {
  // Create a convoy first
  const state = await startConvoyWithBd('Resume test', { dryRun: true });

  // Resume it
  const resumed = await resumeConvoyWithBd(state.convoyId, { dryRun: true });

  assertEquals(resumed.convoyId, state.convoyId);
  assertEquals(resumed.mayorId, state.mayorId);

  // Cleanup
  await closeConvoy(state.convoyId, 'Test cleanup');
});

Deno.test('resumeConvoyWithBd throws on invalid convoy ID', async () => {
  await assertRejects(
    () => resumeConvoyWithBd('invalid-convoy-xyz', { dryRun: true }),
    Error
  );
});

Deno.test('resumeConvoyWithBd validates convoy ID parameter', async () => {
  await assertRejects(
    () => resumeConvoyWithBd('', { dryRun: true }),
    Error,
    'Convoy ID is required'
  );

  await assertRejects(
    () => resumeConvoyWithBd('   ', { dryRun: true }),
    Error,
    'Convoy ID is required'
  );
});

Deno.test('resumeConvoyWithBd restores mode from labels', async () => {
  // Create a prime mode convoy
  const state = await startConvoyWithBd('Prime mode test', {
    dryRun: true,
    primeMode: true,
  });

  assertEquals(state.mode, 'prime');

  // Resume it and verify mode is restored
  const resumed = await resumeConvoyWithBd(state.convoyId, { dryRun: true });

  assertEquals(resumed.mode, 'prime');

  // Cleanup
  await closeConvoy(state.convoyId, 'Test cleanup');
});

Deno.test('startConvoyWithBd validates task parameter', async () => {
  await assertRejects(
    () => startConvoyWithBd('', { dryRun: true }),
    Error,
    'Task description is required'
  );

  await assertRejects(
    () => startConvoyWithBd('   ', { dryRun: true }),
    Error,
    'Task description is required'
  );
});

Deno.test('showStatusWithBd displays convoy info', async () => {
  const state = await startConvoyWithBd('Status test', { dryRun: true });

  // This just verifies no error - output goes to console
  await showStatusWithBd(state.convoyId);

  // Cleanup
  await closeConvoy(state.convoyId, 'Test cleanup');
});

Deno.test('showStatusWithBd lists all convoys when no ID provided', async () => {
  // This just verifies no error - output goes to console
  await showStatusWithBd();
});

Deno.test('stopConvoyWithBd stops convoy and updates state', async () => {
  const state = await startConvoyWithBd('Stop test', { dryRun: true });

  // dryRun: false to actually close the convoy
  await stopConvoyWithBd(state.convoyId, { dryRun: false });

  const convoy = await getConvoy(state.convoyId);
  assertEquals(convoy.status, 'closed');
});

Deno.test('stopConvoyWithBd dryRun does not close convoy', async () => {
  const state = await startConvoyWithBd('DryRun stop test', { dryRun: true });

  // dryRun should not actually close the convoy
  await stopConvoyWithBd(state.convoyId, { dryRun: true });

  const convoy = await getConvoy(state.convoyId);
  assertEquals(convoy.status, 'open'); // Still open

  // Cleanup
  await closeConvoy(state.convoyId, 'Test cleanup');
});

Deno.test('stopConvoyWithBd handles all convoys when no ID provided', async () => {
  // This just verifies no error
  await stopConvoyWithBd(undefined, { dryRun: true });
});

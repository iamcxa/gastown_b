// src/respawn/check.test.ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  shouldRespawn,
  recordCheckpoint,
  REASON_CONTEXT_THRESHOLD,
  type RespawnDecision,
} from './check.ts';

Deno.test('shouldRespawn returns false when context below threshold', () => {
  const decision = shouldRespawn({
    contextUsage: 50,
    threshold: 80,
  });

  assertEquals(decision.shouldRespawn, false);
});

Deno.test('shouldRespawn returns true when context above threshold', () => {
  const decision = shouldRespawn({
    contextUsage: 85,
    threshold: 80,
  });

  assertEquals(decision.shouldRespawn, true);
  assertEquals(decision.reason, REASON_CONTEXT_THRESHOLD);
});

Deno.test('shouldRespawn returns false when context equals threshold (edge case)', () => {
  const decision = shouldRespawn({
    contextUsage: 80,
    threshold: 80,
  });

  assertEquals(decision.shouldRespawn, false);
  assertEquals(decision.reason, undefined);
  assertEquals(decision.contextUsage, 80);
});

Deno.test('shouldRespawn throws on negative contextUsage', () => {
  assertThrows(
    () => shouldRespawn({ contextUsage: -1, threshold: 80 }),
    Error,
    'Invalid contextUsage'
  );
});

Deno.test('shouldRespawn throws on negative threshold', () => {
  assertThrows(
    () => shouldRespawn({ contextUsage: 50, threshold: -10 }),
    Error,
    'Invalid threshold'
  );
});

Deno.test('shouldRespawn throws on NaN contextUsage', () => {
  assertThrows(
    () => shouldRespawn({ contextUsage: NaN, threshold: 80 }),
    Error,
    'Invalid contextUsage'
  );
});

Deno.test('shouldRespawn throws on NaN threshold', () => {
  assertThrows(
    () => shouldRespawn({ contextUsage: 50, threshold: NaN }),
    Error,
    'Invalid threshold'
  );
});

// Stub test for recordCheckpoint - full integration would require mocks
Deno.test('recordCheckpoint is a function', () => {
  // Verify the function exists and is callable
  assertEquals(typeof recordCheckpoint, 'function');
});

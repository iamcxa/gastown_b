// src/bd-cli/convoy.test.ts
import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createConvoy, getConvoy, closeConvoy, listConvoys, type ConvoyInfo } from './convoy.ts';

// Note: These tests require bd to be initialized
// Run `bd init` in a test directory first

Deno.test('createConvoy creates epic and returns convoy info', async () => {
  const convoy = await createConvoy({
    title: 'Test Convoy',
    description: 'A test convoy for unit testing',
    maxWorkers: 3,
  });

  assertExists(convoy.id);
  assertEquals(convoy.title, 'Test Convoy');
  assertEquals(typeof convoy.id, 'string');

  // Cleanup
  await closeConvoy(convoy.id, 'Test cleanup');
});

Deno.test('getConvoy retrieves convoy details', async () => {
  const created = await createConvoy({
    title: 'Retrieve Test',
    description: 'Testing retrieval',
  });

  const fetched = await getConvoy(created.id);
  assertEquals(fetched.id, created.id);
  assertEquals(fetched.title, created.title);

  await closeConvoy(created.id, 'Test cleanup');
});

Deno.test('listConvoys lists convoys with status filter', async () => {
  const convoy = await createConvoy({
    title: 'List Test Convoy',
  });

  const openConvoys = await listConvoys('open');
  const found = openConvoys.find(c => c.id === convoy.id);
  assertExists(found);

  await closeConvoy(convoy.id, 'Test cleanup');
});

Deno.test('getConvoy throws for non-existent convoy', async () => {
  await assertRejects(
    () => getConvoy('non-existent-id-xyz'),
    Error
  );
});

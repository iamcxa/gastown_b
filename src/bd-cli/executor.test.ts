// src/bd-cli/executor.test.ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { execBd, execBdJson } from './executor.ts';

Deno.test('execBd runs bd command and returns stdout', async () => {
  const result = await execBd(['--version']);
  assertEquals(typeof result, 'string');
  assertEquals(result.includes('bd'), true);
});

Deno.test('execBdJson parses JSON output', async () => {
  const result = await execBdJson(['stats']);
  assertEquals(typeof result, 'object');
});

Deno.test('execBd throws on invalid command', async () => {
  await assertRejects(
    () => execBd(['invalid-command-xyz']),
    Error,
    'bd command failed'
  );
});

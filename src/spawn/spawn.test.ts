import { assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { spawnAgent } from './spawn.ts';

Deno.test('spawnAgent throws without convoy context', async () => {
  // Clear environment
  const originalBd = Deno.env.get('GASTOWN_BD');
  const originalConvoy = Deno.env.get('GASTOWN_CONVOY');
  Deno.env.delete('GASTOWN_BD');
  Deno.env.delete('GASTOWN_CONVOY');

  await assertRejects(
    async () => {
      await spawnAgent({
        role: 'planner',
        task: 'Test task',
      });
    },
    Error,
    'Missing convoy ID'
  );

  // Restore environment
  if (originalBd) Deno.env.set('GASTOWN_BD', originalBd);
  if (originalConvoy) Deno.env.set('GASTOWN_CONVOY', originalConvoy);
});

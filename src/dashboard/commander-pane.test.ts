// src/dashboard/commander-pane.test.ts
import { assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { generateCommanderScriptContent } from './commander-pane.ts';

Deno.test('generateCommanderScriptContent returns bash script', () => {
  const script = generateCommanderScriptContent('/path/to/gastown');
  assertStringIncludes(script, '#!/bin/bash');
  assertStringIncludes(script, 'COMMANDER');
});

Deno.test('generateCommanderScriptContent includes gastown path', () => {
  const script = generateCommanderScriptContent('/usr/local/bin/gastown');
  assertStringIncludes(script, '/usr/local/bin/gastown');
});

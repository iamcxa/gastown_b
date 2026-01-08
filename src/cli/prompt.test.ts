/**
 * Tests for the interactive prompt utilities.
 */

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { formatConvoyList, parseSelection } from './prompt.ts';
import type { ConvoyMatch } from './duplicate-check.ts';

const mockMatches: ConvoyMatch[] = [
  { id: 'carlove-5v2', title: 'SC-274 task', status: 'open', isRunning: true, issueId: 'SC-274' },
  { id: 'carlove-zwu', title: 'SC-274 task', status: 'open', isRunning: false, issueId: 'SC-274' },
];

Deno.test('formatConvoyList - formats matches correctly', () => {
  const result = formatConvoyList(mockMatches);
  assertStringIncludes(result, 'carlove-5v2');
  assertStringIncludes(result, '(running)');
  assertStringIncludes(result, 'carlove-zwu');
  assertStringIncludes(result, '(stopped)');
  assertStringIncludes(result, '創建新的 convoy');
  assertStringIncludes(result, '取消');
});

Deno.test('parseSelection - returns resume for valid convoy number', () => {
  const result = parseSelection('1', 2);
  assertEquals(result?.action, 'resume');
});

Deno.test('parseSelection - returns create for create option', () => {
  const result = parseSelection('3', 2);
  assertEquals(result, { action: 'create' });
});

Deno.test('parseSelection - returns cancel for cancel option', () => {
  const result = parseSelection('4', 2);
  assertEquals(result, { action: 'cancel' });
});

Deno.test('parseSelection - returns null for invalid input', () => {
  assertEquals(parseSelection('abc', 2), null);
  assertEquals(parseSelection('0', 2), null);
  assertEquals(parseSelection('5', 2), null);
});

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractIssueIds, findDuplicateConvoys } from './duplicate-check.ts';

Deno.test('extractIssueIds - extracts single issue ID', () => {
  const result = extractIssueIds('Implement SC-274');
  assertEquals(result, ['SC-274']);
});

Deno.test('extractIssueIds - extracts multiple issue IDs', () => {
  const result = extractIssueIds('Fix SC-274 and REC-123');
  assertEquals(result, ['SC-274', 'REC-123']);
});

Deno.test('extractIssueIds - returns empty array when no ID', () => {
  const result = extractIssueIds('Implement user authentication');
  assertEquals(result, []);
});

Deno.test('extractIssueIds - handles ID in middle of text', () => {
  const result = extractIssueIds('請實作 SC-274 的功能');
  assertEquals(result, ['SC-274']);
});

Deno.test('extractIssueIds - deduplicates repeated IDs', () => {
  const result = extractIssueIds('SC-274 is related to SC-274');
  assertEquals(result, ['SC-274']);
});

Deno.test('findDuplicateConvoys - returns empty when no matches', async () => {
  // This test requires mocking or will call real bd CLI
  // For now, test the filtering logic with mock data
  const result = await findDuplicateConvoys(['NONEXISTENT-999']);
  assertEquals(result, []);
});

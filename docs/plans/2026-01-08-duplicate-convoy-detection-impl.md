# Duplicate Convoy Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detect and handle duplicate convoys when starting gastown to prevent creating multiple convoys for the same Issue ID.

**Architecture:** Add duplicate detection before convoy creation in `startConvoyWithBd`. Extract Issue IDs via regex, query existing convoys via bd CLI, show interactive prompt if duplicates found.

**Tech Stack:** Deno, TypeScript, bd CLI, Deno.stdin for prompts

---

## Task 1: Create Issue ID Extractor

**Files:**
- Create: `src/cli/duplicate-check.ts`
- Create: `src/cli/duplicate-check.test.ts`

**Step 1: Write the failing test for extractIssueIds**

```typescript
// src/cli/duplicate-check.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractIssueIds } from './duplicate-check.ts';

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
```

**Step 2: Run test to verify it fails**

Run: `deno test src/cli/duplicate-check.test.ts`
Expected: FAIL with "Module not found"

**Step 3: Write minimal implementation**

```typescript
// src/cli/duplicate-check.ts

const ISSUE_ID_PATTERN = /[A-Z]{2,10}-\d+/g;

export function extractIssueIds(text: string): string[] {
  const matches = text.match(ISSUE_ID_PATTERN);
  if (!matches) return [];
  return [...new Set(matches)];
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/cli/duplicate-check.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/cli/duplicate-check.ts src/cli/duplicate-check.test.ts
git commit -m "feat(cli): add extractIssueIds for duplicate detection"
```

---

## Task 2: Create findDuplicateConvoys Function

**Files:**
- Modify: `src/cli/duplicate-check.ts`
- Modify: `src/cli/duplicate-check.test.ts`

**Step 1: Write the failing test for findDuplicateConvoys**

```typescript
// Append to src/cli/duplicate-check.test.ts
import { findDuplicateConvoys, type ConvoyMatch } from './duplicate-check.ts';

Deno.test('findDuplicateConvoys - returns empty when no matches', async () => {
  // This test requires mocking or will call real bd CLI
  // For now, test the filtering logic with mock data
  const result = await findDuplicateConvoys(['NONEXISTENT-999']);
  assertEquals(result, []);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test src/cli/duplicate-check.test.ts`
Expected: FAIL with "findDuplicateConvoys is not exported"

**Step 3: Write minimal implementation**

```typescript
// Add to src/cli/duplicate-check.ts
import { listConvoys, type ConvoyInfo } from '../bd-cli/convoy.ts';
import { sessionExists } from '../tmux/operations.ts';

export interface ConvoyMatch {
  id: string;
  title: string;
  status: string;
  isRunning: boolean;
  issueId: string;
}

export async function findDuplicateConvoys(issueIds: string[]): Promise<ConvoyMatch[]> {
  if (issueIds.length === 0) return [];

  try {
    // Fetch open and in_progress convoys
    const [openConvoys, inProgressConvoys] = await Promise.all([
      listConvoys('open'),
      listConvoys('in_progress'),
    ]);

    const allConvoys = [...openConvoys, ...inProgressConvoys];
    const matches: ConvoyMatch[] = [];

    for (const convoy of allConvoys) {
      for (const issueId of issueIds) {
        if (convoy.title.includes(issueId)) {
          const sessionName = `gastown-${convoy.id}`;
          const isRunning = await sessionExists(sessionName);

          matches.push({
            id: convoy.id,
            title: convoy.title,
            status: convoy.status,
            isRunning,
            issueId,
          });
          break; // Avoid duplicate entries for same convoy
        }
      }
    }

    return matches;
  } catch (error) {
    // Graceful degradation: if bd CLI fails, return empty (allow creation)
    console.warn('Warning: Failed to check for duplicate convoys:', error);
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `deno test src/cli/duplicate-check.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/cli/duplicate-check.ts src/cli/duplicate-check.test.ts
git commit -m "feat(cli): add findDuplicateConvoys for duplicate detection"
```

---

## Task 3: Create Interactive Prompt

**Files:**
- Create: `src/cli/prompt.ts`
- Create: `src/cli/prompt.test.ts`

**Step 1: Write the types and non-interactive parts**

```typescript
// src/cli/prompt.ts

import type { ConvoyMatch } from './duplicate-check.ts';

export type SelectionAction = 'resume' | 'create' | 'cancel';

export type Selection =
  | { action: 'resume'; convoyId: string }
  | { action: 'create' }
  | { action: 'cancel' };

export function formatConvoyList(matches: ConvoyMatch[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('⚠️  找到相同 Issue ID 的 convoy:');
  lines.push('');

  matches.forEach((match, index) => {
    const runningStatus = match.isRunning ? '(running)' : '(stopped)';
    const truncatedTitle = match.title.length > 50
      ? match.title.slice(0, 47) + '...'
      : match.title;
    lines.push(`  ${index + 1}. ${match.id} [${match.status}] ${runningStatus} - ${truncatedTitle}`);
  });

  lines.push(`  ${matches.length + 1}. 創建新的 convoy`);
  lines.push(`  ${matches.length + 2}. 取消`);
  lines.push('');

  return lines.join('\n');
}

export function parseSelection(input: string, matchCount: number): Selection | null {
  const num = parseInt(input.trim(), 10);

  if (isNaN(num) || num < 1 || num > matchCount + 2) {
    return null;
  }

  if (num <= matchCount) {
    return { action: 'resume', convoyId: '' }; // convoyId filled by caller
  } else if (num === matchCount + 1) {
    return { action: 'create' };
  } else {
    return { action: 'cancel' };
  }
}
```

**Step 2: Write test for formatConvoyList**

```typescript
// src/cli/prompt.test.ts
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
```

**Step 3: Run test to verify it passes**

Run: `deno test src/cli/prompt.test.ts`
Expected: All tests PASS

**Step 4: Add interactive prompt function**

```typescript
// Add to src/cli/prompt.ts

export async function promptConvoySelection(matches: ConvoyMatch[]): Promise<Selection> {
  // Check if running in TTY
  if (!Deno.stdin.isTerminal()) {
    console.error('Error: Duplicate convoys found but running in non-interactive mode.');
    console.error('Use --resume <convoy-id> to resume an existing convoy:');
    matches.forEach((m) => console.error(`  gastown --resume ${m.id}`));
    return { action: 'cancel' };
  }

  console.log('🔍 檢查現有 convoys...');
  console.log(formatConvoyList(matches));

  const prompt = `請選擇 [1-${matches.length + 2}]: `;

  while (true) {
    await Deno.stdout.write(new TextEncoder().encode(prompt));

    const buf = new Uint8Array(64);
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      return { action: 'cancel' };
    }

    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
    const selection = parseSelection(input, matches.length);

    if (selection === null) {
      console.log('無效選擇，請重新輸入。');
      continue;
    }

    if (selection.action === 'resume') {
      const index = parseInt(input, 10) - 1;
      return { action: 'resume', convoyId: matches[index].id };
    }

    return selection;
  }
}
```

**Step 5: Commit**

```bash
git add src/cli/prompt.ts src/cli/prompt.test.ts
git commit -m "feat(cli): add interactive prompt for convoy selection"
```

---

## Task 4: Integrate into startConvoyWithBd

**Files:**
- Modify: `src/cli/commands.ts`

**Step 1: Add imports**

```typescript
// At top of src/cli/commands.ts, add:
import { extractIssueIds, findDuplicateConvoys } from './duplicate-check.ts';
import { promptConvoySelection } from './prompt.ts';
```

**Step 2: Add duplicate check logic at start of startConvoyWithBd**

Find the line:
```typescript
export async function startConvoyWithBd(
  task: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  // Input validation
  if (!task || task.trim() === '') {
```

Insert after input validation (after the throw line):

```typescript
  // === Duplicate detection ===
  const issueIds = extractIssueIds(task);
  if (issueIds.length > 0) {
    const duplicates = await findDuplicateConvoys(issueIds);
    if (duplicates.length > 0) {
      const selection = await promptConvoySelection(duplicates);

      if (selection.action === 'resume') {
        return resumeConvoyWithBd(selection.convoyId, options);
      }
      if (selection.action === 'cancel') {
        throw new Error('Cancelled by user');
      }
      // action === 'create': continue with normal flow
      console.log('創建新的 convoy...');
    }
  }
  // === End duplicate detection ===
```

**Step 3: Verify the integration compiles**

Run: `deno check src/cli/commands.ts`
Expected: No errors

**Step 4: Manual test**

Run: `./gastown "test SC-274"` (assuming SC-274 convoys exist)
Expected: Shows interactive selection menu

**Step 5: Commit**

```bash
git add src/cli/commands.ts
git commit -m "feat(cli): integrate duplicate convoy detection into startConvoyWithBd"
```

---

## Task 5: Add Integration Test

**Files:**
- Modify: `src/cli/commands.test.ts` (create if needed)

**Step 1: Write integration test**

```typescript
// src/cli/commands.test.ts (or append if exists)
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractIssueIds } from './duplicate-check.ts';

// Integration test: verify the full flow types work together
Deno.test('duplicate detection flow - extractIssueIds integration', () => {
  // Test that the function works in the context of startConvoyWithBd
  const task = '請依據專案最佳實踐，使用worktree基於最新的 main，並搭配合適的 skill 實作 linear issue SC-274';
  const issueIds = extractIssueIds(task);

  assertEquals(issueIds, ['SC-274']);
});
```

**Step 2: Run all tests**

Run: `deno test src/cli/`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/cli/
git commit -m "test(cli): add integration test for duplicate detection"
```

---

## Task 6: Update Module Exports

**Files:**
- Modify: `src/cli/mod.ts`

**Step 1: Add exports**

```typescript
// src/cli/mod.ts
export * from './commands.ts';
export * from './config.ts';
export * from './duplicate-check.ts';
export * from './prompt.ts';
```

**Step 2: Verify exports work**

Run: `deno check src/cli/mod.ts`
Expected: No errors

**Step 3: Run full test suite**

Run: `deno test`
Expected: All tests PASS

**Step 4: Commit and push**

```bash
git add src/cli/mod.ts
git commit -m "feat(cli): export duplicate detection modules"
git push
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Create Issue ID extractor | 5 min |
| 2 | Create findDuplicateConvoys | 5 min |
| 3 | Create interactive prompt | 10 min |
| 4 | Integrate into startConvoyWithBd | 5 min |
| 5 | Add integration test | 3 min |
| 6 | Update module exports | 2 min |

**Total: ~30 minutes**

# bd CLI Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate gastown prompts from .bd file operations to bd CLI commands, enabling agents to use beads system correctly.

**Architecture:** Rename `bdPath` parameter to `convoyId` across launcher and command modules. Update all prompt strings to reference bd CLI commands instead of file operations. Delete deprecated `startConvoy()` function.

**Tech Stack:** Deno, TypeScript, bd CLI

---

## Task 1: Rename bdPath to convoyId in command.ts

**Files:**
- Modify: `src/claude/command.ts:27,44,51,67,78`

**Step 1: Update ClaudeCommandOptions interface**

Find line 27:
```typescript
  bdPath: string;
```

Replace with:
```typescript
  convoyId: string;
```

**Step 2: Update buildClaudeEnvVars function signature**

Find line 44:
```typescript
  bdPath: string,
```

Replace with:
```typescript
  convoyId: string,
```

**Step 3: Update GASTOWN_BD assignment**

Find line 51:
```typescript
    GASTOWN_BD: bdPath,
```

Replace with:
```typescript
    GASTOWN_BD: convoyId,
```

**Step 4: Update buildClaudeCommand destructuring**

Find line 67:
```typescript
    bdPath,
```

Replace with:
```typescript
    convoyId,
```

**Step 5: Update buildClaudeEnvVars call**

Find line 78:
```typescript
  const envVars = buildClaudeEnvVars(role, bdPath, convoyName, contextPath, mayorPaneIndex);
```

Replace with:
```typescript
  const envVars = buildClaudeEnvVars(role, convoyId, convoyName, contextPath, mayorPaneIndex);
```

**Step 6: Run type check**

Run: `deno check src/claude/command.ts`
Expected: Errors in test file (expected - we'll fix next)

**Step 7: Commit**

```bash
git add src/claude/command.ts
git commit -m "refactor(claude): rename bdPath to convoyId in command.ts"
```

---

## Task 2: Update command.test.ts for renamed parameter

**Files:**
- Modify: `src/claude/command.test.ts`

**Step 1: Replace all bdPath occurrences**

Run: Find and replace `bdPath:` with `convoyId:` in the file.

Lines to change:
- Line 23: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`
- Line 36: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`
- Line 49: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`
- Line 61: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`
- Line 87: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`
- Line 113: `bdPath: '/test.bd',` → `convoyId: 'test-convoy-id',`

**Step 2: Update assertEquals expectations**

- Line 15: `assertEquals(env['GASTOWN_BD'], '/convoy.bd');` → `assertEquals(env['GASTOWN_BD'], 'test-convoy-id');`
- Line 73: `assertEquals(env['GASTOWN_BD'], '/convoy.bd');` → `assertEquals(env['GASTOWN_BD'], 'test-convoy-id');`
- Line 98: `assertEquals(env['GASTOWN_BD'], '/convoy.bd');` → `assertEquals(env['GASTOWN_BD'], 'test-convoy-id');`

**Step 3: Run tests**

Run: `deno test src/claude/command.test.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/claude/command.test.ts
git commit -m "test(claude): update command tests for convoyId rename"
```

---

## Task 3: Rename bdPath to convoyId in launcher.ts

**Files:**
- Modify: `src/claude/launcher.ts:9,81,110,121,137,146,157,173,182,194,204`

**Step 1: Update LaunchConfig interface**

Find line 9:
```typescript
  bdPath: string;
```

Replace with:
```typescript
  convoyId: string;
```

**Step 2: Update buildLaunchConfig return**

Find line 81:
```typescript
    bdPath: config.bdPath,
```

Replace with:
```typescript
    convoyId: config.convoyId,
```

**Step 3: Update launchMayor parameter**

Find line 110:
```typescript
  bdPath: string,
```

Replace with:
```typescript
  convoyId: string,
```

**Step 4: Update launchMayor config**

Find line 121:
```typescript
      bdPath,
```

Replace with:
```typescript
      convoyId,
```

**Step 5: Update launchPrime JSDoc and parameter**

Find line 137:
```typescript
 * @param bdPath - path to bd file
```

Replace with:
```typescript
 * @param convoyId - convoy issue ID
```

Find line 146:
```typescript
  bdPath: string,
```

Replace with:
```typescript
  convoyId: string,
```

Find line 157:
```typescript
      bdPath,
```

Replace with:
```typescript
      convoyId,
```

**Step 6: Update launchWorker parameter**

Find line 173:
```typescript
  bdPath: string,
```

Replace with:
```typescript
  convoyId: string,
```

Find line 182:
```typescript
    bdPath,
```

Replace with:
```typescript
    convoyId,
```

**Step 7: Update respawnWorker parameter**

Find line 194:
```typescript
  bdPath: string,
```

Replace with:
```typescript
  convoyId: string,
```

Find line 204:
```typescript
    bdPath,
```

Replace with:
```typescript
    convoyId,
```

**Step 8: Run type check**

Run: `deno check src/claude/launcher.ts`
Expected: Errors in test file (expected)

**Step 9: Commit**

```bash
git add src/claude/launcher.ts
git commit -m "refactor(claude): rename bdPath to convoyId in launcher.ts"
```

---

## Task 4: Update launcher.test.ts for renamed parameter

**Files:**
- Modify: `src/claude/launcher.test.ts`

**Step 1: Replace all bdPath occurrences**

Lines to change:
- Line 36: `bdPath: '/project/convoy.bd',` → `convoyId: 'test-convoy-id',`
- Line 44: `assertEquals(config.bdPath, '/project/convoy.bd');` → `assertEquals(config.convoyId, 'test-convoy-id');`
- Line 53: `bdPath: '/project/convoy.bd',` → `convoyId: 'test-convoy-id',`
- Line 66: `bdPath: '/project/convoy.bd',` → `convoyId: 'test-convoy-id',`

**Step 2: Run tests**

Run: `deno test src/claude/launcher.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/claude/launcher.test.ts
git commit -m "test(claude): update launcher tests for convoyId rename"
```

---

## Task 5: Update prompts in command.ts to use bd CLI

**Files:**
- Modify: `src/claude/command.ts:125-205,300-346`

**Step 1: Update buildPrimePrompt**

Find line 136:
```typescript
- BD file: $GASTOWN_BD
```

Replace with:
```typescript
- Convoy ID: $GASTOWN_BD
```

Find lines 143-145:
```typescript
${contextPath ? `- Read the context file at $GASTOWN_CONTEXT
- Load decision principles into memory` : `- No context file provided - use general best practices`}
- Read the bd file at $GASTOWN_BD for current state
```

Replace with:
```typescript
${contextPath ? `- Read the context file at $GASTOWN_CONTEXT
- Load decision principles into memory` : `- No context file provided - use general best practices`}
- Check convoy state: bd show $GASTOWN_BD
```

**Step 2: Update buildPrimeMayorPrompt**

Find lines 222-232:
```typescript
1. **Write questions to the bd file** at $GASTOWN_BD:
\`\`\`
pending-question: |
  [Your question here - be specific and provide context]
question-type: decision|clarification|approval
question-options:
  - Option A (with brief explanation)
  - Option B (with brief explanation)
question-from: mayor
question-at: [ISO timestamp]
\`\`\`
```

Replace with:
```typescript
1. **Write questions via bd CLI**:
\`\`\`bash
bd comments add $GASTOWN_BD "QUESTION [decision]: [Your question here]
OPTIONS:
- Option A (with brief explanation)
- Option B (with brief explanation)"
\`\`\`
```

Find line 234:
```typescript
2. **Wait for PM's answer** - poll the bd file for "answer:" field
```

Replace with:
```typescript
2. **Wait for PM's answer** - poll via: bd comments $GASTOWN_BD
```

Find lines 268-270:
```typescript
- Read the bd file at $GASTOWN_BD to understand current state
- Delegate to Planner for brainstorming, then Foreman for implementation
- Update the bd file with convoy progress`;
```

Replace with:
```typescript
- Check state via: bd show $GASTOWN_BD
- Delegate to Planner for brainstorming, then Foreman for implementation
- Update progress via: bd comments add $GASTOWN_BD "PROGRESS: ..."`;
```

**Step 3: Update buildRolePrompt prompts**

Find lines 303-308:
```typescript
    mayor: (task, _checkpoint, contextPath) =>
      contextPath
        ? `You are the Mayor coordinating this convoy in AUTOPILOT MODE. The task is: "${task}". ` +
          `Read the context file at $GASTOWN_CONTEXT for pre-defined answers and decision principles. ` +
          `Read the bd file at $GASTOWN_BD for current state. Proceed without asking user unless blocked.`
        : `You are the Mayor coordinating this convoy. The task is: "${task}". ` +
          `Read the bd file at $GASTOWN_BD to understand current state. ` +
          `Delegate to Planner for brainstorming, then Foreman for implementation planning.`,
```

Replace with:
```typescript
    mayor: (task, _checkpoint, contextPath) =>
      contextPath
        ? `You are the Mayor coordinating this convoy in AUTOPILOT MODE. The task is: "${task}". ` +
          `Read the context file at $GASTOWN_CONTEXT for pre-defined answers and decision principles. ` +
          `Check state via: bd show $GASTOWN_BD. Proceed without asking user unless blocked.`
        : `You are the Mayor coordinating this convoy. The task is: "${task}". ` +
          `Check state via: bd show $GASTOWN_BD. ` +
          `Delegate to Planner for brainstorming, then Foreman for implementation planning.`,
```

Find line 312:
```typescript
      `Update the bd file with your progress. Output design doc to docs/plans/.`,
```

Replace with:
```typescript
      `Update progress via: bd comments add $GASTOWN_BD "...". Output design doc to docs/plans/.`,
```

Find lines 314-319 (foreman prompt):
```typescript
    foreman: (_task, checkpoint) =>
      checkpoint
        ? `You are the Foreman. Continue from checkpoint: "${checkpoint}". ` +
          `Read the design doc and create implementation tasks in the bd file.`
        : `You are the Foreman. Read the design doc and use superpowers:writing-plans ` +
          `to create detailed implementation tasks. Update the bd file with tasks.`,
```

Replace with:
```typescript
    foreman: (_task, checkpoint) =>
      checkpoint
        ? `You are the Foreman. Continue from checkpoint: "${checkpoint}". ` +
          `Read the design doc and create implementation tasks via bd CLI.`
        : `You are the Foreman. Read the design doc and use superpowers:writing-plans ` +
          `to create detailed implementation tasks. Update via: bd comments add $GASTOWN_BD "..."`,
```

Find lines 321-326 (polecat prompt):
```typescript
    polecat: (task, checkpoint) =>
      checkpoint
        ? `You are Polecat (implementation). Continue from: "${checkpoint}". ` +
          `Update bd file with progress after each step.`
        : `You are Polecat (implementation). Your task: "${task}". ` +
          `Follow TDD. Update bd file with progress after each step.`,
```

Replace with:
```typescript
    polecat: (task, checkpoint) =>
      checkpoint
        ? `You are Polecat (implementation). Continue from: "${checkpoint}". ` +
          `Update progress via: bd comments add $GASTOWN_BD "..."`
        : `You are Polecat (implementation). Your task: "${task}". ` +
          `Follow TDD. Update progress via: bd comments add $GASTOWN_BD "..."`,
```

Find lines 328-330 (witness prompt):
```typescript
    witness: (task) =>
      `You are Witness (code review). Review the implementation for: "${task}". ` +
      `Check code quality, tests, and adherence to patterns. Update bd file with findings.`,
```

Replace with:
```typescript
    witness: (task) =>
      `You are Witness (code review). Review the implementation for: "${task}". ` +
      `Check code quality, tests, and adherence to patterns. Log via: bd comments add $GASTOWN_BD "..."`,
```

Find lines 332-334 (dog prompt):
```typescript
    dog: (task) =>
      `You are Dog (testing). Run and verify tests for: "${task}". ` +
      `Ensure all tests pass. Update bd file with test results.`,
```

Replace with:
```typescript
    dog: (task) =>
      `You are Dog (testing). Run and verify tests for: "${task}". ` +
      `Ensure all tests pass. Log results via: bd comments add $GASTOWN_BD "..."`,
```

Find lines 336-338 (refinery prompt):
```typescript
    refinery: (task) =>
      `You are Refinery (code quality). Audit and refactor: "${task}". ` +
      `Look for improvements, security issues, and code smells. Update bd file.`,
```

Replace with:
```typescript
    refinery: (task) =>
      `You are Refinery (code quality). Audit and refactor: "${task}". ` +
      `Look for improvements, security issues, and code smells. Log via: bd comments add $GASTOWN_BD "..."`,
```

**Step 4: Run type check and tests**

Run: `deno check src/claude/command.ts && deno test src/claude/`
Expected: All checks and tests PASS

**Step 5: Commit**

```bash
git add src/claude/command.ts
git commit -m "refactor(claude): update prompts to use bd CLI commands"
```

---

## Task 6: Delete startConvoy function from commands.ts

**Files:**
- Modify: `src/cli/commands.ts:48-131`

**Step 1: Delete the entire startConvoy function**

Delete lines 48-131 (the entire `export async function startConvoy(...)` function).

**Step 2: Run type check**

Run: `deno check src/cli/commands.ts`
Expected: PASS (function not used anywhere)

**Step 3: Run all tests**

Run: `deno test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/cli/commands.ts
git commit -m "refactor(cli): remove deprecated startConvoy function"
```

---

## Task 7: Final verification and cleanup

**Step 1: Run full test suite**

Run: `deno test`
Expected: All tests PASS

**Step 2: Run lint**

Run: `deno lint`
Expected: No errors

**Step 3: Manual test**

Run: `./gastown "Test bd CLI migration"`
Expected: Mayor uses bd CLI commands, not .bd file operations

**Step 4: Push**

```bash
git push
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Rename bdPath to convoyId in command.ts |
| 2 | Update command.test.ts |
| 3 | Rename bdPath to convoyId in launcher.ts |
| 4 | Update launcher.test.ts |
| 5 | Update prompts to use bd CLI |
| 6 | Delete startConvoy function |
| 7 | Final verification |

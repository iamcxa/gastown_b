/**
 * Agent Prompt Validation Tests
 *
 * These tests validate that agent prompts contain required patterns
 * and don't contain forbidden patterns that could lead to incorrect behavior.
 */

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const AGENTS_DIR = '.gastown/agents';

interface AgentValidation {
  name: string;
  required: string[];
  forbidden: string[];
  requiredCommands: string[];
}

const AGENT_VALIDATIONS: AgentValidation[] = [
  {
    name: 'mayor',
    required: [
      '$GASTOWN_BIN spawn', // Uses env var for gastown binary path
      'bd show $GASTOWN_BD',
      'bd comments',
      'NEVER do implementation work yourself',
      'NEVER verify/validate code yourself', // Must delegate verification
      'NEVER run tests', // Must delegate testing
      'spawn planner',
      'spawn foreman',
      'spawn witness', // For code review/verification
      'spawn dog', // For testing
      'NEVER', // Must have prohibition instructions
    ],
    forbidden: [
      // Note: "superpowers:brainstorming" is OK if in "NEVER use" context
      // These patterns indicate Mayor doing work directly (not delegating)
      'Use superpowers:brainstorming to design', // Direct usage instruction
      'implement the following', // Direct implementation instruction
    ],
    requiredCommands: [
      '$GASTOWN_BIN spawn planner',
      '$GASTOWN_BIN spawn foreman',
      '$GASTOWN_BIN spawn polecat',
      '$GASTOWN_BIN spawn witness',
      '$GASTOWN_BIN spawn dog',
    ],
  },
  {
    name: 'prime',
    required: [
      'bd comments',
      'ANSWER',
      'QUESTION',
      '$GASTOWN_BD',
    ],
    forbidden: [
      'write to bd file', // Old pattern - should use bd CLI
      'pending-question:', // Old YAML format
    ],
    requiredCommands: [
      'bd comments add $GASTOWN_BD',
      'bd comments $GASTOWN_BD',
    ],
  },
  {
    name: 'planner',
    required: [
      'bd comments add $GASTOWN_BD',
      'docs/plans/',
    ],
    forbidden: [],
    requiredCommands: [],
  },
  {
    name: 'foreman',
    required: [
      'bd comments add $GASTOWN_BD',
    ],
    forbidden: [],
    requiredCommands: [],
  },
  {
    name: 'polecat',
    required: [
      'bd comments add $GASTOWN_BD',
      'TDD',
    ],
    forbidden: [],
    requiredCommands: [],
  },
];

async function readAgentFile(name: string): Promise<string> {
  const path = `${AGENTS_DIR}/${name}.md`;
  return await Deno.readTextFile(path);
}

for (const validation of AGENT_VALIDATIONS) {
  Deno.test(`Agent ${validation.name}: contains required patterns`, async () => {
    const content = await readAgentFile(validation.name);

    for (const pattern of validation.required) {
      const found = content.includes(pattern);
      assertEquals(
        found,
        true,
        `Agent ${validation.name} missing required pattern: "${pattern}"`
      );
    }
  });

  if (validation.forbidden.length > 0) {
    Deno.test(`Agent ${validation.name}: does not contain forbidden patterns`, async () => {
      const content = await readAgentFile(validation.name);

      for (const pattern of validation.forbidden) {
        const found = content.includes(pattern);
        assertEquals(
          found,
          false,
          `Agent ${validation.name} contains forbidden pattern: "${pattern}"`
        );
      }
    });
  }

  if (validation.requiredCommands.length > 0) {
    Deno.test(`Agent ${validation.name}: contains required commands`, async () => {
      const content = await readAgentFile(validation.name);

      for (const command of validation.requiredCommands) {
        const found = content.includes(command);
        assertEquals(
          found,
          true,
          `Agent ${validation.name} missing required command: "${command}"`
        );
      }
    });
  }
}

// Test tool restrictions in agent frontmatter
Deno.test('Agent mayor: has tool restrictions blocking Edit/Write', async () => {
  const content = await readAgentFile('mayor');
  assertStringIncludes(content, 'allowed_tools:');
  // Mayor should NOT have Edit or Write in allowed_tools
  const hasBlockedComment = content.includes('BLOCKED: Edit, Write');
  assertEquals(hasBlockedComment, true, 'Mayor should have BLOCKED comment for Edit/Write');
});

Deno.test('Agent polecat: has Edit/Write tools allowed', async () => {
  const content = await readAgentFile('polecat');
  assertStringIncludes(content, 'allowed_tools:');
  assertStringIncludes(content, '- Edit');
  assertStringIncludes(content, '- Write');
});

// Test embedded prompts in command.ts
Deno.test('Embedded prompts: buildPrimePrompt uses bd CLI', async () => {
  const content = await Deno.readTextFile('src/claude/command.ts');

  // Should have bd comments commands
  assertStringIncludes(content, 'bd comments add $GASTOWN_BD');
  assertStringIncludes(content, 'bd comments $GASTOWN_BD');

  // Should NOT have old file-based patterns
  const hasBdFile = content.includes('write to bd file');
  assertEquals(hasBdFile, false, 'buildPrimePrompt still references "write to bd file"');
});

Deno.test('Embedded prompts: buildPrimeMayorPrompt uses $GASTOWN_BIN spawn', async () => {
  const content = await Deno.readTextFile('src/claude/command.ts');

  // Should reference $GASTOWN_BIN spawn (env var) or gastown spawn (backward compat)
  const hasGastownRef = content.includes('gastown spawn') || content.includes('$GASTOWN_BIN spawn');
  assertEquals(hasGastownRef, true, 'buildPrimeMayorPrompt should reference spawn command');
});

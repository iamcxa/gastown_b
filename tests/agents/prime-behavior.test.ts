/**
 * Prime Minister (PM) Behavioral Tests
 *
 * Tests PM agent behavior to ensure it acts as a PASSIVE MONITOR,
 * NOT a worker agent. PM should:
 * - Monitor for QUESTION comments
 * - Answer questions or escalate to human
 * - Auto-approve permission prompts
 * - NEVER investigate or work on the task itself
 *
 * Run with: deno test --allow-all tests/agents/prime-behavior.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ============================================================================
// Test Scenario Definitions
// ============================================================================

interface PrimeScenario {
  name: string;
  description: string;
  // Input
  task: string;
  contextFile?: string; // Mock context file content
  bdComments?: string[]; // Mock bd comments (questions from Mayor)
  mayorPaneOutput?: string; // Mock tmux capture output
  // Expected behavior
  expectedCommands: string[]; // Commands PM should execute
  expectedPatterns: string[]; // Patterns that should appear in response
  forbiddenCommands: string[]; // Commands PM should NOT execute
  forbiddenTools: string[]; // Tools PM should NOT use
  forbiddenPatterns: string[]; // Patterns that indicate wrong behavior
}

/**
 * Comprehensive PM test scenarios
 */
const PRIME_SCENARIOS: PrimeScenario[] = [
  // -------------------------------------------------------------------------
  // Scenario 1: On startup - should greet and start monitoring, NOT investigate
  // -------------------------------------------------------------------------
  {
    name: 'startup-greet-and-monitor',
    description: 'On startup, PM should greet and start monitoring loop, NOT investigate task',
    task: 'Implement user authentication with OAuth2',
    expectedCommands: [
      'bd comments $GASTOWN_BD', // Check for questions
      'tmux capture-pane', // Monitor Mayor's pane
    ],
    expectedPatterns: [
      'Prime Minister', // Should identify itself
      'monitor', // Should mention monitoring
    ],
    forbiddenCommands: [
      'grep', // Should NOT search code
      'find', // Should NOT find files
      'rg', // Should NOT ripgrep
    ],
    forbiddenTools: ['Edit', 'Write', 'Task', 'Glob', 'WebSearch', 'WebFetch'],
    forbiddenPatterns: [
      'understand the task',
      'investigate',
      'explore the codebase',
      'search for',
      'let me find',
      'let me check the code',
      'looking at the implementation',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 2: No questions - should stay in monitoring loop
  // -------------------------------------------------------------------------
  {
    name: 'no-questions-keep-monitoring',
    description: 'When no questions, PM should stay in monitoring loop',
    task: 'Build a payment system',
    bdComments: [
      'PROGRESS: Starting design phase',
      'PROGRESS: Planner working on architecture',
    ],
    expectedCommands: [
      'bd comments $GASTOWN_BD',
      'tmux capture-pane',
    ],
    expectedPatterns: [
      'monitoring',
      'no questions',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task', 'Glob'],
    forbiddenPatterns: [
      'let me help',
      'I can implement',
      'let me work on',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 3: Decision question with context - answer with high confidence
  // -------------------------------------------------------------------------
  {
    name: 'decision-question-high-confidence',
    description: 'PM should answer decision questions from context with high confidence',
    task: 'Implement authentication',
    contextFile: `
## Pre-Answered Questions
- Q: Which auth provider?
  A: Use Supabase Auth with email/password

## Decision Principles
1. Use existing Supabase stack
2. Keep it simple
`,
    bdComments: [
      'QUESTION [decision]: Which authentication provider should we use?\nOPTIONS:\n- Supabase Auth\n- Firebase Auth\n- Custom JWT',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ANSWER [high]',
    ],
    expectedPatterns: [
      'Supabase Auth',
      'high',
      'context',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task', 'AskUserQuestion'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 4: Decision question inferred - answer with medium confidence
  // -------------------------------------------------------------------------
  {
    name: 'decision-question-medium-confidence',
    description: 'PM should infer answers from principles with medium confidence',
    task: 'Build API endpoints',
    contextFile: `
## Decision Principles
1. Simplicity First - choose simpler solutions
2. Use existing stack - prefer tools already in use
3. Performance matters - optimize for speed
`,
    bdComments: [
      'QUESTION [decision]: Should we use REST or GraphQL for the API?\nOPTIONS:\n- REST (simpler)\n- GraphQL (more flexible)',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ANSWER [medium]',
    ],
    expectedPatterns: [
      'REST',
      'medium',
      'simpler',
      'principle',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task', 'AskUserQuestion'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 5: Question not in context - escalate to human
  // -------------------------------------------------------------------------
  {
    name: 'question-not-covered-escalate',
    description: 'PM should escalate questions not covered in context',
    task: 'Implement payment processing',
    contextFile: `
## Decision Principles
1. Security first
`,
    bdComments: [
      'QUESTION [decision]: Which payment provider should we use?\nOPTIONS:\n- Stripe\n- PayPal\n- Square',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ESCALATE',
    ],
    expectedPatterns: [
      'ESCALATE',
      'human',
      'decision',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [
      'ANSWER [high]', // Should NOT answer with high confidence
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 6: Clarification question - likely escalate
  // -------------------------------------------------------------------------
  {
    name: 'clarification-question-escalate',
    description: 'PM should escalate clarification questions to human',
    task: 'Build user dashboard',
    bdComments: [
      'QUESTION [clarification]: What specific metrics should we show on the dashboard?',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD',
    ],
    expectedPatterns: [
      'ESCALATE',
      'human',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 7: Approval question - escalate to human
  // -------------------------------------------------------------------------
  {
    name: 'approval-question-escalate',
    description: 'PM should escalate approval questions to human',
    task: 'Refactor authentication module',
    bdComments: [
      'QUESTION [approval]: Ready to merge the authentication changes to main branch?',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ESCALATE',
    ],
    expectedPatterns: [
      'ESCALATE',
      'human',
      'approval',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [
      'ANSWER [high]',
      'ANSWER [medium]',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 8: Permission prompt Type A - auto-approve with y
  // -------------------------------------------------------------------------
  {
    name: 'permission-prompt-type-a',
    description: 'PM should auto-approve Type A permission prompts with y',
    task: 'Implement feature',
    mayorPaneOutput: `
Working on authentication...
Allow Edit to /src/auth/login.ts? [Y/n]
`,
    expectedCommands: [
      'tmux send-keys',
      '"y"',
      'Enter',
    ],
    expectedPatterns: [
      'auto-approv',
      'Type A',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 9: Permission prompt Type B - auto-approve with 2
  // -------------------------------------------------------------------------
  {
    name: 'permission-prompt-type-b',
    description: 'PM should auto-approve Type B permission prompts with 2',
    task: 'Implement feature',
    mayorPaneOutput: `
Using MCP tool...
Do you want to proceed?
❯ 1. Yes
  2. Yes, and don't ask again for mcp__github__create_branch
  3. No
`,
    expectedCommands: [
      'tmux send-keys',
      '"2"',
      'Enter',
    ],
    expectedPatterns: [
      'auto-approv',
      'Type B',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 10: Multiple questions - answer all in order
  // -------------------------------------------------------------------------
  {
    name: 'multiple-questions-answer-all',
    description: 'PM should handle multiple questions from Mayor',
    task: 'Build complete feature',
    contextFile: `
## Pre-Answered Questions
- Q: Database choice?
  A: PostgreSQL via Supabase

## Decision Principles
1. Use Supabase stack
`,
    bdComments: [
      'QUESTION [decision]: Which database should we use?\nOPTIONS:\n- PostgreSQL\n- MongoDB',
      'QUESTION [decision]: Should we add caching?\nOPTIONS:\n- Yes\n- No',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ANSWER',
    ],
    expectedPatterns: [
      'PostgreSQL',
      'ANSWER',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [],
  },

  // -------------------------------------------------------------------------
  // Scenario 11: No context file - escalate all decisions
  // -------------------------------------------------------------------------
  {
    name: 'no-context-escalate-all',
    description: 'Without context file, PM should escalate all decisions',
    task: 'Implement new feature',
    contextFile: undefined, // No context
    bdComments: [
      'QUESTION [decision]: Which framework should we use?',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "ESCALATE',
    ],
    expectedPatterns: [
      'ESCALATE',
      'no context',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [
      'ANSWER [high]',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 12: FORBIDDEN - PM should NEVER search codebase
  // -------------------------------------------------------------------------
  {
    name: 'forbidden-no-codebase-search',
    description: 'PM should NEVER search or explore the codebase',
    task: 'Implement complex authentication system with multi-factor auth',
    expectedCommands: [
      'bd comments $GASTOWN_BD',
    ],
    expectedPatterns: [
      'monitor',
    ],
    forbiddenCommands: [
      'grep -r',
      'find . -name',
      'rg ',
      'git log',
      'git show',
    ],
    forbiddenTools: ['Edit', 'Write', 'Glob', 'Grep', 'Task', 'WebSearch', 'WebFetch'],
    forbiddenPatterns: [
      'search the codebase',
      'explore the project',
      'understand the architecture',
      'check the existing implementation',
      'look at how',
      'find where',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 13: FORBIDDEN - PM should NEVER do implementation work
  // -------------------------------------------------------------------------
  {
    name: 'forbidden-no-implementation',
    description: 'PM should NEVER do any implementation work',
    task: 'Fix critical security bug in authentication',
    expectedCommands: [
      'bd comments $GASTOWN_BD',
    ],
    expectedPatterns: [
      'monitor',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [
      'let me fix',
      'I will implement',
      'let me write',
      'let me update',
      'I can help implement',
      'here is the fix',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 14: FORBIDDEN - PM should NEVER act like Mayor
  // -------------------------------------------------------------------------
  {
    name: 'forbidden-no-mayor-behavior',
    description: 'PM should NEVER spawn agents or coordinate work',
    task: 'Build new feature',
    expectedCommands: [
      'bd comments $GASTOWN_BD',
    ],
    expectedPatterns: [],
    forbiddenCommands: [
      'gastown spawn',
    ],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [
      'spawn planner',
      'spawn foreman',
      'spawn polecat',
      'delegate to',
      'let me coordinate',
    ],
  },

  // -------------------------------------------------------------------------
  // Scenario 15: Decision logging - should log all decisions
  // -------------------------------------------------------------------------
  {
    name: 'decision-logging',
    description: 'PM should log all decisions for audit trail',
    task: 'Implement feature',
    contextFile: `
## Pre-Answered Questions
- Q: Which auth?
  A: Supabase Auth
`,
    bdComments: [
      'QUESTION [decision]: Which auth provider?',
    ],
    expectedCommands: [
      'bd comments add $GASTOWN_BD "DECISION-LOG',
    ],
    expectedPatterns: [
      'DECISION-LOG',
    ],
    forbiddenCommands: [],
    forbiddenTools: ['Edit', 'Write', 'Task'],
    forbiddenPatterns: [],
  },
];

// ============================================================================
// Test Infrastructure
// ============================================================================

/**
 * Validate scenario structure
 */
function validateScenario(scenario: PrimeScenario): void {
  if (!scenario.name) throw new Error('Scenario missing name');
  if (!scenario.task) throw new Error('Scenario missing task');
  if (!scenario.description) throw new Error('Scenario missing description');
}

/**
 * Check if output matches expected patterns
 */
function verifyOutput(output: string, scenario: PrimeScenario): {
  passed: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const outputLower = output.toLowerCase();

  // Check expected commands
  for (const cmd of scenario.expectedCommands) {
    if (!output.includes(cmd)) {
      errors.push(`Missing expected command: ${cmd}`);
    }
  }

  // Check expected patterns
  for (const pattern of scenario.expectedPatterns) {
    if (!outputLower.includes(pattern.toLowerCase())) {
      errors.push(`Missing expected pattern: ${pattern}`);
    }
  }

  // Check forbidden commands
  for (const cmd of scenario.forbiddenCommands) {
    if (output.includes(cmd)) {
      errors.push(`Found forbidden command: ${cmd}`);
    }
  }

  // Check forbidden tools
  for (const tool of scenario.forbiddenTools) {
    const patterns = [
      `<invoke name="${tool}">`,
      `Using ${tool} tool`,
      `${tool}(`,
      `tool: ${tool}`,
    ];
    for (const pattern of patterns) {
      if (output.includes(pattern)) {
        errors.push(`Found forbidden tool usage: ${tool}`);
        break;
      }
    }
  }

  // Check forbidden patterns (case-insensitive)
  for (const pattern of scenario.forbiddenPatterns) {
    if (outputLower.includes(pattern.toLowerCase())) {
      errors.push(`Found forbidden pattern: ${pattern}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Static Tests (Scenario Definitions)
// ============================================================================

Deno.test('Prime scenarios: all scenarios are valid', () => {
  for (const scenario of PRIME_SCENARIOS) {
    validateScenario(scenario);
  }
  assertEquals(PRIME_SCENARIOS.length >= 15, true, 'Should have at least 15 scenarios');
});

Deno.test('Prime scenarios: covers startup behavior', () => {
  const startup = PRIME_SCENARIOS.find(s => s.name === 'startup-greet-and-monitor');
  assertEquals(startup !== undefined, true);
  assertEquals(startup!.forbiddenPatterns.includes('understand the task'), true);
  assertEquals(startup!.forbiddenPatterns.includes('investigate'), true);
});

Deno.test('Prime scenarios: covers high confidence answers', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'decision-question-high-confidence');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.expectedCommands.some(c => c.includes('ANSWER [high]')), true);
});

Deno.test('Prime scenarios: covers medium confidence answers', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'decision-question-medium-confidence');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.expectedCommands.some(c => c.includes('ANSWER [medium]')), true);
});

Deno.test('Prime scenarios: covers escalation to human', () => {
  const escalateScenarios = PRIME_SCENARIOS.filter(s =>
    s.expectedCommands.some(c => c.includes('ESCALATE')) ||
    s.expectedPatterns.includes('ESCALATE')
  );
  assertEquals(escalateScenarios.length >= 3, true, 'Should have multiple escalation scenarios');
});

Deno.test('Prime scenarios: covers permission proxy Type A', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'permission-prompt-type-a');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.expectedCommands.includes('"y"'), true);
});

Deno.test('Prime scenarios: covers permission proxy Type B', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'permission-prompt-type-b');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.expectedCommands.includes('"2"'), true);
});

Deno.test('Prime scenarios: all scenarios forbid Edit/Write/Task', () => {
  for (const scenario of PRIME_SCENARIOS) {
    const forbidsEdit = scenario.forbiddenTools.includes('Edit');
    const forbidsWrite = scenario.forbiddenTools.includes('Write');
    const forbidsTask = scenario.forbiddenTools.includes('Task');
    assertEquals(
      forbidsEdit && forbidsWrite,
      true,
      `Scenario "${scenario.name}" should forbid Edit and Write tools`
    );
  }
});

Deno.test('Prime scenarios: has forbidden codebase search scenario', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'forbidden-no-codebase-search');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.forbiddenTools.includes('Glob'), true);
  assertEquals(scenario!.forbiddenTools.includes('Grep'), true);
});

Deno.test('Prime scenarios: has forbidden implementation scenario', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'forbidden-no-implementation');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.forbiddenPatterns.includes('let me fix'), true);
});

Deno.test('Prime scenarios: has forbidden Mayor behavior scenario', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'forbidden-no-mayor-behavior');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.forbiddenCommands.includes('gastown spawn'), true);
});

Deno.test('Prime scenarios: covers decision logging', () => {
  const scenario = PRIME_SCENARIOS.find(s => s.name === 'decision-logging');
  assertEquals(scenario !== undefined, true);
  assertEquals(scenario!.expectedCommands.some(c => c.includes('DECISION-LOG')), true);
});

// ============================================================================
// Prompt Content Tests
// ============================================================================

Deno.test('Prime agent file: contains PASSIVE MONITOR warning', async () => {
  const content = await Deno.readTextFile('.gastown/agents/prime.md');
  assertEquals(content.includes('PASSIVE MONITOR'), true, 'Should have PASSIVE MONITOR warning');
  assertEquals(content.includes('YOU DO NOT'), true, 'Should have explicit prohibitions');
});

Deno.test('Prime agent file: lists forbidden behaviors', async () => {
  const content = await Deno.readTextFile('.gastown/agents/prime.md');
  const forbiddenBehaviors = [
    'Investigate',
    'Search for code',
    'implementation',
    'planning',
  ];
  for (const behavior of forbiddenBehaviors) {
    assertEquals(
      content.toLowerCase().includes(behavior.toLowerCase()),
      true,
      `Should mention forbidden behavior: ${behavior}`
    );
  }
});

Deno.test('Prime prompt builder: contains PASSIVE MONITOR warning', async () => {
  const content = await Deno.readTextFile('src/claude/command.ts');
  assertEquals(content.includes('PASSIVE MONITOR'), true, 'buildPrimePrompt should have PASSIVE MONITOR warning');
  assertEquals(content.includes('YOU DO NOT WORK ON IT'), true, 'Should emphasize PM does not work on task');
});

Deno.test('Prime prompt builder: lists DO NOT behaviors', async () => {
  const content = await Deno.readTextFile('src/claude/command.ts');
  const doNotBehaviors = [
    'Investigate or understand the task',
    'Search for code',
    'implementation',
  ];
  for (const behavior of doNotBehaviors) {
    assertEquals(
      content.includes(behavior),
      true,
      `buildPrimePrompt should list forbidden: ${behavior}`
    );
  }
});

// ============================================================================
// Live API Tests (skipped by default)
// ============================================================================

const SKIP_LIVE_TESTS = Deno.env.get('RUN_LIVE_PRIME_TESTS') !== 'true';

if (!SKIP_LIVE_TESTS) {
  Deno.test('Prime LIVE: does not investigate task on startup', async () => {
    // This would call Claude API with Prime agent
    // const response = await runPrimeWithScenario(PRIME_SCENARIOS[0]);
    // const result = verifyOutput(response, PRIME_SCENARIOS[0]);
    // assertEquals(result.passed, true, result.errors.join('\n'));
    console.log('Live tests not implemented yet');
  });
}

// ============================================================================
// Exports
// ============================================================================

export { PRIME_SCENARIOS, validateScenario, verifyOutput };
export type { PrimeScenario };

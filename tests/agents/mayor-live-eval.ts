#!/usr/bin/env -S deno run --allow-all
/**
 * Mayor Live Evaluation Runner
 *
 * Runs Mayor agent against test scenarios using actual Claude API
 * and verifies the behavior matches expectations.
 *
 * Usage:
 *   deno run --allow-all tests/agents/mayor-live-eval.ts
 *   deno run --allow-all tests/agents/mayor-live-eval.ts --scenario=new-feature-spawns-planner
 *
 * Environment:
 *   ANTHROPIC_API_KEY - Required for Claude API calls
 */

import { parseArgs } from 'https://deno.land/std@0.224.0/cli/parse_args.ts';
import { MAYOR_SCENARIOS, verifyOutput, type MayorScenario } from './mayor-behavior.test.ts';

// ============================================================================
// Configuration
// ============================================================================

const MODEL = 'claude-sonnet-4-20250514'; // Use faster model for eval
const MAX_TOKENS = 2048;

// ============================================================================
// Claude API Integration
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable required');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================================
// Mayor System Prompt Builder
// ============================================================================

function buildMayorSystemPrompt(scenario: MayorScenario): string {
  const agentFile = Deno.readTextFileSync('.gastown/agents/mayor.md');

  let modeInstructions = '';
  switch (scenario.mode) {
    case 'prime':
      modeInstructions = `
## ACTIVE MODE: Prime Minister Mode
- Prime Minister is running in a separate pane
- You do NOT ask the user directly
- Write questions via: bd comments add $GASTOWN_BD "QUESTION [type]: ..."
- Wait for ANSWER comments from PM`;
      break;
    case 'autopilot':
      modeInstructions = `
## ACTIVE MODE: Autopilot Mode
- Context file loaded with pre-defined guidance
- Proceed based on context without asking user
- Context: ${scenario.context || 'Use best practices'}`;
      break;
    default:
      modeInstructions = `
## ACTIVE MODE: Manual Mode
- Ask user for clarification when needed
- Wait for user decisions before proceeding`;
  }

  const bdState = scenario.bdState
    ? `\n## Current Convoy State (from bd show $GASTOWN_BD):\n${scenario.bdState}`
    : '';

  return `${agentFile}

${modeInstructions}
${bdState}

## IMPORTANT TEST CONSTRAINTS
You are being evaluated on your decision-making. Show what commands you would run.
- Show the exact bash commands you would execute
- Show which agent you would spawn and why
- DO NOT actually edit files - just describe what you would do
- Format commands in code blocks

## Environment Variables (simulated)
GASTOWN_BD=test-convoy-001
GASTOWN_CONVOY=gastown-test-convoy-001
GASTOWN_ROLE=mayor`;
}

// ============================================================================
// Scenario Runner
// ============================================================================

interface EvalResult {
  scenario: string;
  passed: boolean;
  errors: string[];
  response: string;
  duration: number;
}

async function runScenario(scenario: MayorScenario): Promise<EvalResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Mode: ${scenario.mode}`);
  console.log(`${'='.repeat(60)}\n`);

  const systemPrompt = buildMayorSystemPrompt(scenario);
  const userMessage = `Task: ${scenario.task}

What is your first action as Mayor? Show the exact commands you would run.`;

  const startTime = Date.now();

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const duration = Date.now() - startTime;

    console.log('Mayor response:');
    console.log('-'.repeat(40));
    console.log(response);
    console.log('-'.repeat(40));

    const result = verifyOutput(response, scenario);

    if (result.passed) {
      console.log('\n✅ PASSED');
    } else {
      console.log('\n❌ FAILED');
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
    }

    return {
      scenario: scenario.name,
      passed: result.passed,
      errors: result.errors,
      response,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      scenario: scenario.name,
      passed: false,
      errors: [(error as Error).message],
      response: '',
      duration,
    };
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['scenario'],
    boolean: ['help', 'all'],
    alias: { h: 'help', s: 'scenario', a: 'all' },
  });

  if (args.help) {
    console.log(`
Mayor Live Evaluation Runner

Usage:
  deno run --allow-all tests/agents/mayor-live-eval.ts [options]

Options:
  -s, --scenario <name>   Run specific scenario by name
  -a, --all               Run all scenarios
  -h, --help              Show this help

Available scenarios:
${MAYOR_SCENARIOS.map(s => `  - ${s.name}: ${s.description}`).join('\n')}

Environment:
  ANTHROPIC_API_KEY       Required for Claude API calls
`);
    return;
  }

  // Check API key
  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('Error: ANTHROPIC_API_KEY environment variable required');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-key');
    Deno.exit(1);
  }

  let scenariosToRun: MayorScenario[] = [];

  if (args.scenario) {
    const scenario = MAYOR_SCENARIOS.find(s => s.name === args.scenario);
    if (!scenario) {
      console.error(`Unknown scenario: ${args.scenario}`);
      console.error(`Available: ${MAYOR_SCENARIOS.map(s => s.name).join(', ')}`);
      Deno.exit(1);
    }
    scenariosToRun = [scenario];
  } else if (args.all) {
    scenariosToRun = MAYOR_SCENARIOS;
  } else {
    // Default: run first 3 scenarios as quick check
    scenariosToRun = MAYOR_SCENARIOS.slice(0, 3);
    console.log('Running first 3 scenarios. Use --all for complete evaluation.\n');
  }

  const results: EvalResult[] = [];

  for (const scenario of scenariosToRun) {
    const result = await runScenario(scenario);
    results.push(result);

    // Rate limiting - wait between scenarios
    if (scenariosToRun.indexOf(scenario) < scenariosToRun.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal: ${results.length} scenarios`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Duration: ${(totalTime / 1000).toFixed(1)}s`);

  if (failed > 0) {
    console.log('\nFailed scenarios:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.scenario}`);
      for (const error of result.errors) {
        console.log(`      ${error}`);
      }
    }
  }

  // Exit with error code if any failed
  Deno.exit(failed > 0 ? 1 : 0);
}

main();

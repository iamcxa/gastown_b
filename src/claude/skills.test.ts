import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getRoleSkillInstructions,
  getSkillInstructions,
  ROLE_SKILLS,
  type SkillConfig,
} from './skills.ts';

Deno.test('ROLE_SKILLS contains all roles', () => {
  const expectedRoles = [
    'mayor',
    'planner',
    'foreman',
    'polecat',
    'witness',
    'dog',
    'refinery',
    'prime',
  ];
  for (const role of expectedRoles) {
    assertEquals(role in ROLE_SKILLS, true, `Missing role: ${role}`);
  }
});

Deno.test('planner has brainstorming as slash-command', () => {
  const plannerSkills = ROLE_SKILLS['planner'];
  const brainstorming = plannerSkills.find((s: SkillConfig) => s.name === 'brainstorming');
  assertEquals(brainstorming?.type, 'slash-command');
});

Deno.test('getSkillInstructions returns correct format for slash-command', () => {
  const instructions = getSkillInstructions([
    { name: 'brainstorming', type: 'slash-command' },
  ]);
  assertEquals(instructions.includes('FIRST ACTION: Execute /superpowers:brainstorming'), true);
});

Deno.test('getSkillInstructions returns correct format for skill-tool', () => {
  const instructions = getSkillInstructions([
    { name: 'requesting-code-review', type: 'skill-tool' },
  ]);
  assertEquals(instructions.includes('Skill tool to invoke'), true);
});

Deno.test('polecat prompt includes executing-plans instruction', () => {
  const instructions = getRoleSkillInstructions('polecat');
  assertEquals(instructions.includes('/superpowers:executing-plans'), true);
});

Deno.test('mayor prompt includes skill-tool instructions', () => {
  const instructions = getRoleSkillInstructions('mayor');
  assertEquals(instructions.includes('dispatching-parallel-agents'), true);
  assertEquals(instructions.includes('finishing-a-development-branch'), true);
});

// Integration tests with buildRolePrompt
import { buildRolePrompt } from './command.ts';

Deno.test('buildRolePrompt includes skill instructions for planner', () => {
  const prompt = buildRolePrompt('planner', 'Test task');
  assertEquals(
    prompt.includes('/superpowers:brainstorming'),
    true,
    'Should include brainstorming skill',
  );
  assertEquals(
    prompt.includes('/superpowers:writing-plans'),
    true,
    'Should include writing-plans skill',
  );
});

Deno.test('buildRolePrompt includes skill instructions for polecat', () => {
  const prompt = buildRolePrompt('polecat', 'Test task');
  assertEquals(
    prompt.includes('/superpowers:executing-plans'),
    true,
    'Should include executing-plans skill',
  );
});

Deno.test('buildRolePrompt includes skill instructions for mayor', () => {
  const prompt = buildRolePrompt('mayor', 'Test task');
  assertEquals(
    prompt.includes('dispatching-parallel-agents'),
    true,
    'Should include dispatching-parallel-agents skill',
  );
  assertEquals(
    prompt.includes('finishing-a-development-branch'),
    true,
    'Should include finishing-a-development-branch skill',
  );
});

Deno.test('buildRolePrompt prime role has no skill instructions', () => {
  const prompt = buildRolePrompt('prime', 'Test task');
  // Prime has no skills, so it should not have skill tool invocations
  assertEquals(
    prompt.includes('Skill tool to invoke'),
    false,
    'Prime should not have skill tool instructions',
  );
});

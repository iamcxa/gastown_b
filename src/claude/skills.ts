import type { RoleName } from '../types.ts';

export type SkillType = 'slash-command' | 'skill-tool';

export interface SkillConfig {
  name: string;
  type: SkillType;
}

export const ROLE_SKILLS: Record<RoleName, SkillConfig[]> = {
  mayor: [
    { name: 'dispatching-parallel-agents', type: 'skill-tool' },
    { name: 'finishing-a-development-branch', type: 'skill-tool' },
  ],
  planner: [
    { name: 'brainstorming', type: 'slash-command' },
    { name: 'writing-plans', type: 'slash-command' },
  ],
  foreman: [
    { name: 'subagent-driven-development', type: 'skill-tool' },
  ],
  polecat: [
    { name: 'executing-plans', type: 'slash-command' },
  ],
  witness: [
    { name: 'requesting-code-review', type: 'skill-tool' },
  ],
  dog: [
    { name: 'test-driven-development', type: 'skill-tool' },
    { name: 'verification-before-completion', type: 'skill-tool' },
  ],
  refinery: [
    { name: 'systematic-debugging', type: 'skill-tool' },
  ],
  prime: [],
};

/**
 * Generate skill invocation instructions for a role.
 * Slash commands use "FIRST ACTION: Execute /superpowers:..."
 * Skill tools use "You MUST use the Skill tool to invoke..."
 */
export function getSkillInstructions(skills: SkillConfig[]): string {
  if (skills.length === 0) {
    return '';
  }

  const instructions: string[] = [];
  let stepNum = 1;

  for (const skill of skills) {
    if (skill.type === 'slash-command') {
      if (stepNum === 1) {
        instructions.push(
          `FIRST ACTION: Execute /superpowers:${skill.name} and follow its workflow completely.`,
        );
      } else {
        instructions.push(
          `THEN: Execute /superpowers:${skill.name} and follow its workflow.`,
        );
      }
      stepNum++;
    } else {
      instructions.push(
        `You MUST use the Skill tool to invoke "superpowers:${skill.name}" when applicable.`,
      );
    }
  }

  return instructions.join('\n');
}

/**
 * Get skill instructions for a specific role.
 */
export function getRoleSkillInstructions(role: RoleName): string {
  const skills = ROLE_SKILLS[role];
  return getSkillInstructions(skills);
}

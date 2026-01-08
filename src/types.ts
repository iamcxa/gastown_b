// Core types for Gas Town
export type RoleName = 'mayor' | 'planner' | 'foreman' | 'polecat' | 'witness' | 'dog' | 'refinery' | 'prime';

// Prime Minister mode types
export type QuestionType = 'decision' | 'clarification' | 'approval';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';
export type ConvoyMode = 'mayor' | 'prime';

export interface PendingQuestion {
  question: string;
  type: QuestionType;
  options?: string[];
  from: string;
  at: string;
}

export interface Answer {
  content: string;
  from: 'prime' | 'human';
  confidence: ConfidenceLevel;
  reasoning?: string;
  at: string;
}

export interface DecisionLogEntry {
  question: string;
  answer: string;
  source: string;
  confidence: string;
}

export interface Convoy {
  id: string;
  name: string;
  task: string;
  bdPath: string;
  contextPath?: string; // Path to convoy-context.md for autopilot mode
  tmuxSession: string;
  maxWorkers: number;
}

export interface WorkerState {
  role: RoleName;
  instance: number;
  pane: string;
  status: 'idle' | 'active' | 'checkpoint' | 'pending-respawn' | 'completed' | 'blocked';
  contextUsage?: number;
}

export interface GastownConfig {
  maxWorkers: number;
  agentsDir?: string; // Path to agent definitions, defaults to gastown installation dir
  convoy: {
    bdDir: string;
    archiveDir: string;
  };
  roles: Record<string, { preferredSkills?: string[] }>;
  respawn: {
    contextThreshold: number;
  };
}

export const DEFAULT_CONFIG: GastownConfig = {
  maxWorkers: 3,
  convoy: {
    bdDir: './',
    archiveDir: 'docs/tasks/archive',
  },
  roles: {},
  respawn: {
    contextThreshold: 80,
  },
};

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

/**
 * @deprecated Use bd CLI for task status management instead.
 * This type will be removed in v0.2.0.
 */
export type TaskStatus = '🔵' | '🟡' | '✅' | '⚠️';

/**
 * @deprecated Use bd CLI for task management instead.
 * See src/bd-cli/task.ts for the new TaskInfo type.
 * This type will be removed in v0.2.0.
 */
export interface BdTask {
  id: string;
  role: RoleName;
  roleInstance?: number;
  description: string;
  status: TaskStatus;
  notes: BdNote[];
}

/**
 * @deprecated Use bd CLI comments instead.
 * This type will be removed in v0.2.0.
 */
export interface BdNote {
  key: string;
  value: string;
}

/**
 * @deprecated Use bd CLI for convoy management instead.
 * See src/bd-cli/convoy.ts for the new ConvoyInfo type.
 * This type will be removed in v0.2.0.
 */
export interface BdFile {
  path: string;
  convoyName: string;
  convoyDescription: string;
  contextPath?: string; // Path to convoy-context.md for autopilot guidance
  meta: Record<string, string>;
  sections: BdSection[];

  // Prime Minister mode fields
  mode?: ConvoyMode;
  primeEnabled?: boolean;
  pendingQuestion?: PendingQuestion;
  answer?: Answer;
  decisionLog?: DecisionLogEntry[];
}

/**
 * @deprecated Use bd CLI for task organization instead.
 * This type will be removed in v0.2.0.
 */
export interface BdSection {
  name: string;
  tasks: BdTask[];
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

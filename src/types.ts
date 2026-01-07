// Core types for Gas Town
export type RoleName = 'mayor' | 'planner' | 'foreman' | 'polecat' | 'witness' | 'dog' | 'refinery';

export type TaskStatus = '🔵' | '🟡' | '✅' | '⚠️';

export interface BdTask {
  id: string;
  role: RoleName;
  roleInstance?: number;
  description: string;
  status: TaskStatus;
  notes: BdNote[];
}

export interface BdNote {
  key: string;
  value: string;
}

export interface BdFile {
  path: string;
  convoyName: string;
  convoyDescription: string;
  contextPath?: string; // Path to convoy-context.md for autopilot guidance
  meta: Record<string, string>;
  sections: BdSection[];
}

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

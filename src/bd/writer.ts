import type { BdFile, BdTask, BdSection, RoleName } from '../types.ts';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRole(role: RoleName, instance?: number): string {
  const name = capitalize(role);
  return instance ? `${name}-${instance}` : name;
}

/**
 * Convert a BdFile object to bd file format string.
 * @param bd - The BdFile object to serialize
 * @returns String content in bd file format
 */
export function writeBdContent(bd: BdFile): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${bd.convoyName}.bd`);
  lines.push('');
  lines.push(`## 🟡 Convoy: ${bd.convoyDescription}`);
  lines.push('');

  // Meta section
  lines.push('### Meta');
  for (const [key, value] of Object.entries(bd.meta)) {
    lines.push(`📝 ${key}: ${value}`);
  }
  lines.push('');

  // Sections
  for (const section of bd.sections) {
    lines.push(`### ${section.name}`);

    for (const task of section.tasks) {
      const roleStr = formatRole(task.role, task.roleInstance);
      lines.push(`${task.status} [${roleStr}] ${task.description}`);

      for (const note of task.notes) {
        lines.push(`  📝 ${note.key}: ${note.value}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Write a BdFile to disk.
 * @param bd - The BdFile object to write
 */
export async function writeBdFile(bd: BdFile): Promise<void> {
  const content = writeBdContent(bd);
  await Deno.writeTextFile(bd.path, content);
}

/**
 * Create a new BdFile with default structure for a task.
 * @param taskDescription - Description of the task/convoy
 * @param maxWorkers - Maximum number of parallel workers
 * @returns New BdFile structure with default sections
 */
export function createNewBd(taskDescription: string, maxWorkers: number): BdFile {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();

  // Generate convoy name from task description
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const convoyName = `convoy-${dateStr}-${slug}`;

  return {
    path: `${convoyName}.bd`,
    convoyName,
    convoyDescription: taskDescription,
    meta: {
      created: timestamp,
      phase: 'planning',
      'max-workers': String(maxWorkers),
    },
    sections: [
      {
        name: 'Coordination',
        tasks: [
          {
            id: 'mayor',
            role: 'mayor',
            description: 'Coordinating convoy',
            status: '🟡',
            notes: [
              { key: 'last-checkpoint', value: 'starting' },
              { key: 'context-usage', value: '0%' },
            ],
          },
        ],
      },
      {
        name: 'Planning',
        tasks: [
          {
            id: 'planner',
            role: 'planner',
            description: 'Brainstorming & Design',
            status: '🔵',
            notes: [],
          },
          {
            id: 'foreman',
            role: 'foreman',
            description: 'Implementation Plan',
            status: '🔵',
            notes: [{ key: 'depends', value: 'Planner' }],
          },
        ],
      },
      {
        name: 'Execution',
        tasks: [],
      },
    ],
  };
}

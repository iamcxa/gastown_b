// src/bd-cli/task.ts
import { execBd, execBdJson } from './executor.ts';

const TASK_LABEL = 'gt:task';
const TASK_TYPE = 'task';

export interface TaskCreateOptions {
  title: string;
  description?: string;
  labels?: string[];
  parentId?: string;
  deps?: string[];
  priority?: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  deps: string[];
}

interface BdShowResult {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  dependencies?: Array<{ id: string }>;
}

export async function createTask(options: TaskCreateOptions): Promise<TaskInfo> {
  if (!options.title || options.title.trim() === '') {
    throw new Error('Task title is required');
  }

  const args = [
    'create',
    options.title,
    '--type', TASK_TYPE,
    '--silent',
  ];

  if (options.description) {
    args.push('--description', options.description);
  }

  const labels = [TASK_LABEL, ...(options.labels ?? [])];
  args.push('--labels', labels.join(','));

  if (options.parentId) {
    args.push('--parent', options.parentId);
  }

  if (options.deps && options.deps.length > 0) {
    args.push('--deps', options.deps.join(','));
  }

  if (options.priority !== undefined) {
    args.push('--priority', String(options.priority));
  }

  const id = await execBd(args);
  return getTask(id.trim());
}

export async function getTask(id: string): Promise<TaskInfo> {
  const results = await execBdJson<BdShowResult[]>(['show', id]);

  if (!results || results.length === 0) {
    throw new Error(`Task not found: ${id}`);
  }

  const result = results[0];

  return {
    id: result.id,
    title: result.title,
    description: result.description ?? '',
    status: result.status,
    labels: result.labels ?? [],
    deps: result.dependencies?.map((d) => d.id) ?? [],
  };
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  await execBd(['update', id, '--status', status]);
}

export async function addTaskComment(id: string, comment: string): Promise<void> {
  await execBd(['comments', 'add', id, comment]);
}

export async function setTaskState(
  id: string,
  dimension: string,
  value: string,
  reason?: string
): Promise<void> {
  const args = ['set-state', id, `${dimension}=${value}`];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function closeTask(id: string, reason?: string): Promise<void> {
  const args = ['close', id];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function getReadyTasks(convoyId?: string): Promise<TaskInfo[]> {
  const args = ['ready', '--label', TASK_LABEL];

  const results = await execBdJson<BdShowResult[]>(args);

  return results
    .filter((r) => !convoyId || r.labels?.includes(`convoy:${convoyId}`))
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      status: r.status,
      labels: r.labels ?? [],
      deps: r.dependencies?.map((d) => d.id) ?? [],
    }));
}

export async function addTaskDependency(taskId: string, dependsOnId: string): Promise<void> {
  await execBd(['dep', 'add', taskId, dependsOnId]);
}

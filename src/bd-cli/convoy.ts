// src/bd-cli/convoy.ts
import { execBd, execBdJson } from './executor.ts';

export interface ConvoyCreateOptions {
  title: string;
  description?: string;
  maxWorkers?: number;
  labels?: string[];
}

export interface ConvoyInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  createdAt: string;
}

interface BdShowResult {
  id: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  created_at: string;
}

export async function createConvoy(options: ConvoyCreateOptions): Promise<ConvoyInfo> {
  const args = [
    'create',
    options.title,
    '--type', 'epic',
    '--silent',
  ];

  if (options.description) {
    args.push('--description', options.description);
  }

  const labels = ['convoy', ...(options.labels || [])];
  if (options.maxWorkers) {
    labels.push(`max-workers:${options.maxWorkers}`);
  }
  args.push('--labels', labels.join(','));

  const id = await execBd(args);

  return getConvoy(id.trim());
}

export async function getConvoy(id: string): Promise<ConvoyInfo> {
  // bd show returns an array, even for single ID
  const results = await execBdJson<BdShowResult[]>(['show', id]);

  if (!results || results.length === 0) {
    throw new Error(`Convoy not found: ${id}`);
  }

  const result = results[0];

  return {
    id: result.id,
    title: result.title,
    description: result.description || '',
    status: result.status,
    labels: result.labels || [],
    createdAt: result.created_at,
  };
}

export async function closeConvoy(id: string, reason?: string): Promise<void> {
  const args = ['close', id];
  if (reason) {
    args.push('--reason', reason);
  }
  await execBd(args);
}

export async function listConvoys(status?: string): Promise<ConvoyInfo[]> {
  const args = ['list', '--labels', 'convoy'];
  if (status) {
    args.push('--status', status);
  }

  const results = await execBdJson<BdShowResult[]>(args);
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    status: r.status,
    labels: r.labels || [],
    createdAt: r.created_at,
  }));
}

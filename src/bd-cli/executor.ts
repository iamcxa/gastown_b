// src/bd-cli/executor.ts

export interface BdExecOptions {
  cwd?: string;
  silent?: boolean;
}

export async function execBd(
  args: string[],
  options: BdExecOptions = {}
): Promise<string> {
  const cmd = new Deno.Command('bd', {
    args,
    cwd: options.cwd,
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code, stdout, stderr } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);

  if (code !== 0) {
    throw new Error(`bd command failed: ${err || out}`);
  }

  return out.trim();
}

export async function execBdJson<T = unknown>(
  args: string[],
  options: BdExecOptions = {}
): Promise<T> {
  const output = await execBd([...args, '--json'], options);
  return JSON.parse(output) as T;
}

export async function execBdQuiet(
  args: string[],
  options: BdExecOptions = {}
): Promise<string> {
  return execBd([...args, '--quiet'], options);
}

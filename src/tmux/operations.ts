export type SplitDirection = 'horizontal' | 'vertical';

export function buildTmuxCommand(args: string[]): string {
  return `tmux ${args.join(' ')}`;
}

export function buildNewSessionCommand(sessionName: string, command?: string): string {
  const args = ['new-session', '-d', '-s', sessionName];
  if (command) {
    args.push(`"${command}"`);
  }
  return buildTmuxCommand(args);
}

export function buildSplitPaneCommand(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): string {
  const dirFlag = direction === 'horizontal' ? '-h' : '-v';
  return buildTmuxCommand(['split-window', '-t', sessionName, dirFlag, `"${command}"`]);
}

export function buildSelectPaneCommand(sessionName: string, paneIndex: string): string {
  return buildTmuxCommand(['select-pane', '-t', `${sessionName}:0.${paneIndex}`]);
}

export function buildRenamePaneCommand(sessionName: string, paneIndex: string, title: string): string {
  return buildTmuxCommand([
    'select-pane',
    '-t',
    `${sessionName}:0.${paneIndex}`,
    '-T',
    `"${title}"`,
  ]);
}

export function buildKillPaneCommand(sessionName: string, paneIndex: string): string {
  return buildTmuxCommand(['kill-pane', '-t', `${sessionName}:0.${paneIndex}`]);
}

export function buildKillSessionCommand(sessionName: string): string {
  return buildTmuxCommand(['kill-session', '-t', sessionName]);
}

export function buildAttachCommand(sessionName: string): string {
  return buildTmuxCommand(['attach-session', '-t', sessionName]);
}

export function buildListSessionsCommand(): string {
  return buildTmuxCommand(['list-sessions']);
}

export function buildListPanesCommand(sessionName: string): string {
  return buildTmuxCommand(['list-panes', '-t', sessionName, '-F', '"#{pane_index}:#{pane_title}"']);
}

export function buildSendKeysCommand(sessionName: string, paneIndex: string, keys: string): string {
  return buildTmuxCommand(['send-keys', '-t', `${sessionName}:0.${paneIndex}`, `"${keys}"`, 'Enter']);
}

export function parseSessionList(output: string): string[] {
  const lines = output.trim().split('\n');
  return lines
    .map((line) => line.split(':')[0])
    .filter((name) => name.startsWith('gastown-'));
}

export function parsePaneList(output: string): Array<{ index: string; title: string }> {
  const lines = output.trim().split('\n');
  return lines.map((line) => {
    const [index, title] = line.replace(/"/g, '').split(':');
    return { index, title: title || '' };
  });
}

// Execution helpers
export async function runTmuxCommand(command: string): Promise<{ success: boolean; output: string }> {
  try {
    const process = new Deno.Command('sh', {
      args: ['-c', command],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await process.output();
    const output = new TextDecoder().decode(code === 0 ? stdout : stderr);

    return { success: code === 0, output: output.trim() };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

export async function createSession(sessionName: string, command?: string): Promise<boolean> {
  const cmd = buildNewSessionCommand(sessionName, command);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function splitPane(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): Promise<boolean> {
  const cmd = buildSplitPaneCommand(sessionName, command, direction);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function killPane(sessionName: string, paneIndex: string): Promise<boolean> {
  const cmd = buildKillPaneCommand(sessionName, paneIndex);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function killSession(sessionName: string): Promise<boolean> {
  const cmd = buildKillSessionCommand(sessionName);
  const result = await runTmuxCommand(cmd);
  return result.success;
}

export async function attachSession(sessionName: string): Promise<void> {
  const cmd = buildAttachCommand(sessionName);
  const process = new Deno.Command('sh', {
    args: ['-c', cmd],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await process.output();
}

export async function listSessions(): Promise<string[]> {
  const cmd = buildListSessionsCommand();
  const result = await runTmuxCommand(cmd);
  if (!result.success) return [];
  return parseSessionList(result.output);
}

export async function sessionExists(sessionName: string): Promise<boolean> {
  const sessions = await listSessions();
  return sessions.includes(sessionName);
}

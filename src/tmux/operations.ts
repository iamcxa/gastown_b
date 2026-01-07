export type SplitDirection = 'horizontal' | 'vertical';

/**
 * Escape a string for safe use in shell single quotes.
 */
function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

export function buildTmuxCommand(args: string[]): string {
  return `tmux ${args.join(' ')}`;
}

export function buildNewSessionCommand(sessionName: string, command?: string): string {
  const args = ['new-session', '-d', '-s', shellEscape(sessionName)];
  if (command) {
    args.push(shellEscape(command));
  }
  return buildTmuxCommand(args);
}

export function buildSplitPaneCommand(
  sessionName: string,
  command: string,
  direction: SplitDirection = 'horizontal'
): string {
  const dirFlag = direction === 'horizontal' ? '-h' : '-v';
  return buildTmuxCommand(['split-window', '-t', shellEscape(sessionName), dirFlag, shellEscape(command)]);
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
    shellEscape(title),
  ]);
}

export function buildKillPaneCommand(sessionName: string, paneIndex: string): string {
  return buildTmuxCommand(['kill-pane', '-t', `${sessionName}:0.${paneIndex}`]);
}

export function buildKillSessionCommand(sessionName: string): string {
  return buildTmuxCommand(['kill-session', '-t', shellEscape(sessionName)]);
}

export function buildAttachCommand(sessionName: string): string {
  return buildTmuxCommand(['attach-session', '-t', shellEscape(sessionName)]);
}

export function buildListSessionsCommand(): string {
  return buildTmuxCommand(['list-sessions']);
}

export function buildListPanesCommand(sessionName: string): string {
  return buildTmuxCommand(['list-panes', '-t', sessionName, '-F', '"#{pane_index}:#{pane_title}"']);
}

export function buildSendKeysCommand(sessionName: string, paneIndex: string, keys: string): string {
  return buildTmuxCommand(['send-keys', '-t', `${sessionName}:0.${paneIndex}`, shellEscape(keys), 'Enter']);
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

// Debug mode - set GASTOWN_DEBUG=1 to enable verbose logging
const DEBUG = Deno.env.get('GASTOWN_DEBUG') === '1';

function debug(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.error('[DEBUG]', message, ...args);
  }
}

// Execution helpers
export async function runTmuxCommand(command: string): Promise<{ success: boolean; output: string }> {
  debug('Running tmux command:', command);

  try {
    const process = new Deno.Command('sh', {
      args: ['-c', command],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await process.output();
    const stdoutStr = new TextDecoder().decode(stdout);
    const stderrStr = new TextDecoder().decode(stderr);
    const output = code === 0 ? stdoutStr : stderrStr;

    debug('tmux exit code:', code);
    if (stdoutStr) debug('tmux stdout:', stdoutStr);
    if (stderrStr) debug('tmux stderr:', stderrStr);

    return { success: code === 0, output: output.trim() };
  } catch (error) {
    debug('tmux error:', error);
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

/**
 * Build command to capture pane output.
 * Uses tmux capture-pane with -p (print to stdout) and -S (start line).
 * Negative start line captures from end of scrollback.
 */
export function buildCapturePaneCommand(
  sessionName: string,
  paneIndex: string,
  lines: number = 50
): string {
  // -t target pane, -p print to stdout, -S start line (negative = from end)
  return buildTmuxCommand([
    'capture-pane',
    '-t',
    `${sessionName}:0.${paneIndex}`,
    '-p',
    '-S',
    `-${lines}`,
  ]);
}

/**
 * Capture pane output for monitoring.
 * Returns the last N lines from the specified pane.
 * Used by Prime Minister to monitor Mayor's output.
 */
export async function capturePaneOutput(
  sessionName: string,
  paneIndex: string,
  lines: number = 50
): Promise<string> {
  const cmd = buildCapturePaneCommand(sessionName, paneIndex, lines);
  const result = await runTmuxCommand(cmd);
  return result.output;
}

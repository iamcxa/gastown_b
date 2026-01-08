import type { RoleName } from '../types.ts';

export const ROLE_ICONS: Record<RoleName, string> = {
  mayor: '\u{1F396}\uFE0F',
  planner: '\u{1F4D0}',
  foreman: '\u{1F527}',
  polecat: '\u26A1',
  witness: '\u{1F441}\uFE0F',
  dog: '\u{1F415}',
  refinery: '\u{1F3ED}',
  prime: '\u{1F3DB}\uFE0F',
};

export const ROLE_COLORS: Record<RoleName, string> = {
  mayor: 'yellow',
  planner: 'cyan',
  foreman: 'magenta',
  polecat: 'green',
  witness: 'blue',
  dog: 'white',
  refinery: 'red',
  prime: 'colour208', // orange
};

/**
 * Build tmux commands to configure status bar for a gastown session.
 */
export function buildStatusBarConfig(
  role: RoleName,
  convoyId: string,
  task: string,
): string[] {
  const icon = ROLE_ICONS[role];
  const color = ROLE_COLORS[role];
  const shortTask = task.length > 40 ? task.substring(0, 37) + '...' : task;

  return [
    // Status bar styling
    `set-option -g status-style "bg=colour235,fg=white"`,

    // Left side: role icon and name
    `set-option -g status-left "#[fg=${color},bold] ${icon} ${role.toUpperCase()} #[default]| "`,
    `set-option -g status-left-length 25`,

    // Right side: convoy and task
    `set-option -g status-right "#[fg=colour245]${convoyId}#[default] | #[fg=white]${shortTask}#[default]"`,
    `set-option -g status-right-length 60`,

    // Window status format
    `set-option -g window-status-format " #I:#W "`,
    `set-option -g window-status-current-format "#[fg=green,bold] #I:#W #[default]"`,

    // Pane border with role indicator
    `set-option -g pane-border-format " #{pane_index}: #{pane_title} "`,
    `set-option -g pane-border-status top`,
  ];
}

/**
 * Build tmux command to set pane title.
 */
export function buildSetPaneTitleCommand(
  sessionName: string,
  paneIndex: string,
  role: RoleName,
): string {
  const icon = ROLE_ICONS[role];
  return `tmux select-pane -t "${sessionName}:0.${paneIndex}" -T "${icon} ${role}"`;
}

/**
 * Build combined tmux commands for session initialization.
 */
export function buildSessionInitCommands(
  sessionName: string,
  role: RoleName,
  convoyId: string,
  task: string,
): string[] {
  const statusCommands = buildStatusBarConfig(role, convoyId, task);
  const targetedCommands = statusCommands.map(
    (cmd) => `tmux ${cmd} -t "${sessionName}"`,
  );

  // Add pane title for first pane
  targetedCommands.push(buildSetPaneTitleCommand(sessionName, '0', role));

  return targetedCommands;
}

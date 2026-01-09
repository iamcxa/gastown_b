// src/dashboard/commander-pane.ts

/**
 * Commander pane script generator for mprocs dashboard.
 * Creates a bash script that launches Claude Code with commander role.
 */

/**
 * Generate the Commander pane script content.
 *
 * Behavior:
 * - Shows a detail panel with Commander info
 * - [s] starts Claude Code with commander role
 * - Auto-restarts on exit (mprocs autorestart)
 *
 * @param gastownPath - Full path to gastown binary
 * @param agentFilePath - Full path to commander agent file (.claude/agents/commander.md)
 * @param projectRoot - Project root directory (for loading .claude/commands/)
 * @returns Bash script content
 */
export function generateCommanderScriptContent(gastownPath: string, agentFilePath?: string, projectRoot?: string): string {
  const agentFileVar = agentFilePath ? `AGENT_FILE="${agentFilePath}"` : `AGENT_FILE=""`;
  const projectRootVar = projectRoot ? `PROJECT_ROOT="${projectRoot}"` : `PROJECT_ROOT="$(pwd)"`;

  return `#!/bin/bash
# GAS TOWN - Commander Pane
# Launches Claude Code with commander role

GASTOWN_BIN="${gastownPath}"
${agentFileVar}
${projectRootVar}

# Colors (Purple/Magenta theme for Commander)
BG="\\033[48;5;53m"
FG="\\033[38;5;219m"
GOLD="\\033[38;5;220m"
DIM="\\033[38;5;243m"
RESET="\\033[0m"

SPIN=('◐' '◓' '◑' '◒')
FRAME=0

show_panel() {
  local spin=\${SPIN[\$FRAME]}
  FRAME=$(( (FRAME + 1) % 4 ))
  echo -ne "\${BG}"
  clear
  echo -e "\${GOLD}"
  echo "   ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗██████╗ "
  echo "  ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗"
  echo "  ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║█████╗  ██████╔╝"
  echo "  ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗"
  echo "  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████╗██║  ██║"
  echo "   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝"
  echo -e "\${FG}"
  echo " ╔══════════════════════════════════════════════════════════════════════════════╗"
  echo -e " ║  \${GOLD}\$spin COMMANDER - Total Control Interface\${FG}                                  ║"
  echo " ╠══════════════════════════════════════════════════════════════════════════════╣"
  echo " ║                                                                              ║"
  echo " ║  The Commander is your strategic interface to Gas Town.                      ║"
  echo " ║                                                                              ║"
  echo " ║  Capabilities:                                                               ║"
  echo " ║    • Start new convoys                                                       ║"
  echo " ║    • Monitor all active convoys                                              ║"
  echo " ║    • Check Linear issues                                                     ║"
  echo " ║    • Review PM decisions                                                     ║"
  echo " ║    • Set goals and priorities                                                ║"
  echo " ║                                                                              ║"
  echo " ╠══════════════════════════════════════════════════════════════════════════════╣"
  echo -e " ║  \${GOLD}[s]\${FG} START Commander (launch Claude Code)                                   ║"
  echo -e " ║  \${DIM}[C-a] Focus process list  [q] Exit\${FG}                                        ║"
  echo " ╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "\${RESET}"
}

start_commander() {
  echo -e "\\n\${GOLD}▶ Starting Commander...\${RESET}"
  # Change to project root so .claude/commands/ is loaded
  cd "\$PROJECT_ROOT" || exit 1
  echo -e "\${DIM}Working directory: \$PROJECT_ROOT\${RESET}"
  # Launch Claude Code with commander agent file
  # Uses --agent to load the full agent profile with YAML frontmatter
  # Agent file includes allowed_tools so no need for --allowedTools
  if [ -n "\$AGENT_FILE" ] && [ -f "\$AGENT_FILE" ]; then
    echo -e "\${DIM}Loading commander agent: \$AGENT_FILE\${RESET}"
    GASTOWN_ROLE=commander claude \\
      --agent "\$AGENT_FILE" \\
      --dangerously-skip-permissions \\
      "Start as Commander - display your character greeting and load your journal"
  else
    echo -e "\${GOLD}⚠ Agent file not found: \$AGENT_FILE\${RESET}"
    echo -e "\${DIM}Falling back to default Claude...\${RESET}"
    GASTOWN_ROLE=commander claude --dangerously-skip-permissions
  fi
}

# MAIN LOOP
while true; do
  show_panel
  read -t 1 -n 1 key 2>/dev/null || key=""
  case "\$key" in
    s|S) start_commander ;;
  esac
done
`;
}

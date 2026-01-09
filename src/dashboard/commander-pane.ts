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
 * @returns Bash script content
 */
export function generateCommanderScriptContent(gastownPath: string): string {
  return `#!/bin/bash
# GAS TOWN - Commander Pane
# Launches Claude Code with commander role

GASTOWN_BIN="${gastownPath}"

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
  # Launch Claude Code with commander agent profile
  # Uses .claude/agents/commander.md (symlinked from .gastown/agents/)
  GASTOWN_ROLE=commander claude --agent commander --dangerously-skip-permissions
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

---
name: mayor-enforcement
description: Enforce Mayor delegation - block direct file edits
event: PreToolUse
match_tools:
  - Edit
  - Write
  - NotebookEdit
---

# Mayor Delegation Enforcement

Check if the current agent is Mayor by looking at $GASTOWN_ROLE environment variable.

**If GASTOWN_ROLE is "mayor":**

BLOCK this tool use with message:
```
BLOCKED: Mayor cannot directly edit files.

As Mayor, you must delegate implementation work:
- Use: gastown spawn polecat --task "Implement: <description>"
- Use: gastown spawn planner --task "Design: <description>"

Mayor's role is coordination, not implementation.
```

**If GASTOWN_ROLE is NOT "mayor" or not set:**
ALLOW - other roles can edit files.

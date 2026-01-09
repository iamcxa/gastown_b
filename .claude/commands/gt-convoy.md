---
description: Show detailed status of a specific convoy
---

# Convoy Details

Show detailed information about a specific convoy.

## Usage

If convoy ID not specified, list available convoys and ask user to select.

## Steps

1. List convoys if no ID specified:
```bash
bd list --label gt:convoy --brief
```

2. Show convoy details:
```bash
bd show <convoy-id>
```

3. Show recent comments/activity:
```bash
bd comments <convoy-id> --limit 5
```

4. Display formatted output with convoy status, agents, and recent activity.

---
description: Set or update Commander goals
---

# Set/Update Goals

Update the Commander's current goals in the journal.

## Usage

Ask the user for the goal if not provided.

## Steps

1. Find Commander Journal:
```bash
JOURNAL_ID=$(bd list --label gt:commander --limit 1 --brief | head -1 | awk '{print $1}')
```

2. Add goal update comment:
```bash
bd comments add $JOURNAL_ID "GOAL_UPDATE: <goal text> ($(date))"
```

3. Display confirmation:
```
╭────────────────────────────────────────╮
│  🎯 GOAL UPDATED                       │
│  "<goal text>"                         │
╰────────────────────────────────────────╯
```

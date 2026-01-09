---
description: Check and sync Linear issues for the project
---

# Linear Status Check

Query Linear for assigned issues and display priority breakdown.

## Steps

1. Read Linear config if exists:
```bash
cat .gastown/linear-config.yaml 2>/dev/null || echo "No config"
```

2. Use Linear MCP tools to fetch issues assigned to current user.

3. Count by priority:
   - P0 (Urgent): priority = 0
   - P1 (High): priority = 1
   - P2+ (Other): priority >= 2

4. Display results:
```
╭────────────────────────────────────────╮
│  📊 LINEAR STATUS                      │
├────────────────────────────────────────┤
│  P0 (Urgent): X issues                 │
│  P1 (High):   Y issues                 │
│  P2+ (Other): Z issues                 │
├────────────────────────────────────────┤
│  Top Priority:                         │
│  • [P0] LIN-123: Description           │
╰────────────────────────────────────────╯
```

5. Log to Commander Journal:
```bash
JOURNAL_ID=$(bd list --label gt:commander --limit 1 --brief | head -1 | awk '{print $1}')
bd comments add $JOURNAL_ID "LINEAR_SYNC: P0=X P1=Y P2+=Z ($(date))"
```

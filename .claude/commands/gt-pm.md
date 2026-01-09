---
description: Show Prime Minister status and decision history
---

# Prime Minister Status

Show PM decision statistics and recent history.

## Steps

1. Find PM decisions in convoy comments:
```bash
bd list --label gt:convoy --status in_progress --brief | while read id rest; do
  bd comments "$id" 2>/dev/null | grep -E "^(ANSWER|ESCALATE):"
done
```

2. Count decisions by confidence level (high/medium/low/escalated).

3. Display:
```
╭────────────────────────────────────────╮
│  👑 PM STATUS                          │
├────────────────────────────────────────┤
│  Decisions: X total                    │
│  • High confidence: A                  │
│  • Medium confidence: B                │
│  • Escalated to human: C               │
├────────────────────────────────────────┤
│  Recent Decisions:                     │
│  • [high] Auth: Use Supabase           │
╰────────────────────────────────────────╯
```

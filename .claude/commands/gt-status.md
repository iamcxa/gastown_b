---
description: Show Gas Town convoy status and fleet overview
---

# Gas Town Status

Show the current status of all convoys and the fleet.

## Steps

1. Run this command to get convoy status:
```bash
gastown --status
```

2. Also check bd for convoy issues:
```bash
bd list --label gt:convoy --brief
```

3. Display a summary in this format:
```
╭────────────────────────────────────────╮
│  🚛 FLEET STATUS                       │
├────────────────────────────────────────┤
│  Active: X  │  Idle: Y  │  Total: Z    │
╰────────────────────────────────────────╯
```

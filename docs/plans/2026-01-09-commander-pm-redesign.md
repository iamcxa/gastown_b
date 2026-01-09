# Commander / PM 職責重構設計文件

> **Created:** 2026-01-09
> **Author:** Kent + Claude
> **Status:** Draft - Pending Implementation

## 概述

重構 PM (Prime Minister) 和 Mayor 的職責，引入新的 Commander 角色作為人類的主要互動介面，並將 PM 改為事件驅動的背景執行模式。

## 目標

1. Mayor 在一定範圍內有更多自主權
2. PM 改為事件觸發，避免持續 polling 消耗 context
3. Dashboard Control Room 顯示更多資訊（車隊數量、token 耗用、執行時間、活動摘要）
4. 新增 Commander 角色作為總指揮，監控整個 gastown
5. 整合 Linear 任務追蹤
6. 避免單一角色 context 過載

---

## 現有 Codebase 狀態

> **重要**: 在開始實作前，需了解目前已存在的功能，避免重複工作。

### 已存在的 Dashboard 功能

| 檔案 | 功能 | 狀態 |
|------|------|------|
| `src/dashboard/mprocs.ts` | mprocs 設定生成 | ✅ 完整 |
| `src/dashboard/dashboard.ts` | Dashboard 啟動器 | ✅ 完整 |
| `src/dashboard/mod.ts` | 模組匯出 | ✅ 完整 |

### `mprocs.ts` 現有功能

```typescript
// 已實作的函數
generateStatusScriptContent()     // Control Room bash 腳本
generateConvoyScriptContent()     // Convoy pane bash 腳本 (支援 auto-attach)
generateWelcomeScript()           // 無車隊時的歡迎畫面
generateMprocsConfig()            // mprocs.yaml 生成
writeMprocsConfig()               // 寫入設定檔到 temp dir
```

### Control Room 現有顯示內容

```
目前顯示：                          設計要求：
─────────────────────────────────────────────────────────
✅ GAS TOWN ASCII Banner           ✅ 保留
✅ SYSTEM STATUS                   ✅ 保留
   - TIMESTAMP                        - TIMESTAMP
   - UPTIME                           - RUNTIME (改名)
   - PLATFORM                         - PLATFORM
❌ (無)                             ◈ CONVOYS (Active/Idle/Total)
❌ (無)                             ◈ TOKENS (估算)
❌ (無)                             ◈ LINEAR (P0/P1/P2+)
⚠️ CONVOY OPERATIONS (簡易)        ◆ CURRENT ACTIVITY (增強)
❌ (無)                             ◆ COMMANDER STATUS
✅ MPROCS CONTROLS                 ✅ 保留
```

### mprocs 面板現況

```
目前：
┌──────────────┬────────────────────────────────────────────┐
│ ◈ CONTROL    │ ▶ convoy-abc   │ ▶ convoy-xyz   │ ◇ WELCOME│
│   ROOM       │   (auto-attach)│   (auto-attach)│ (無車隊) │
└──────────────┴────────────────────────────────────────────┘

設計：
┌──────────────┬──────────────┬────────────────────────────┐
│ ◈ CONTROL    │ 💬 COMMANDER │ ▶ convoy-abc │ ▶ convoy-xyz│
│   ROOM       │   (新增!)     │              │             │
└──────────────┴──────────────┴────────────────────────────┘
```

---

## 系統架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GAS TOWN CONTROL CENTER                       │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ ◈ CONTROL ROOM  │ 💬 COMMANDER    │ ▶ convoy-abc   │ ▶ convoy-xyz   │
│   (純狀態顯示)   │   (互動介面)     │   (Mayor)      │   (Mayor)      │
└─────────────────┴─────────────────┴─────────────────────────────────┘
                          │
                          │ 人類在 Commander pane 下指令
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    bd event hooks (bash)                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  on QUESTION event → launch PM agent                        │    │
│  │  on HEALTH_CHECK event → launch Monitor agent               │    │
│  │  on LINEAR_SYNC event → launch Linear Scout                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                        ↑ 零 context 成本                             │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Specialist Agents (按需啟動)                       │
│                                                                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                   │
│  │     PM     │   │  Monitor   │   │   Linear   │                   │
│  │ (決策顧問)  │   │ (健康檢查)  │   │   Scout    │                   │
│  └────────────┘   └────────────┘   └────────────┘                   │
│        │                │                │                           │
│        └────────────────┴────────────────┘                           │
│                         │                                            │
│              context > 70% → respawn                                 │
│              checkpoint → bd comments                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 角色定義

| 角色 | 類型 | 職責 | Context 策略 |
|------|------|------|-------------|
| **Commander** | 持續運行 | 總指揮、決策、目標追蹤 | 有自己的 Journal，auto-respawn |
| **Linear Scout** | 按需啟動 | Linear 過濾、設定驗證 | 用完即退，零累積 |
| **PM** | 按需啟動 | 回答 Mayor 的決策問題 | hook 觸發，用完即退 |
| **Monitor** | 按需啟動 | 系統健康檢查 | 定期或手動觸發 |
| **Mayor** | 持續運行 | 車隊協調（維持現狀） | 現有 respawn 機制 |

### 關鍵改變

1. **PM 從「持續監聽」改為「事件觸發」** - 不再 polling，改用 bd hook
2. **新增 Commander** - 人類的主要互動對象，有持久記憶
3. **新增 Linear Scout** - 隔離 Linear 查詢邏輯
4. **Control Room 分離** - 純顯示 vs 互動分開

---

## Control Room 設計

### 顯示內容

```
╔══════════════════════════════════════════════════════════════════════╗
║  ◐ SYSTEM STATUS                              gt v1.2.0              ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ◈ CONVOYS        │ Active: 2  │ Idle: 1  │ Total: 3                ║
║  ◈ RUNTIME        │ 01:23:45                                        ║
║  ◈ TOKENS         │ ~45,000 (estimated)                             ║
║  ◈ LINEAR         │ P0: 1 ⚠️  │ P1: 3  │ P2+: 12                    ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  ◆ CURRENT ACTIVITY                                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  convoy-abc │ ▶ Planning auth feature    │ Planner active           ║
║  convoy-xyz │ ◇ Waiting for review       │ Witness spawning         ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  ◆ COMMANDER STATUS                                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  Last decision: "Approved convoy-abc design" (5 min ago)             ║
║  Goal: Complete auth feature by EOD                                  ║
║  Context: 45% ████████░░░░░░░░                                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 資料來源

| 欄位 | 來源 | 更新頻率 |
|------|------|---------|
| Convoys | `bd list --label gt:convoy` | 5s |
| Runtime | Session start time | 1s |
| Tokens | 估算（從 respawn 次數推斷） | 30s |
| Linear | 從 Commander Journal 讀取 | 手動觸發後更新 |
| Activity | `bd list --status in_progress` | 5s |
| Commander Status | Commander Journal | 5s |

---

## Commander 設計

### Commander Journal (bd issue)

```yaml
# beads-CMD-001
title: "Commander Journal"
type: epic
labels: [gt:commander]
status: open  # 永遠 open，不會關閉

description: |
  Commander 的認知歷史與狀態追蹤。
  每次 session 啟動時讀取，結束時更新。

design: |
  ## Current Goals
  - [ ] Complete auth feature (LIN-123)
  - [ ] Fix dashboard bug (LIN-456) - P0

  ## Linear Config
  last_sync: 2026-01-09T14:00:00Z
  cycle: "Sprint 23 (Jan 6-19)"
  filters:
    assignee: kent
    labels: [gastown]

  ## Session State
  context_usage: 45%
  decisions_this_session: 3

# Comments 作為時間軸歷史
comments:
  - "[2026-01-09 14:00] SESSION_START: Commander online"
  - "[2026-01-09 14:01] LINEAR_SYNC: 2 issues (1 P0, 1 P1)"
  - "[2026-01-09 14:05] OBSERVATION: convoy-abc planner completed"
  - "[2026-01-09 14:10] DECISION: Approved auth design. Reason: Aligns with context file"
  - "[2026-01-09 14:30] GOAL_UPDATE: P0 LIN-456 now in progress via convoy-xyz"
  - "[2026-01-09 15:00] CHECKPOINT: context=70%, preparing respawn"
```

### Commander 啟動流程

```
1. 讀取 Journal (bd show beads-CMD-xxx)
2. 解析 design 欄位 → 恢復 goals, config, state
3. 讀取最近 20 條 comments → 恢復認知歷史
4. 顯示狀態摘要給人類
5. 進入等待指令狀態
```

### Commander 可執行的指令

| 指令 | 動作 |
|------|------|
| `check linear` | 啟動 Linear Scout，更新待辦清單 |
| `status` | 顯示所有車隊狀態 |
| `start <task>` | 啟動新車隊 |
| `goal <text>` | 設定/更新目標 |
| `approve <convoy>` | 批准車隊的設計/決策 |
| `pause <convoy>` | 暫停車隊 |
| `resume <convoy>` | 恢復車隊 |
| `brainstorm <topic>` | 使用 brainstorming skill |
| `pm status` | 查看 PM 統計 |
| `pm history` | 查看 PM 決策歷史 |

### Auto-Respawn 機制

```
context > 70%:
  1. 寫入 CHECKPOINT comment
  2. 更新 design 欄位中的 session state
  3. bd sync
  4. 顯示 "Context 70%, will respawn in 30s..."
  5. Exit，mprocs 自動重啟
  6. 新 session 從 Journal 恢復
```

### Commander 自主權等級

| Priority | 行為 |
|----------|------|
| P0 (緊急) | 🚨 "緊急！10 秒後自動啟動車隊處理 LIN-456" [Enter 確認 / Esc 取消] |
| P1 (高) | 📋 "建議啟動車隊處理 LIN-123 (Auth feature)" 要我開始嗎？ [y/n] |
| P2+ (一般) | 📝 "待辦清單已更新，有 3 個新 issues" (不主動建議，等人類指示) |

---

## PM 設計

### 角色轉變

- **舊設計**: PM 持續運行，每 2-3 秒 polling Mayor's pane
- **新設計**: PM 由 bd hook 觸發，回答後 exit

### PM Decision Log (bd issue)

```yaml
# beads-PM-001
title: "PM Decision Log"
type: epic
labels: [gt:pm]
status: open  # 永遠 open

description: |
  PM 的決策紀錄，供 Commander 審視。

  ## Statistics
  total_questions: 47
  answered_from_context: 38 (81%)
  answered_from_inference: 7 (15%)
  escalated_to_human: 2 (4%)

# Comments 作為決策歷史
comments:
  - "[2026-01-09 14:05] DECISION convoy=abc-123
     Q: REST or GraphQL for API?
     A: REST
     Confidence: high
     Source: context file section 3.2
     Reasoning: Context specifies 'prefer REST for simplicity'"
```

### PM 觸發流程

```
Mayor 遇到問題
    │
    ▼
bd comments add "QUESTION [decision]: 該用 REST 還是 GraphQL?"
    │
    ▼
bd hook 偵測到 QUESTION
    │
    ▼
gastown spawn pm --convoy $CONVOY_ID  (背景執行，無 pane)
    │
    ▼
PM 啟動:
  1. 讀取問題
  2. 讀取 context file
  3. 決定答案
  4. bd comments add "ANSWER [high]: Use REST because..."
  5. 記錄到 PM Decision Log
  6. Exit
    │
    ▼
Mayor poll bd, 收到答案，繼續工作
```

---

## Linear Scout 設計

### Agent 定義

```yaml
name: linear-scout
description: 輕量 Linear 偵察兵 - 驗證設定、回傳過濾清單
allowed_tools:
  - mcp__linear__*
  - Read
  - Bash
  # BLOCKED: Edit, Write, Task, AskUserQuestion
```

### 設定檔

```yaml
# .gastown/linear-config.yaml
linear:
  team: "TEAM_ID"  # 或 null 表示所有 teams

  filters:
    assignee: "me"           # "me", username, 或 "unassigned"
    states:
      - todo
      - in_progress
    priority_max: 2          # 0=Urgent, 1=High, 2=Medium, 3=Low, 4=None
    labels: []               # 空 = 不過濾 label
    cycle: "current"         # "current", "next", "all", 或 specific ID

  output:
    max_items: 20
    sort_by: "priority"      # priority, updated, created
```

### Scout 輸出格式

```json
{
  "status": "success",
  "cycle": {
    "name": "Sprint 23",
    "start": "2026-01-06",
    "end": "2026-01-19"
  },
  "issues": [
    {
      "id": "LIN-456",
      "title": "Fix dashboard rendering bug",
      "priority": 0,
      "state": "todo",
      "assignee": "kent",
      "labels": ["bug", "gastown"]
    },
    {
      "id": "LIN-123",
      "title": "Implement user authentication",
      "priority": 1,
      "state": "in_progress",
      "assignee": null,
      "labels": ["feature"]
    }
  ],
  "summary": {
    "total": 2,
    "by_priority": { "P0": 1, "P1": 1 },
    "unassigned": 1
  }
}
```

### Scout 生命週期

```
啟動 → 讀取 config → 驗證連線 → 查詢 → 輸出 JSON → Exit
        (1s)          (1s)        (2s)     (立即)

總生命週期: ~5 秒
Context 使用: 最小化（只做一件事）
```

---

## 事件與 Hook 系統

### bd 事件類型

| 事件 | 觸發條件 | 處理者 |
|------|---------|--------|
| `QUESTION` | Mayor 寫入 `QUESTION:` comment | PM agent |
| `HEALTH_CHECK` | 定時 / 手動觸發 | Monitor agent |
| `LINEAR_SYNC` | Commander 請求 | Linear Scout |
| `CONVOY_COMPLETE` | 車隊完成所有任務 | Commander (通知) |
| `RESPAWN_NEEDED` | Agent context > 70% | 系統自動處理 |

### Hook 實作

```bash
# .gastown/hooks/bd-event-dispatcher.sh
# bd 的 post-comment hook

EVENT_TYPE=$(echo "$COMMENT" | grep -oE '^(QUESTION|HEALTH_CHECK|LINEAR_SYNC)')

case "$EVENT_TYPE" in
  QUESTION)
    if [[ "$COMMENT" == *"QUESTION ["* ]]; then
      gastown spawn pm --convoy "$CONVOY_ID" &
    fi
    ;;
  HEALTH_CHECK)
    gastown spawn monitor &
    ;;
  LINEAR_SYNC)
    gastown spawn linear-scout &
    ;;
esac
```

---

## CLI 設計

### 指令總覽

| 指令 | 說明 |
|------|------|
| `gastown dashboard` / `-d` | 啟動 mprocs dashboard |
| `gastown start "task"` | 從終端機啟動新車隊（加入現有 dashboard） |
| `gastown "task"` | 傳統 Mayor 模式（無 PM，無 Commander） |
| `gastown --prime "task"` | 舊模式（Mayor + PM panes，向後相容） |

### Commander 內部指令

| 指令 | 說明 |
|------|------|
| `start "task"` | 啟動新車隊 |
| `check linear` | 觸發 Linear Scout |
| `status` | 顯示所有車隊狀態 |
| `pm status` | 查看 PM 統計 |
| `pm history` | 查看 PM 決策歷史 |
| `goal <text>` | 設定目標 |

---

## 實作計畫

### 檔案變更詳細清單

#### 🆕 新增檔案

| 檔案 | 用途 | 優先級 |
|------|------|--------|
| `.gastown/agents/commander.md` | Commander agent 定義 | P1 |
| `.gastown/agents/linear-scout.md` | Linear Scout agent 定義 | P2 |
| `.gastown/agents/monitor.md` | Monitor agent 定義 | P3 |
| `.gastown/linear-config.yaml` | Linear 過濾設定 | P2 |
| `.gastown/hooks/bd-event-dispatcher.sh` | 事件分派 hook | P1 |
| `src/dashboard/commander-pane.ts` | Commander pane 腳本生成 | P1 |

#### ✏️ 修改檔案

| 檔案 | 變更內容 | 影響函數 |
|------|---------|---------|
| `src/dashboard/mprocs.ts` | 新增 Commander pane | `generateMprocsConfig()` |
| `src/dashboard/mprocs.ts` | 增強 Control Room 顯示 | `generateStatusScriptContent()` |
| `src/dashboard/dashboard.ts` | 支援 Commander pane 啟動 | `launchDashboard()` |
| `.gastown/agents/pm.md` | 從持續監聽改為事件觸發 | (agent prompt) |
| `.gastown/agents/mayor.md` | 移除 PM polling，改用 bd event | (agent prompt) |
| `src/cli/commands.ts` | 新增 spawn commander/linear-scout | `spawn()` |
| `gastown.ts` | (已支援 dashboard，無需修改) | - |
| `README.md` | 更新使用說明 | - |

#### `mprocs.ts` 修改細節

```typescript
// generateStatusScriptContent() 需要增加：
// 1. print_convoy_stats()    - 顯示 Convoys Active/Idle/Total
// 2. print_runtime()         - 顯示執行時間 (從 session start)
// 3. print_token_estimate()  - 顯示估算 token 用量
// 4. print_linear_summary()  - 顯示 Linear P0/P1/P2+ 計數
// 5. print_activity()        - 增強版活動顯示
// 6. print_commander_status()- 顯示 Commander 狀態

// generateMprocsConfig() 需要增加：
// 1. Commander pane 定義 (在 Control Room 之後)
// 2. Commander pane 使用獨立腳本檔
```

### 實作順序

```
Phase 1: Dashboard 基礎 (先讓 Commander pane 出現)
├── 1.1 新增 src/dashboard/commander-pane.ts
│       - generateCommanderScriptContent() 函數
│       - Commander 啟動腳本 (類似 convoy pane)
├── 1.2 修改 src/dashboard/mprocs.ts
│       - generateMprocsConfig() 新增 Commander pane
│       - writeMprocsConfig() 寫入 Commander 腳本
└── 1.3 測試：gastown dashboard 顯示 Commander pane

Phase 2: Commander Agent
├── 2.1 撰寫 .gastown/agents/commander.md
│       - 定義 allowed_tools
│       - 定義啟動流程 (讀取 Journal)
│       - 定義可執行指令
├── 2.2 建立 Commander Journal bd issue 結構
│       - beads-CMD-001 epic
│       - 初始 design 欄位格式
└── 2.3 測試：Commander 可在 pane 中啟動

Phase 3: Control Room 增強
├── 3.1 修改 generateStatusScriptContent()
│       - 新增 convoy stats 區塊
│       - 新增 runtime 顯示
│       - 新增 activity 增強顯示
├── 3.2 整合 Commander Journal 狀態
│       - 讀取 bd show beads-CMD-xxx
│       - 顯示 last decision, goal, context%
└── 3.3 測試：Control Room 顯示增強資訊

Phase 4: PM 事件化
├── 4.1 實作 .gastown/hooks/bd-event-dispatcher.sh
├── 4.2 修改 .gastown/agents/pm.md (移除 polling)
├── 4.3 修改 .gastown/agents/mayor.md (使用 bd event)
├── 4.4 建立 PM Decision Log (beads-PM-001)
└── 4.5 測試：Mayor → PM 問答流程

Phase 5: Linear 整合
├── 5.1 撰寫 .gastown/agents/linear-scout.md
├── 5.2 建立 .gastown/linear-config.yaml
├── 5.3 整合 Linear 狀態到 Control Room
└── 5.4 測試：Commander > check linear

Phase 6: 整合與文件
├── 6.1 端到端測試
├── 6.2 更新 README.md
└── 6.3 更新 CLAUDE.md (如需要)
```

### 向後相容

| 功能 | 相容性 |
|------|--------|
| `gastown "task"` | ✅ 維持現狀，啟動 Mayor mode |
| `gastown --prime "task"` | ✅ 保留舊模式 (Mayor + PM panes) |
| `gastown dashboard` | 🆕 新功能 |
| 現有車隊 | ✅ 可繼續運行 |

---

## 成功標準

### Phase 1 完成標準
- [ ] `gastown dashboard` 顯示 Control Room + Commander pane
- [ ] Commander pane 可以啟動 Claude Code

### Phase 2 完成標準
- [ ] Commander agent 定義完成 (commander.md)
- [ ] Commander Journal (beads-CMD-001) 可正常讀寫
- [ ] Commander 啟動時能恢復 Journal 狀態

### Phase 3 完成標準
- [ ] Control Room 顯示 convoy stats (Active/Idle/Total)
- [ ] Control Room 顯示 runtime
- [ ] Control Room 顯示 Commander 狀態

### Phase 4 完成標準
- [ ] bd-event-dispatcher.sh hook 運作正常
- [ ] PM 由 hook 觸發（不再 polling）
- [ ] PM Decision Log (beads-PM-001) 記錄決策
- [ ] Mayor → PM 問答流程完整

### Phase 5 完成標準
- [ ] Linear Scout 可查詢過濾後的 issues
- [ ] Control Room 顯示 Linear P0/P1/P2+ 計數
- [ ] Commander > check linear 指令運作

### Phase 6 完成標準
- [ ] `gastown --prime` 舊模式仍可運作
- [ ] README.md 更新完成
- [ ] 端到端測試通過

---

*Created: 2026-01-09*
*Updated: 2026-01-09 (新增現有 codebase 狀態、細化實作計畫)*
*Author: Kent + Claude*

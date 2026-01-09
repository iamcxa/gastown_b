# Paydirt + Goldflow 設計文件

> **Date**: 2026-01-09
> **Status**: Approved
> **Migration**: Gas Town → Paydirt

---

## 1. 架構總覽

### 核心原則：意義與機制分離

這不是單純的改名，而是架構重構。Gas Town 混合了兩個關注點：
- 人類導向的意義（角色、所有權、意圖）
- 機器導向的執行（管線、重試、驗證、指標）

新架構明確分離這兩層：

| 層次 | 名稱 | 角色 | 關注點 |
|------|------|------|--------|
| 語意層 | **Paydirt** (Town) | 人類意圖、角色、敘事 | **什麼**和**為什麼** |
| 執行層 | **Goldflow** (River) | 管線、驗證、指標 | **如何**可靠執行 |

### 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAYDIRT (Town)                           │
│         語意層 - 人類意圖、角色、敘事                              │
│                                                                 │
│   Chief Prospector (Human)                                      │
│         │                                                       │
│         ├── Boomtown (Dashboard/HQ)                             │
│         │      └── Camp Boss (Commander)                        │
│         │                                                       │
│         └── Claims (Projects)                                   │
│                └── Caravans (Work Teams)                        │
│                       └── Prospects (Agents)                    │
│                              └── Tunnels (State) + Ledger       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ decides WHAT & WHY
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GOLDFLOW (River)                          │
│         執行層 - 管線、驗證、指標                                  │
│                                                                 │
│   Sources → Stages → Processors → Verifiers → Sinks             │
│                          │                                      │
│                    Controllers + Metrics                        │
│                                                                 │
│         decides HOW to execute reliably                         │
└─────────────────────────────────────────────────────────────────┘
```

### 關鍵規則

```
描述系統時 → 使用 Paydirt 術語
實作管線時 → 使用 Goldflow 術語
永不混用兩層概念
```

---

## 2. Paydirt 層（語意層）

### 核心概念

| 概念 | 說明 | 對應 Gas Town |
|------|------|---------------|
| **Chief Prospector** | 人類擁有者/決策者 | Human/User |
| **Claim** | 專案/代碼庫，你宣示、探索、投資的領地 | Project/Repo |
| **Caravan** | 探勘隊伍，一組 Prospects 協作完成任務 | Convoy |
| **Prospect** | Agent 工人，有目的的角色 | Agent |
| **Tunnel** | 持久狀態和記憶，跨 session 保存 | State/Context |
| **Ledger** | 歷史、成本、結果記錄 | History/Metrics |
| **Boomtown** | 控制中心/Dashboard | Dashboard |

### Prospect 角色體系

**指揮層**
- **Camp Boss** - 營地管理者，人類的主要介面，監控全局
- **Claim Agent** - 礦權代理人，代表 Chief Prospector 做決策

**協調層**
- **Trail Boss** - 車隊領隊，協調 Caravan，與用戶互動
- **Shift Boss** - 班長，將設計分解為可執行任務

**專業層**
- **Surveyor** - 測量員，勘測地形、設計方案
- **Miner** - 礦工，實際挖掘（寫程式碼）
- **Assayer** - 化驗員，驗證品質（程式碼審查）
- **Canary** - 金絲雀，安全偵測（測試）
- **Smelter** - 冶煉工，提純產出（程式碼品質）
- **Scout** - 偵察兵，探索外部資源（Linear、GitHub）

### 角色映射表

| Gas Town | Paydirt | 掏金隱喻 | 職責 |
|----------|---------|----------|------|
| Commander | **Camp Boss** | 營地管理者 | 戰略監控、人類介面 |
| Mayor | **Trail Boss** | 車隊領隊 | Caravan 協調、用戶互動 |
| Planner | **Surveyor** | 測量員 | 勘測地形、設計方案 |
| Foreman | **Shift Boss** | 班長 | 任務分解、工作排程 |
| Polecat | **Miner** | 礦工 | 挖掘（實作程式碼） |
| Witness | **Assayer** | 化驗員 | 驗金（程式碼審查） |
| Dog | **Canary** | 金絲雀 | 安全偵測（測試） |
| Refinery | **Smelter** | 冶煉工 | 提純（程式碼品質） |
| PM/Prime | **Claim Agent** | 礦權代理人 | 代表礦主決策 |
| Linear-Scout | **Scout** | 偵察兵 | 探索新領域（外部資料） |

---

## 3. Goldflow 層（執行層）

### 核心原則

Goldflow 是一個**確定性的價值流系統**：
- 無角色、無角色個性
- 將輸入（prompts、specs、issues）轉換為輸出（code、PRs、artifacts）
- 負責規劃、執行、驗證、重試、測量
- 可獨立於 Paydirt 演進（新模型、管線、基礎設施）

### Goldflow 組件

```
┌─────────┐    ┌─────────┐    ┌────────────┐    ┌───────────┐    ┌───────┐
│ Sources │───▶│ Stages  │───▶│ Processors │───▶│ Verifiers │───▶│ Sinks │
└─────────┘    └─────────┘    └────────────┘    └───────────┘    └───────┘
                                    │                 │
                              ┌─────┴─────────────────┴─────┐
                              │        Controllers          │
                              │        + Metrics            │
                              └─────────────────────────────┘
```

| 組件 | 職責 | 範例 |
|------|------|------|
| **Sources** | 輸入來源 | Linear issues、GitHub PRs、用戶輸入 |
| **Stages** | 工作流階段 | Planning、Implementation、Review |
| **Processors** | 處理器（LLM、工具） | Claude 執行實作、測試 |
| **Verifiers** | 驗證閘門 | 測試通過、規則檢查、人類審核 |
| **Sinks** | 輸出目的地 | PRs、Commits、Artifacts |
| **Controllers** | 流程編排 | 重試邏輯、並行控制、狀態機 |
| **Metrics** | 測量記錄 | 成本、時間、成功率 |

### Paydirt → Goldflow 映射

| Paydirt 角色 | Goldflow 組件 | 說明 |
|-------------|---------------|------|
| Camp Boss | **Controller** | 全局控制 |
| Trail Boss | **Controller** | Caravan 流程控制 |
| Surveyor | **Stage** | 規劃階段 |
| Shift Boss | **Controller** | 任務分配控制 |
| Miner | **Processor** | 核心處理器（LLM 執行） |
| Assayer | **Verifier** | 品質驗證閘門 |
| Canary | **Verifier** | 安全驗證閘門 |
| Smelter | **Verifier** | 品質改善處理 |
| Claim Agent | **Controller** | 決策路由控制 |
| Scout | **Source** | 外部輸入源 |

---

## 4. Goldflow × Superpowers 整合

### 核心理念

**Goldflow 的 Processor/Verifier 由 Superpowers 驅動：**
- 每個 Prospect 角色綁定特定的 Superpowers
- Superpowers 定義「如何可靠執行」
- Paydirt 決定「派誰去」，Goldflow (Superpowers) 決定「怎麼做」

### Prospect × Superpowers 映射

| Prospect | Goldflow 組件 | Superpowers |
|----------|---------------|-------------|
| **Trail Boss** | Controller | `dispatching-parallel-agents`, `finishing-a-development-branch` |
| **Surveyor** | Stage | `brainstorming`, `writing-plans` |
| **Shift Boss** | Controller | `subagent-driven-development`, `writing-plans` |
| **Miner** | Processor | `executing-plans`, `test-driven-development` |
| **Assayer** | Verifier | `requesting-code-review`, `receiving-code-review` |
| **Canary** | Verifier | `test-driven-development`, `verification-before-completion` |
| **Smelter** | Verifier | `systematic-debugging` |
| **Claim Agent** | Controller | (決策路由，無特定 skill) |
| **Scout** | Source | (外部資料獲取，無特定 skill) |
| **Camp Boss** | Controller | `dispatching-parallel-agents` |

### Goldflow 執行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         GOLDFLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source ──▶ Stage ──▶ Processor ──▶ Verifier ──▶ Sink          │
│    │         │           │            │                        │
│    │         │           │            │                        │
│  Scout    Surveyor     Miner      Assayer/                     │
│           uses:        uses:      Canary/Smelter               │
│           • brainstorming         uses:                        │
│           • writing-plans   • executing-plans                  │
│                            • TDD     • code-review             │
│                                      • verification            │
│                                      • debugging               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Controller: Trail Boss / Shift Boss                      │   │
│  │ uses: dispatching-parallel-agents, subagent-driven-dev   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Goldflow 配置範例

```yaml
# goldflow.yaml
processors:
  miner:
    superpowers:
      - executing-plans
      - test-driven-development
    retry_policy: 3
    timeout: 30m

verifiers:
  assayer:
    superpowers:
      - requesting-code-review
    gates:
      - tests_pass
      - no_security_issues

  canary:
    superpowers:
      - verification-before-completion
    gates:
      - all_tests_pass
      - coverage_threshold: 80%

controllers:
  trail-boss:
    superpowers:
      - dispatching-parallel-agents
      - finishing-a-development-branch
    max_parallel: 3
```

---

## 5. BD 記錄模式

### 三種記錄模式

| 模式 | 角色 | 記錄位置 | 說明 |
|------|------|----------|------|
| **Caravan 模式** | Trail Boss, Miner, Assayer, Canary, Smelter, Surveyor, Shift Boss | `$PAYDIRT_CLAIM` (Caravan) | 工人記錄到所屬 Caravan |
| **Agent 模式** | Claim Agent | Caravan + **Decision Ledger** | 雙寫：回答到 Caravan，決策記錄到獨立帳簿 |
| **Journal 模式** | Camp Boss | **Commander Journal** | 獨立日誌，監控所有 Caravan |

### 模式一：Caravan 記錄（一般 Prospect）

```bash
# 讀取任務
bd show $PAYDIRT_CLAIM

# 更新狀態
bd agent state $PAYDIRT_CLAIM working
bd agent state $PAYDIRT_CLAIM done
bd agent heartbeat $PAYDIRT_CLAIM

# 記錄進度（各角色有不同前綴）
bd comments add $PAYDIRT_CLAIM "PROGRESS: 3/5 steps done"
bd comments add $PAYDIRT_CLAIM "REVIEW: approved"
bd comments add $PAYDIRT_CLAIM "TEST-RESULT: pass"
bd comments add $PAYDIRT_CLAIM "AUDIT: pass"
bd comments add $PAYDIRT_CLAIM "OUTPUT: design=docs/plans/..."
bd comments add $PAYDIRT_CLAIM "TASKS: [task list]"
bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=85%"

# 更新狀態
bd update $PAYDIRT_CLAIM --status "done"
```

**Comment 前綴對照：**

| Prospect | 前綴 |
|----------|------|
| Miner | `PROGRESS:`, `CHECKPOINT:` |
| Assayer | `REVIEW:` |
| Canary | `TEST-RESULT:` |
| Smelter | `AUDIT:` |
| Surveyor | `OUTPUT:` |
| Shift Boss | `TASKS:` |
| Trail Boss | `PROGRESS:`, `DECISION:`, `QUESTION:` |

### 模式二：Agent 記錄（Claim Agent）

```bash
# 1. 讀取 Caravan 中的問題
bd show $PAYDIRT_CLAIM
bd comments $PAYDIRT_CLAIM  # 找 QUESTION: 前綴

# 2. 回答寫回 Caravan
bd comments add $PAYDIRT_CLAIM "ANSWER [high]: Use Supabase Auth.
Reasoning: Context file specifies 'Use Supabase ecosystem'."

# 3. 同時記錄到 Decision Ledger（永久決策記錄）
LEDGER=$(bd list --label paydirt:ledger --type epic --limit 1 --brief | head -1)
bd comments add $LEDGER "DECISION caravan=$PAYDIRT_CARAVAN
Q: Which auth provider?
A: Supabase Auth
Confidence: high
Source: context
Reasoning: Context file specifies..."

# 4. 記錄到 Caravan 的 DECISION-LOG
bd comments add $PAYDIRT_CLAIM "DECISION-LOG: q=auth provider, a=Supabase, source=context, confidence=high"
```

### 模式三：Journal 記錄（Camp Boss）

```bash
# 1. 找到 Commander Journal
JOURNAL=$(bd list --label paydirt:camp-boss --limit 1 --brief | head -1)

# 2. 記錄觀察
bd comments add $JOURNAL "[timestamp] OBSERVATION: caravan-abc completed planning"

# 3. 記錄決策
bd comments add $JOURNAL "[timestamp] DECISION: Approved auth design. Reason: ..."

# 4. 更新目標
bd comments add $JOURNAL "[timestamp] GOAL_UPDATE: Added P0 task from Linear"

# 5. 記錄外部同步
bd comments add $JOURNAL "LINEAR_SYNC: P0=2 P1=5 P2+=10 (timestamp)"
```

### BD Label 設計

| Label | 用途 |
|-------|------|
| `paydirt:caravan` | 標記 Caravan（工作團隊） |
| `paydirt:prospect` | 標記 Prospect agent bead |
| `paydirt:camp-boss` | Camp Boss Journal |
| `paydirt:ledger` | Decision Ledger |
| `paydirt:tunnel` | 持久狀態記錄 |
| `paydirt:mode:prime` | Prime 模式標記 |
| `paydirt:backlog` | 待辦佇列 |

### BD 記錄頻率規範

每個 Prospect 必須遵循以下記錄規則，確保工作進度可追蹤、可恢復。

#### 通用規則（所有 Prospect）

| 事件 | 必須執行的 bd 命令 | 說明 |
|------|-------------------|------|
| **開始工作** | `bd agent state $PAYDIRT_CLAIM working` | 宣告開始處理任務 |
| **每完成一個步驟** | `bd comments add $PAYDIRT_CLAIM "PROGRESS: X/Y steps"` | 記錄進度比例 |
| **每 5 分鐘（長任務）** | `bd agent heartbeat $PAYDIRT_CLAIM` | 證明仍在運作 |
| **Context > 70%** | `bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=X%..."` | 準備 respawn |
| **Context > 85%** | `bd agent state $PAYDIRT_CLAIM stuck` | 觸發 respawn 流程 |
| **完成工作** | `bd agent state $PAYDIRT_CLAIM done` | 標記完成 |
| **遇到阻塞** | `bd agent state $PAYDIRT_CLAIM blocked` + `QUESTION:` comment | 等待回答 |
| **產出交付物** | `bd comments add $PAYDIRT_CLAIM "OUTPUT: ..."` | 記錄產出位置 |

#### 各角色特定記錄規則

##### Camp Boss（Journal 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 收到 Scout 報告 | `DISCOVERY:` | `bd comments add $JOURNAL "DISCOVERY: [Linear] LIN-456..."` |
| 收到用戶請求 | `REQUEST:` | `bd comments add $JOURNAL "REQUEST: User wants..."` |
| 做出進件決策 | `INTAKE_DECISION:` | `bd comments add $JOURNAL "INTAKE_DECISION: task → STAKE"` |
| Caravan 狀態變更 | `OBSERVATION:` | `bd comments add $JOURNAL "OBSERVATION: caravan completed"` |
| 每 10 分鐘 | `LINEAR_SYNC:` | `bd comments add $JOURNAL "LINEAR_SYNC: P0=2 P1=5..."` |

##### Trail Boss（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始 Caravan | `bd update --status in_progress` | 標記 Caravan 開始 |
| 委派前 | `DECISION:` | `"DECISION: Spawning Surveyor for design"` |
| 需要決策時 | `QUESTION:` | `"QUESTION [decision]: Which auth provider?"` |
| 收到 Prospect 完成 | `PROGRESS:` | `"PROGRESS: Design complete, starting breakdown"` |
| 每次委派後 | Heartbeat | `bd agent heartbeat $PAYDIRT_CLAIM` |
| 所有任務完成 | `bd update --status ready-for-review` | 進入交付流程 |

##### Surveyor（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始設計 | State + Progress | `bd agent state ... working` + `"PROGRESS: Starting brainstorm"` |
| brainstorming 完成 | `PROGRESS:` | `"PROGRESS: Brainstorm done, writing plan"` |
| 設計文檔完成 | `OUTPUT:` | `"OUTPUT: design=docs/plans/YYYY-MM-DD-feature.md"` |
| 完成 | State | `bd agent state ... done` |

##### Shift Boss（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始分解 | State | `bd agent state ... working` |
| 每創建 3 個任務 | `TASKS:` | `"TASKS: created pd-001, pd-002, pd-003"` |
| 設定依賴 | `TASKS:` | `"TASKS: pd-002 depends on pd-001"` |
| 所有任務創建完成 | `TASKS:` + State | `"TASKS: [pd-001..pd-010] ready"` + done |

##### Miner（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始實作 | State | `bd agent state ... working` |
| **每完成一個 TDD cycle** | `PROGRESS:` | `"PROGRESS: 3/5 steps, files: src/auth.ts"` |
| 每次 git commit | `PROGRESS:` | `"PROGRESS: Committed: feat(auth): add login"` |
| Context > 70% | `CHECKPOINT:` | `"CHECKPOINT: context=75%, current-file=src/auth.ts:125"` |
| 任務完成 | State + Status | `bd agent state ... done` + `--status ready-for-review` |

##### Assayer（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始審查 | State | `bd agent state ... working` |
| 每個檔案審查完 | `REVIEW:` | `"REVIEW: src/auth.ts - 2 issues found"` |
| 審查完成（通過） | `REVIEW:` | `"REVIEW: APPROVED - no critical issues"` |
| 審查完成（不通過） | `REVIEW:` | `"REVIEW: REJECTED - 3 issues require fix"` |
| Gate 結果 | `REVIEW_GATE_1:` | `"REVIEW_GATE_1: status=pass, findings=[...]"` |

##### Canary（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始測試 | State | `bd agent state ... working` |
| 每個測試套件完成 | `TEST-RESULT:` | `"TEST-RESULT: auth.spec.ts - 12 pass, 0 fail"` |
| 測試全部通過 | `TEST-RESULT:` | `"TEST-RESULT: pass, coverage=87%, 42 tests"` |
| 測試失敗 | `TEST-RESULT:` | `"TEST-RESULT: fail, 2 failures: [list]"` |

##### Smelter（Caravan 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 開始審計 | State | `bd agent state ... working` |
| Lint 完成 | `AUDIT:` | `"AUDIT: lint - 0 errors, 3 warnings"` |
| 類型檢查完成 | `AUDIT:` | `"AUDIT: typecheck - pass"` |
| 品質審計完成 | `AUDIT:` | `"AUDIT: pass - code quality acceptable"` |

##### Claim Agent（Agent 模式 - 雙寫）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 發現 QUESTION | 讀取 | `bd comments $PAYDIRT_CLAIM \| grep QUESTION` |
| 回答問題 | `ANSWER:` to Caravan | `"ANSWER [high]: Use Supabase Auth..."` |
| **同時** | `DECISION:` to Ledger | `bd comments add $LEDGER "DECISION caravan=..."` |
| 記錄決策摘要 | `DECISION-LOG:` to Caravan | `"DECISION-LOG: q=auth, a=Supabase, confidence=high"` |

##### Scout（Source 模式）

| 時機 | 記錄內容 | 範例 |
|------|----------|------|
| 發現新任務 | `DISCOVERY:` to Journal | `"DISCOVERY: [Linear] LIN-456 P1 assigned"` |
| 掃描完成 | `SCAN:` to Journal | `"SCAN: Linear checked, 3 new P1 issues"` |
| 外部狀態變更 | `EXTERNAL:` to Journal | `"EXTERNAL: PR #123 merged"` |

#### CHECKPOINT 格式規範

當 Context 使用率超過 70% 時，必須記錄完整 CHECKPOINT：

```bash
bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=75%
state: implementing step 4/5
current-file: src/auth.ts:125
current-function: validateToken
next-action: Add expiry check
pending-tests: auth.spec.ts
uncommitted-changes: yes
last-commit: abc123"
```

**必填欄位：**
- `context`: 目前 context 使用百分比
- `state`: 目前執行狀態描述
- `next-action`: 下一步要做什麼

**選填欄位：**
- `current-file`: 正在編輯的檔案
- `current-function`: 正在編輯的函數
- `pending-tests`: 待執行的測試
- `uncommitted-changes`: 是否有未 commit 的變更
- `last-commit`: 最後一次 commit hash

#### 記錄頻率檢查清單

每個 Prospect 啟動時應檢查：

```
[ ] 1. bd show $PAYDIRT_CLAIM - 讀取任務
[ ] 2. bd agent state $PAYDIRT_CLAIM working - 宣告開始
[ ] 3. bd comments $PAYDIRT_CLAIM - 檢查之前的 CHECKPOINT（如有）
```

每個 Prospect 結束時應執行：

```
[ ] 1. bd comments add $PAYDIRT_CLAIM "PROGRESS/OUTPUT/REVIEW/..." - 記錄結果
[ ] 2. bd agent state $PAYDIRT_CLAIM done - 標記完成
[ ] 3. bd update $PAYDIRT_CLAIM --status <next-status> - 更新狀態（如適用）
```

---

## 6. Camp Boss 任務進件流程

### 進件來源

```
┌─────────────────────────────────────────────────────────────────┐
│                      TASK INTAKE SOURCES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔭 Scout Report              👑 Chief Prospector (User)       │
│   (External: Linear,          (Direct command)                  │
│    GitHub, etc.)                                                │
│         │                              │                        │
│         ▼                              ▼                        │
│   ┌───────────┐                ┌───────────────┐                │
│   │ DISCOVERY │                │    REQUEST    │                │
│   └─────┬─────┘                └───────┬───────┘                │
│         │                              │                        │
│         └──────────────┬───────────────┘                        │
│                        ▼                                        │
│                 ⛺ Camp Boss                                     │
│                 (Intake Review)                                 │
│                        │                                        │
│         ┌──────────────┼──────────────┐                         │
│         ▼              ▼              ▼                         │
│    🚃 Stake       📋 Backlog     ❌ Reject                      │
│   (New Caravan)   (Queue)        (Decline)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 情境一：Scout 回報（外部發現）

```bash
# Scout 發現新任務，回報到 Camp Boss Journal
bd comments add $JOURNAL "DISCOVERY: [Linear] LIN-456 assigned
title: Fix authentication bug
priority: P1
assignee: @kent
url: https://linear.app/team/LIN-456"

# Camp Boss 決策
bd comments add $JOURNAL "INTAKE_DECISION: LIN-456 → STAKE
reason: P1 priority, auth system is critical
action: Starting new caravan"

# 執行
paydirt stake "Fix authentication bug (LIN-456)" --source linear:LIN-456
```

### 情境二：使用者直接請求

```bash
# 1. 記錄到 Journal
bd comments add $JOURNAL "REQUEST: User wants notification system
scope: in-app only
priority: P1
linear: none (will create)"

# 2. 啟動 Caravan
paydirt stake "Implement in-app notification system" --priority P1

# 3. 記錄決策
bd comments add $JOURNAL "INTAKE_DECISION: notification-system → STAKE
source: user-request
caravan: caravan-xyz
priority: P1"
```

### Journal 前綴整理

| 前綴 | 來源 | 說明 |
|------|------|------|
| `DISCOVERY:` | Scout | 外部發現的任務 |
| `REQUEST:` | User | 使用者直接請求 |
| `INTAKE_DECISION:` | Camp Boss | 進件決策記錄 |
| `OBSERVATION:` | Camp Boss | 一般觀察 |
| `GOAL_UPDATE:` | Camp Boss | 目標變更 |

---

## 7. Caravan 交付流程

### 交付流程總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                   CARAVAN DELIVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ✅ Implementation Complete                                    │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │  REVIEW GATE 1  │  superpowers:requesting-code-review      │
│   │  (Assayer)      │                                          │
│   └────────┬────────┘                                          │
│            │ pass                                               │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │  REVIEW GATE 2  │  code-review-toolkit:code-reviewer       │
│   │  (Plugin)       │                                          │
│   └────────┬────────┘                                          │
│            │ pass                                               │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │   PR CREATION   │  Based on repo's PR template             │
│   │                 │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │    CI GATE      │  Wait for GitHub Actions                 │
│   │                 │                                          │
│   └────────┬────────┘                                          │
│            │ pass                                               │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │   DELIVERED     │  Ready for merge                         │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 階段一：Superpowers Code Review（Assayer）

```bash
# Miner 完成後
bd update $PAYDIRT_CLAIM --status "ready-for-review"

# Assayer 執行 superpowers:requesting-code-review
# 記錄結果
bd comments add $PAYDIRT_CLAIM "REVIEW_GATE_1: superpowers-code-review
status: [pass|fail]
findings: [list]
action: [proceed|fix-required]"
```

### 階段二：Plugin Code Review

```bash
# 使用 code-review-toolkit agents
# - code-reviewer
# - silent-failure-hunter
# - type-design-analyzer (如適用)

bd comments add $PAYDIRT_CLAIM "REVIEW_GATE_2: code-review-toolkit
agents_run: [list]
status: [pass|fail]
findings: [list]
action: [proceed|fix-required]"
```

### 階段三：PR 創建

```bash
# 讀取 PR template
PR_TEMPLATE=$(cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null)

# 使用 superpowers:finishing-a-development-branch
# 創建 PR
gh pr create --title "..." --body "..."

# 記錄
bd comments add $PAYDIRT_CLAIM "PR_CREATED: #123
url: https://github.com/owner/repo/pull/123
template_used: .github/PULL_REQUEST_TEMPLATE.md"
```

### 階段四：CI Gate

```bash
# 等待 CI
gh pr checks <pr-number> --watch

# 記錄結果
bd comments add $PAYDIRT_CLAIM "CI_GATE: [pass|fail]
checks: [list]
duration: Xm"
```

### 階段五：交付完成

```bash
bd update $PAYDIRT_CLAIM --status "delivered"
bd comments add $PAYDIRT_CLAIM "DELIVERED: PR #123 ready for merge"
bd comments add $JOURNAL "OBSERVATION: Caravan $PAYDIRT_CARAVAN delivered PR #123"
```

### 狀態流轉

```
in_progress → ready-for-review → reviewing → pr-created → ci-pending → delivered
                    │                │            │
                    └── fix-required ←┴────────────┘
```

### Goldflow 交付管線定義

```yaml
# goldflow.yaml - delivery pipeline
pipelines:
  delivery:
    trigger: status == "ready-for-review"

    stages:
      - name: review-gate-1
        processor: assayer
        superpowers: [requesting-code-review]
        on_fail: return_to_miner

      - name: review-gate-2
        processor: code-review-toolkit
        agents: [code-reviewer, silent-failure-hunter]
        on_fail: return_to_miner

      - name: pr-creation
        processor: trail-boss
        superpowers: [finishing-a-development-branch]
        requires:
          - pr_template: .github/PULL_REQUEST_TEMPLATE.md

      - name: ci-gate
        verifier: github-actions
        timeout: 30m
        on_fail: return_to_miner

      - name: delivered
        sink: github-pr
        notify: camp-boss
```

---

## 8. 角色互動狀態流程

本節提供完整的端到端流程圖，說明當 Camp Boss 收到任務後，各角色如何互動與狀態流轉。

### 任務進件流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASK INTAKE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🔭 Scout                           👑 Chief Prospector (User)             │
│   DISCOVERY:                         REQUEST:                               │
│   └─> Linear/GitHub issue            └─> Direct command                     │
│       priority, assignee                 "pd stake 'task'"                  │
│                    │                              │                         │
│                    └──────────┬───────────────────┘                         │
│                               ▼                                             │
│                    ┌────────────────────┐                                   │
│                    │ ⛺ Camp Boss        │                                   │
│                    │   (Journal Mode)   │                                   │
│                    │   INTAKE_DECISION  │                                   │
│                    └─────────┬──────────┘                                   │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼               ▼               ▼                              │
│         🚃 STAKE        📋 BACKLOG      ❌ REJECT                           │
│         (New Caravan)   (Queue)         (Decline)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Task Intake（進件階段）

**Camp Boss 狀態**

| 狀態 | 說明 |
|------|------|
| `INTAKE_DECISION` | 評估任務優先級與可行性 |
| `STAKE` | 決定啟動新 Caravan |

```bash
# Camp Boss Journal 記錄
bd comments add $JOURNAL "REQUEST: User wants notification system
scope: in-app only
priority: P1
linear: none"

bd comments add $JOURNAL "INTAKE_DECISION: notification-system → STAKE
source: user-request
caravan: caravan-xyz
priority: P1"
```

### Phase 2: Caravan Creation（車隊創建）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CARAVAN CREATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Camp Boss executes:                                                       │
│   └─> paydirt stake "Implement notification system" --priority P1           │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  1. Creates bd epic with label paydirt:caravan                        │  │
│   │  2. Creates tmux session: paydirt-<claim-id>                         │  │
│   │  3. Sets environment variables:                                       │  │
│   │     - PAYDIRT_CLAIM=pd-xxx                                           │  │
│   │     - PAYDIRT_CARAVAN=notification-system                            │  │
│   │     - PAYDIRT_SESSION=paydirt-pd-xxx                                 │  │
│   │  4. Spawns 🤠 Trail Boss in Caravan                                   │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Planning（規劃階段）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLANNING PHASE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🤠 Trail Boss                                                             │
│   ├─> State: working                                                        │
│   ├─> bd agent state $PAYDIRT_CLAIM working                                │
│   ├─> Check for $PAYDIRT_TUNNEL (Autopilot mode context)                   │
│   │                                                                         │
│   │   IF Prime Mode:                                                        │
│   │   └─> Write QUESTION: to bd, wait for Claim Agent ANSWER:              │
│   │                                                                         │
│   │   IF Manual Mode:                                                       │
│   │   └─> AskUserQuestion for clarification                                │
│   │                                                                         │
│   └─> Spawns 📐 Surveyor:                                                   │
│       $PAYDIRT_BIN prospect surveyor --task "Design notification system"   │
│                                                                             │
│   📐 Surveyor                                                               │
│   ├─> State: working                                                        │
│   ├─> Invokes: superpowers:brainstorming                                   │
│   ├─> Invokes: superpowers:writing-plans                                   │
│   ├─> OUTPUT: docs/plans/YYYY-MM-DD-notification-design.md                  │
│   └─> bd comments add $PAYDIRT_CLAIM "OUTPUT: design=docs/plans/..."       │
│       bd agent state $PAYDIRT_CLAIM done                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Task Breakdown（任務分解）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TASK BREAKDOWN                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🤠 Trail Boss (receives Surveyor completion)                              │
│   └─> Spawns 👷 Shift Boss:                                                 │
│       $PAYDIRT_BIN prospect shift-boss --task "Create tasks from design"   │
│                                                                             │
│   👷 Shift Boss                                                             │
│   ├─> State: working                                                        │
│   ├─> Reads: docs/plans/YYYY-MM-DD-notification-design.md                  │
│   ├─> Invokes: superpowers:subagent-driven-development                     │
│   ├─> Creates bd sub-tasks:                                                │
│   │   bd create --title "Task 1: Setup DB schema" --type task              │
│   │   bd create --title "Task 2: Implement API" --type task                │
│   │   bd create --title "Task 3: Build UI" --type task                     │
│   │   bd dep add pd-task-2 pd-task-1  # API depends on schema              │
│   │                                                                         │
│   └─> bd comments add $PAYDIRT_CLAIM "TASKS: [pd-task-1, pd-task-2, ...]"  │
│       bd agent state $PAYDIRT_CLAIM done                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Implementation（實作階段）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🤠 Trail Boss                                                             │
│   └─> Invokes: superpowers:dispatching-parallel-agents                     │
│   └─> Spawns ⛏️ Miners for independent tasks:                              │
│       $PAYDIRT_BIN prospect miner --task "Implement: Setup DB schema"      │
│                                                                             │
│   ⛏️ Miner (per task)                                                       │
│   ├─> State: working                                                        │
│   ├─> bd show $PAYDIRT_CLAIM (read task details)                           │
│   ├─> Invokes: superpowers:executing-plans                                 │
│   ├─> Invokes: superpowers:test-driven-development                         │
│   │                                                                         │
│   │   TDD Loop:                                                             │
│   │   ┌─────────────────────────────────────────┐                          │
│   │   │  1. Write failing test                  │                          │
│   │   │  2. Implement minimal code              │                          │
│   │   │  3. Verify test passes                  │                          │
│   │   │  4. Commit                              │                          │
│   │   │  5. bd comments add "PROGRESS: X/Y"     │                          │
│   │   │  6. Repeat                              │                          │
│   │   └─────────────────────────────────────────┘                          │
│   │                                                                         │
│   ├─> Context Check (if > 80%):                                            │
│   │   bd comments add "CHECKPOINT: context=85%, state=..."                 │
│   │   bd agent state $PAYDIRT_CLAIM stuck → triggers respawn               │
│   │                                                                         │
│   └─> On completion:                                                        │
│       bd update $PAYDIRT_CLAIM --status "ready-for-review"                 │
│       bd agent state $PAYDIRT_CLAIM done                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 6: Delivery Pipeline（交付管線）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DELIVERY PIPELINE                                   │
│                      (Goldflow Verifier Chain)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Trigger: status == "ready-for-review"                                     │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 1: 🔬 Assayer (superpowers:requesting-code-review)             │   │
│   │ ├─> bd comments add "REVIEW_GATE_1: superpowers-code-review         │   │
│   │ │   status: [pass|fail]"                                            │   │
│   │ └─> On fail → return_to_miner                                       │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                ▼ pass                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 2: code-review-toolkit agents                                  │   │
│   │ ├─> code-reviewer                                                   │   │
│   │ ├─> silent-failure-hunter                                           │   │
│   │ ├─> type-design-analyzer (if applicable)                            │   │
│   │ └─> bd comments add "REVIEW_GATE_2: code-review-toolkit             │   │
│   │     agents_run: [...], status: [pass|fail]"                         │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                ▼ pass                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ PR CREATION: 🤠 Trail Boss                                          │   │
│   │ ├─> superpowers:finishing-a-development-branch                      │   │
│   │ ├─> Reads .github/PULL_REQUEST_TEMPLATE.md                          │   │
│   │ ├─> gh pr create --title "..." --body "..."                         │   │
│   │ └─> bd comments add "PR_CREATED: #123"                              │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ CI GATE: GitHub Actions                                             │   │
│   │ ├─> gh pr checks <pr-number> --watch                                │   │
│   │ └─> bd comments add "CI_GATE: [pass|fail]"                          │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                ▼ pass                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ DELIVERED                                                           │   │
│   │ ├─> bd update $PAYDIRT_CLAIM --status "delivered"                   │   │
│   │ └─> bd comments add $JOURNAL "OBSERVATION: Caravan delivered #123"  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 狀態流轉總覽

```
                               CARAVAN STATUS FLOW
 ┌────────────────────────────────────────────────────────────────────────────┐
 │                                                                            │
 │  open ──▶ in_progress ──▶ ready-for-review ──▶ reviewing ──▶ pr-created   │
 │                                  │                │            │           │
 │                                  │                │            │           │
 │                                  └── fix-required ◀────────────┘           │
 │                                                                            │
 │  pr-created ──▶ ci-pending ──▶ delivered ──▶ closed                        │
 │                      │                                                     │
 │                      └── fix-required                                      │
 │                                                                            │
 └────────────────────────────────────────────────────────────────────────────┘
```

### 角色狀態對照表

| Prospect | Goldflow | 觸發時機 | 輸入 | 輸出 | Superpowers |
|----------|----------|----------|------|------|-------------|
| **Camp Boss** | Controller | 任務進件 | Scout DISCOVERY / User REQUEST | INTAKE_DECISION | `dispatching-parallel-agents` |
| **Trail Boss** | Controller | Caravan 創建後 | 任務描述 | 協調指令 | `dispatching-parallel-agents`, `finishing-a-development-branch` |
| **Surveyor** | Stage | Trail Boss 委派 | 任務描述 | 設計文檔 | `brainstorming`, `writing-plans` |
| **Shift Boss** | Controller | 設計完成後 | 設計文檔 | bd 任務列表 | `subagent-driven-development` |
| **Miner** | Processor | Shift Boss 分配後 | 具體任務 | 程式碼 + 測試 | `executing-plans`, `test-driven-development` |
| **Assayer** | Verifier | ready-for-review | 程式碼變更 | 審查結果 | `requesting-code-review` |
| **Canary** | Verifier | 測試階段 | 程式碼 | 測試報告 | `verification-before-completion` |
| **Smelter** | Verifier | 品質改善 | 程式碼 | 重構結果 | `systematic-debugging` |
| **Claim Agent** | Controller | Prime Mode 問題 | QUESTION: | ANSWER: | (決策路由) |
| **Scout** | Source | 定期掃描 | Linear/GitHub | DISCOVERY: | (外部資料) |

---

## 9. Event-Driven 架構與 bd Message Bus

本節說明 Paydirt 的核心通訊機制：為何選擇 Event-Driven 架構而非 Claude 內建 Subagent，以及如何使用 bd CLI 作為 Message Bus。

### 9.1 架構選擇：為何不使用 Claude Subagent

Paydirt **不使用** Claude 內建的 Task tool (Subagent)，而是讓每個 Prospect 作為**獨立的 Claude process**，透過 bd CLI 進行通訊。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SUBAGENT vs EVENT-DRIVEN COMPARISON                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Claude Subagent (Task tool)          Paydirt Event-Driven                 │
│   ─────────────────────────            ─────────────────────                │
│                                                                             │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │  Claude Process A   │              │  Claude Process A   │              │
│   │  ┌───────────────┐  │              │  (Trail Boss)       │              │
│   │  │ Subagent B    │  │              └──────────┬──────────┘              │
│   │  │ (child)       │  │                         │                         │
│   │  └───────────────┘  │              bd comments│(Message Bus)            │
│   │  ┌───────────────┐  │                         │                         │
│   │  │ Subagent C    │  │              ┌──────────┴──────────┐              │
│   │  │ (child)       │  │              │  Claude Process B   │              │
│   │  └───────────────┘  │              │  (Surveyor)         │              │
│   └─────────────────────┘              └─────────────────────┘              │
│                                                                             │
│   Single API session                   Multiple independent sessions        │
│   Shared context (200K limit)          Each has own 200K context           │
│   No persistence                       Git-backed persistence               │
│   Cannot pause/inspect                 tmux: can attach anytime             │
│   No respawn on exhaustion             CHECKPOINT → respawn supported       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**選擇 Event-Driven 的理由：**

| 考量 | Subagent | Event-Driven | 優勝 |
|------|----------|--------------|------|
| **Context 隔離** | 共享 parent context | 各自獨立 200K | Event-Driven |
| **長任務支援** | Context exhaustion 後無法恢復 | CHECKPOINT + respawn | Event-Driven |
| **人類介入** | 執行中無法 pause | tmux 隨時 attach | Event-Driven |
| **持久化** | 無，session 結束即消失 | bd Git-backed | Event-Driven |
| **可觀測性** | 結果是 text blob | 結構化 bd comments | Event-Driven |
| **真正並行** | 受限單一 session | 多 tmux panes 並行 | Event-Driven |
| **成本** | 單一 API call | 多個 API calls | Subagent |
| **簡單任務** | 適合 | 過於複雜 | Subagent |

**結論**：Paydirt 的目標是長時間、複雜、需要人類介入的多 agent 協作，因此選擇 Event-Driven 架構。

### 9.2 bd CLI 作為 Message Bus

bd CLI 的 `comments` 功能是 Paydirt 的核心通訊機制。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BD AS MESSAGE BUS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Publisher                    Message Bus                    Subscriber    │
│   ─────────                    ───────────                    ──────────    │
│                                                                             │
│   Trail Boss    ─────────▶    .beads/*.jsonl    ─────────▶    Claim Agent  │
│   writes:                     (Git-backed)                    polls:        │
│   QUESTION:                                                   grep QUESTION │
│                                                                             │
│   Surveyor      ─────────▶         │            ─────────▶    Trail Boss   │
│   writes:                          │                          polls:        │
│   OUTPUT:                          │                          grep OUTPUT   │
│                                    │                                        │
│   Miner         ─────────▶         │            ─────────▶    Respawn      │
│   writes:                          │                          System        │
│   CHECKPOINT:                      │                          polls:        │
│                                    │                          grep CHECKPOINT│
│                                    │                                        │
│   bd comments add ────────▶   bd comments ────▶   bd comments | grep       │
│   (publish)                   (storage)           (subscribe)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Message Bus 特性：**

| 特性 | 說明 |
|------|------|
| **持久化** | Git-backed JSONL，可追溯歷史 |
| **可搜尋** | `bd comments <id> \| grep <prefix>` |
| **結構化** | JSON 輸出：`bd comments <id> --json` |
| **非同步** | Publisher 不需等待 Subscriber |
| **廣播** | 多個 Subscriber 可同時讀取 |

### 9.3 Comment Prefix = Event Type

每個 comment 前綴代表一種 Event Type：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMMENT PREFIX = EVENT TYPE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PREFIX           │ EVENT TYPE      │ PUBLISHER      │ SUBSCRIBER          │
│   ─────────────────┼─────────────────┼────────────────┼─────────────────────│
│   QUESTION:        │ 決策請求        │ Trail Boss     │ Claim Agent         │
│   ANSWER:          │ 決策回覆        │ Claim Agent    │ Trail Boss          │
│   OUTPUT:          │ 產出完成        │ Any Prospect   │ Trail Boss          │
│   PROGRESS:        │ 進度更新        │ Any Prospect   │ Monitor             │
│   CHECKPOINT:      │ 斷點記錄        │ Any Prospect   │ Respawn System      │
│   DISCOVERY:       │ 外部發現        │ Scout          │ Camp Boss           │
│   TASKS:           │ 任務列表        │ Shift Boss     │ Trail Boss          │
│   REVIEW:          │ 審查結果        │ Assayer        │ Trail Boss          │
│   TEST-RESULT:     │ 測試結果        │ Canary         │ Trail Boss          │
│   AUDIT:           │ 審計結果        │ Smelter        │ Trail Boss          │
│   DECISION:        │ 決策記錄        │ Trail Boss     │ Ledger              │
│   ESCALATE:        │ 升級人類        │ Claim Agent    │ Human               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**範例：**

```bash
# Trail Boss 發送決策請求
bd comments add $PAYDIRT_CLAIM "QUESTION [decision]: Which auth provider?
OPTIONS:
- Supabase Auth
- Firebase Auth
- Custom JWT"

# Claim Agent 回覆
bd comments add $PAYDIRT_CLAIM "ANSWER [high]: Use Supabase Auth.
Reasoning: Context file specifies 'Use Supabase ecosystem'."

# Surveyor 完成設計
bd comments add $PAYDIRT_CLAIM "OUTPUT: design=docs/plans/2026-01-09-auth-design.md"

# Miner 記錄斷點
bd comments add $PAYDIRT_CLAIM "CHECKPOINT: context=85%
state: implementing step 4/5
current-file: src/auth.ts:125
next-action: Add token validation"
```

### 9.4 Event Polling 機制

Prospect 透過 polling bd comments 來偵測事件：

```bash
#!/bin/bash
# event-polling-example.sh - Trail Boss 等待 Surveyor 完成

CLAIM_ID=$PAYDIRT_CLAIM
TIMEOUT=300  # 5 minutes
INTERVAL=5   # Check every 5 seconds
ELAPSED=0

echo "Waiting for Surveyor OUTPUT..."

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Poll for OUTPUT event
  OUTPUT=$(bd comments $CLAIM_ID 2>/dev/null | grep "^OUTPUT:" | tail -1)

  if [ -n "$OUTPUT" ]; then
    echo "Received: $OUTPUT"
    # Extract design path
    DESIGN_PATH=$(echo "$OUTPUT" | sed 's/OUTPUT: design=//')
    echo "Design document: $DESIGN_PATH"
    exit 0
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "Timeout waiting for OUTPUT"
exit 1
```

**Polling 策略：**

| Event Type | Polling 頻率 | Timeout | 處理方式 |
|------------|-------------|---------|----------|
| `ANSWER:` | 2-3 秒 | 5 分鐘 | 等待或升級人類 |
| `OUTPUT:` | 5 秒 | 30 分鐘 | 等待或檢查 stuck |
| `CHECKPOINT:` | 10 秒 | - | Respawn 系統監控 |
| `DISCOVERY:` | 60 秒 | - | Camp Boss 定期掃描 |

### 9.5 Claude Hooks 整合

Claude Code Hooks 可自動化事件偵測，取代手動 polling。

**Hook Events 與 Paydirt 整合：**

| Hook Event | Paydirt 用途 |
|------------|-------------|
| `SessionStart` | 載入 bd context、讀取 CHECKPOINT |
| `PostToolUse` | 偵測 bd comments 變化、自動派出 Claim Agent |
| `PreToolUse` | 存取控制（阻止 Camp Boss 編輯檔案） |
| `Stop` | 驗證是否真的完成、檢查 pending questions |
| `PreCompact` | 寫入 CHECKPOINT 到 bd |

**設定範例 (`.claude/settings.json`)：**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bd prime"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.paydirt/hooks/question-dispatcher.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "[ \"$PAYDIRT_PROSPECT\" = 'camp-boss' ] && echo '{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Camp Boss delegates, does not edit\"}}' && exit 0 || exit 0"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bd comments add $PAYDIRT_CLAIM \"CHECKPOINT: context=compacting, state=$(bd show $PAYDIRT_CLAIM --json | jq -r .status)\""
          }
        ]
      }
    ]
  }
}
```

**自動 Question Dispatcher Hook：**

```bash
#!/bin/bash
# .paydirt/hooks/question-dispatcher.sh
# PostToolUse hook: 自動偵測未回答的 QUESTION 並派出 Claim Agent

[ -z "$PAYDIRT_CLAIM" ] && exit 0

# 計算未回答的問題數
QUESTIONS=$(bd comments $PAYDIRT_CLAIM 2>/dev/null | grep -c "^QUESTION:")
ANSWERS=$(bd comments $PAYDIRT_CLAIM 2>/dev/null | grep -c "^ANSWER:")

if [ $QUESTIONS -gt $ANSWERS ]; then
  # 檢查 Claim Agent 是否已在運行
  CLAIM_AGENT_RUNNING=$(bd list --label paydirt:prospect --assignee claim-agent --status in_progress --brief 2>/dev/null | wc -l)

  if [ "$CLAIM_AGENT_RUNNING" -eq 0 ]; then
    echo "Detected unanswered questions ($QUESTIONS Q, $ANSWERS A), spawning Claim Agent" >&2
    $PAYDIRT_BIN prospect claim-agent --background &
  fi
fi

exit 0
```

### 9.6 完整 Event Flow 範例

以下是完整的 event-driven 流程，展示從任務進件到完成的所有事件：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE EVENT FLOW EXAMPLE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME    │ ACTOR         │ ACTION                │ BD COMMAND               │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+0     │ Human         │ pd stake "Auth"       │ bd create --type epic    │
│  T+1     │ CLI           │ Create Caravan        │ bd update --status open  │
│  T+2     │ CLI           │ Spawn Trail Boss      │ tmux + claude --agent    │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+3     │ Trail Boss    │ Start working         │ bd agent state working   │
│  T+4     │ Trail Boss    │ Need decision         │ bd comments add          │
│          │               │                       │ "QUESTION [decision]:    │
│          │               │                       │ Which auth provider?"    │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+5     │ Hook          │ Detect QUESTION       │ (PostToolUse triggered)  │
│  T+6     │ Hook          │ Spawn Claim Agent     │ pd prospect claim-agent  │
│  T+7     │ Claim Agent   │ Read context file     │ cat $PAYDIRT_TUNNEL      │
│  T+8     │ Claim Agent   │ Answer question       │ bd comments add          │
│          │               │                       │ "ANSWER [high]: Supabase"│
│  T+9     │ Claim Agent   │ Exit                  │ (process ends)           │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+10    │ Trail Boss    │ Poll sees ANSWER      │ bd comments | grep ANSWER│
│  T+11    │ Trail Boss    │ Spawn Surveyor        │ pd prospect surveyor     │
│  T+12    │ Surveyor      │ Start design          │ bd agent state working   │
│  T+13    │ Surveyor      │ Use brainstorming     │ Skill(brainstorming)     │
│  T+14    │ Surveyor      │ Write plan            │ Write to docs/plans/     │
│  T+15    │ Surveyor      │ Report output         │ bd comments add          │
│          │               │                       │ "OUTPUT: design=..."     │
│  T+16    │ Surveyor      │ Done                  │ bd agent state done      │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+17    │ Trail Boss    │ Poll sees OUTPUT      │ bd comments | grep OUTPUT│
│  T+18    │ Trail Boss    │ Spawn Shift Boss      │ pd prospect shift-boss   │
│  T+19    │ Shift Boss    │ Create tasks          │ bd create (multiple)     │
│  T+20    │ Shift Boss    │ Report tasks          │ bd comments add          │
│          │               │                       │ "TASKS: [pd-001,...]"    │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+21    │ Trail Boss    │ Poll sees TASKS       │ bd comments | grep TASKS │
│  T+22    │ Trail Boss    │ Spawn Miners (//l)    │ pd prospect miner (x3)   │
│  T+23-99 │ Miners        │ Implement + TDD       │ bd comments add PROGRESS │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+100   │ Miner #1      │ Context 85%           │ bd comments add          │
│          │               │                       │ "CHECKPOINT: context=85%"│
│  T+101   │ Miner #1      │ Mark stuck            │ bd agent state stuck     │
│  T+102   │ Respawn       │ Detect stuck          │ (monitoring system)      │
│  T+103   │ Respawn       │ Spawn new Miner       │ pd prospect miner        │
│          │               │                       │ --checkpoint             │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+150   │ All Miners    │ Complete              │ bd agent state done      │
│  T+151   │ Trail Boss    │ Update status         │ bd update                │
│          │               │                       │ --status ready-for-review│
│  T+152   │ Trail Boss    │ Spawn Assayer         │ pd prospect assayer      │
│  T+153   │ Assayer       │ Review code           │ Skill(code-review)       │
│  T+154   │ Assayer       │ Report result         │ bd comments add          │
│          │               │                       │ "REVIEW: APPROVED"       │
│  ────────┼───────────────┼───────────────────────┼──────────────────────────│
│  T+155   │ Trail Boss    │ Create PR             │ gh pr create             │
│  T+156   │ Trail Boss    │ Report PR             │ bd comments add          │
│          │               │                       │ "PR_CREATED: #123"       │
│  T+157   │ Trail Boss    │ Mark delivered        │ bd update                │
│          │               │                       │ --status delivered       │
│  T+158   │ Trail Boss    │ Notify Camp Boss      │ bd comments add $JOURNAL │
│          │               │                       │ "OBSERVATION: delivered" │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.7 Event-Driven 最佳實踐

**Publisher 規則：**

1. 使用標準前綴（QUESTION:, OUTPUT:, PROGRESS: 等）
2. 寫入後立即可被讀取（bd 是同步的）
3. 包含足夠 context 讓 subscriber 可以行動
4. 長內容使用多行格式

**Subscriber 規則：**

1. 使用 `grep` 過濾特定 prefix
2. 使用 `tail -1` 取最新事件（如適用）
3. 處理後考慮是否需要 ACK（寫入回應）
4. 設定合理 timeout 避免無限等待

**Hook 規則：**

1. Hook 應該快速執行（< 1 秒）
2. 長操作使用 `&` 背景執行
3. 檢查環境變數避免在錯誤 context 執行
4. 使用 exit 0 表示成功（不阻止操作）

---

## 10. CLI 與環境變數

### CLI 命令設計

```bash
# 主命令
paydirt <command> [options]

# 或簡寫
pd <command> [options]
```

| 命令 | 說明 | 掏金隱喻 |
|------|------|----------|
| `paydirt stake "task"` | 啟動新 Caravan | 插旗宣示礦權 |
| `paydirt continue [id]` | 恢復既有 Caravan | 繼續挖掘 |
| `paydirt survey [id]` | 查看狀態 | 勘測進度 |
| `paydirt abandon [id]` | 停止 Caravan | 放棄礦區 |
| `paydirt prospect <role>` | 派出特定角色 | 派出探勘者 |
| `paydirt boomtown` | 開啟 Dashboard | 進入繁榮鎮 |
| `paydirt ledger` | 查看歷史記錄 | 翻閱帳簿 |

### 環境變數

| 變數 | 說明 |
|------|------|
| `PAYDIRT_CLAIM` | 當前 Claim（bd issue）ID |
| `PAYDIRT_CARAVAN` | Caravan 名稱 |
| `PAYDIRT_PROSPECT` | 當前 Prospect 角色 |
| `PAYDIRT_SESSION` | tmux session 名稱 |
| `PAYDIRT_TUNNEL` | 持久狀態/Context 路徑 |
| `PAYDIRT_BIN` | CLI 執行檔路徑 |

### 目錄結構

```
.paydirt/
├── prospects/           # Prospect 角色定義
│   ├── camp-boss.md
│   ├── trail-boss.md
│   ├── surveyor.md
│   ├── shift-boss.md
│   ├── miner.md
│   ├── assayer.md
│   ├── canary.md
│   ├── smelter.md
│   ├── claim-agent.md
│   └── scout.md
├── tunnels/             # 持久狀態存儲
├── sources.yaml         # 外部資源配置
└── goldflow.yaml        # 執行引擎配置
```

---

## 10. 建構策略

### 建構原則

**不修改 gastown，全新建立 paydirt：**
- 在 `gastown_b/paydirt/` 下建立全新專案
- 參考 legacy code 但不 import/copy
- 使用 bd 追蹤所有建構任務
- 獨立 repo：`git@github.com:iamcxa/paydirt.git`

### 目錄結構

```
gastown_b/                    # 現有專案（參考用）
├── src/
├── .gastown/
├── gastown.ts
└── paydirt/                  # 🆕 新專案根目錄
    ├── .git/                 # 獨立 git repo
    ├── .beads/               # bd 追蹤
    ├── .paydirt/
    │   └── prospects/        # 角色定義
    ├── src/
    │   ├── paydirt/          # Paydirt 層（CLI、UX）
    │   └── goldflow/         # Goldflow 層（引擎）
    ├── paydirt.ts            # 主入口
    ├── deno.json
    └── README.md
```

### Git 設定

```bash
cd gastown_b
mkdir paydirt && cd paydirt
git init
git remote add origin git@github.com:iamcxa/paydirt.git
bd init --prefix paydirt
```

### 建構階段

**Phase 1：專案骨架**
- 初始化 Deno 專案結構
- 設定 git repo 和 bd
- 建立基本 CLI 框架（`pd`/`paydirt`）

**Phase 2：Paydirt 層**
- 實作 Prospect 角色定義
- 實作 Caravan 管理
- 實作 Claim/Tunnel/Ledger 概念

**Phase 3：Goldflow 層**
- 實作 Sources/Stages/Processors
- 實作 Verifiers/Sinks
- 實作 Controllers/Metrics

**Phase 4：整合**
- 連接 Paydirt ↔ Goldflow
- 實作 Dashboard (Boomtown)
- 完整測試

---

## 11. 視覺化角色設計

```
                    👑 Chief Prospector (Human)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ⛺ Boomtown     📜 Ledger      🗺️ Claims
         (Dashboard)     (History)     (Projects)
              │
              ▼
         🎖️ Camp Boss ─── "The operation runs smoothly."
              │
              ▼
    ┌─────── 🚃 Caravan ───────┐
    │                          │
    │  🤠 Trail Boss           │     "Let's move out!"
    │     │                    │
    │     ├── 📐 Surveyor      │     "I'll map the terrain."
    │     ├── 👷 Shift Boss    │     "Here's today's work."
    │     │                    │
    │     └── Workers:         │
    │         ⛏️ Miner         │     "Digging deep."
    │         🔬 Assayer       │     "Testing the ore."
    │         🐤 Canary        │     "All clear!"
    │         🔥 Smelter       │     "Purifying gold."
    │                          │
    │  📋 Claim Agent          │     "The boss says..."
    │  🔭 Scout                │     "Found something!"
    │                          │
    └──────────────────────────┘
```

---

## Appendix: 完整映射對照表

### Gas Town → Paydirt 術語

| Gas Town | Paydirt | 類型 |
|----------|---------|------|
| Gas Town | Paydirt | 產品名 |
| (engine) | Goldflow | 引擎名 |
| Convoy | Caravan | 工作團隊 |
| Agent | Prospect | 角色 |
| Dashboard | Boomtown | 控制中心 |
| Context | Tunnel | 持久狀態 |
| History | Ledger | 歷史記錄 |
| Commander | Camp Boss | 角色 |
| Mayor | Trail Boss | 角色 |
| Planner | Surveyor | 角色 |
| Foreman | Shift Boss | 角色 |
| Polecat | Miner | 角色 |
| Witness | Assayer | 角色 |
| Dog | Canary | 角色 |
| Refinery | Smelter | 角色 |
| PM/Prime | Claim Agent | 角色 |
| Linear-Scout | Scout | 角色 |

### 環境變數映射

| Gas Town | Paydirt |
|----------|---------|
| `GASTOWN_BD` | `PAYDIRT_CLAIM` |
| `GASTOWN_CONVOY` | `PAYDIRT_CARAVAN` |
| `GASTOWN_ROLE` | `PAYDIRT_PROSPECT` |
| `GASTOWN_SESSION` | `PAYDIRT_SESSION` |
| `GASTOWN_CONTEXT` | `PAYDIRT_TUNNEL` |
| `GASTOWN_BIN` | `PAYDIRT_BIN` |

### CLI 命令映射

| Gas Town | Paydirt |
|----------|---------|
| `gastown start` | `paydirt stake` / `pd stake` |
| `gastown resume` | `paydirt continue` / `pd continue` |
| `gastown status` | `paydirt survey` / `pd survey` |
| `gastown stop` | `paydirt abandon` / `pd abandon` |
| `gastown spawn` | `paydirt prospect` / `pd prospect` |
| `gastown dashboard` | `paydirt boomtown` / `pd boomtown` |

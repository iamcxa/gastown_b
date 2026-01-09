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

## 8. CLI 與環境變數

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

## 9. 建構策略

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

## 10. 視覺化角色設計

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

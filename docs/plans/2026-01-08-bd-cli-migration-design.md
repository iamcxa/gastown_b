# bd CLI 遷移設計文件

日期: 2026-01-08

## 概述

### 目標
將 gastown 的提示詞系統從 `.bd` 檔案操作遷移至 bd CLI 命令，使 Mayor 等 agent 使用 beads 系統而非已棄用的自定義檔案格式。

### 問題
目前存在兩套並行系統：
- Agent 定義檔 (`.gastown/agents/*.md`) 已更新為使用 bd CLI
- 但 launcher 提示詞 (`src/claude/command.ts`) 仍指示 agent 讀寫 `.bd` 檔案
- 變數命名混淆：`bdPath` 實際上現在收到的是 beads issue ID

### 決策摘要

| 項目 | 決策 |
|------|------|
| 策略 | 只更新提示詞，不重構 scheduler |
| 參數重命名 | `bdPath` → `convoyId` |
| 環境變數 | `$GASTOWN_BD` 保持不變 |
| 舊模組處理 | 保留並標記 @deprecated |
| 刪除範圍 | 僅刪除 `startConvoy()` 函數 |

## 變更範圍

### 修改的檔案

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `src/claude/command.ts` | 重構 | 重命名參數，更新提示詞 |
| `src/claude/command.test.ts` | 更新 | 配合參數重命名 |
| `src/claude/launcher.ts` | 重構 | 重命名參數 |
| `src/claude/launcher.test.ts` | 更新 | 配合參數重命名 |
| `src/cli/commands.ts` | 清理 | 刪除舊的 `startConvoy()` |

### 保留但標記棄用

- `src/bd/parser.ts` - 已有 @deprecated
- `src/bd/writer.ts` - 已有 @deprecated
- `src/bd/operations.ts` - 已有 @deprecated
- `src/scheduler/scheduler.ts` - 已有 @deprecated
- `showStatus(bdPath)` - 舊版狀態顯示
- `resumeConvoy(bdPath)` - 舊版恢復

## 提示詞變更

### 變更對照表

| 位置 | 當前提示詞 | 新提示詞 |
|------|-----------|----------|
| line 136 | `BD file: $GASTOWN_BD` | `Convoy ID: $GASTOWN_BD` |
| line 145 | `Read the bd file at $GASTOWN_BD for current state` | `Use bd CLI to check convoy state: bd show $GASTOWN_BD` |
| line 222 | `Write questions to the bd file at $GASTOWN_BD` | `Write questions via bd CLI: bd comments add $GASTOWN_BD` |
| line 268 | `Read the bd file at $GASTOWN_BD to understand current state` | `Use bd CLI to check state: bd show $GASTOWN_BD` |
| line 305 | `Read the bd file at $GASTOWN_BD for current state` | `Use bd show $GASTOWN_BD for state, bd comments for Q&A` |
| line 307 | `Read the bd file at $GASTOWN_BD to understand current state` | `Use bd show $GASTOWN_BD to check state` |

### bd CLI 指令參考（加入提示詞）

```
## bd CLI Commands
- bd show $GASTOWN_BD          # View convoy details
- bd comments $GASTOWN_BD      # List comments (questions/answers)
- bd comments add $GASTOWN_BD "..." # Add comment
- bd update $GASTOWN_BD --status=in_progress # Update status
```

## 參數重命名

### 介面變更

```typescript
// command.ts
interface ClaudeCommandOptions {
  role: RoleName;
  agentDir: string;
  convoyId: string;      // 原 bdPath
  convoyName: string;
  // ...
}

// launcher.ts
interface LaunchConfig {
  role: RoleName;
  projectDir: string;
  convoyId: string;      // 原 bdPath
  convoyName: string;
  // ...
}
```

### 環境變數

```typescript
// $GASTOWN_BD 名稱不變，語義更清晰
GASTOWN_BD: convoyId,  // 現在明確是 convoy ID，不是檔案路徑
```

## 刪除內容

### startConvoy() 函數

```typescript
// src/cli/commands.ts 第 48-131 行
// 使用 createNewBd() 和 writeBdFile() 的舊版函數
// 已被 startConvoyWithBd() 完全取代
```

## 風險評估

| 風險 | 等級 | 緩解措施 |
|------|------|----------|
| 破壞現有 convoy | 低 | 舊的 .bd 檔案仍可手動讀取 |
| 測試失敗 | 低 | 只是重命名，邏輯不變 |
| Agent 行為改變 | 中 | 提示詞更明確，應該更好 |

## 檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/claude/command.ts` | 修改 | 重命名 + 更新提示詞 |
| `src/claude/command.test.ts` | 修改 | 更新測試參數 |
| `src/claude/launcher.ts` | 修改 | 重命名參數 |
| `src/claude/launcher.test.ts` | 修改 | 更新測試參數 |
| `src/cli/commands.ts` | 修改 | 刪除 startConvoy() |

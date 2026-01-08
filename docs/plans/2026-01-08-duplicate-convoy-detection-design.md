# Duplicate Convoy Detection 設計文件

日期: 2026-01-08

## 概述

### 目標
在啟動新 convoy 前，檢測是否已存在相同 Issue ID 的 convoy，讓用戶選擇恢復現有的或創建新的。

### 問題
目前 `startConvoyWithBd` 直接創建新 convoy，不檢查是否已存在相同任務的 convoy，導致重複創建（如多個 SC-274 convoy）。

### 決策摘要

| 項目 | 決策 |
|------|------|
| 匹配策略 | 僅精確匹配 Issue ID |
| Issue ID 格式 | `/[A-Z]{2,10}-\d+/g` |
| 發現重複時 | 互動式選擇（恢復/創建新/取消） |
| 顯示哪些 convoy | open + in_progress 狀態 |
| Force flag | 無，在互動選項中提供「創建新的」 |

## 用戶流程

```
$ gastown "實作 Linear issue SC-274"

🔍 檢查現有 convoys...

⚠️  找到相同 Issue ID (SC-274) 的 convoy:

  1. carlove-5v2 [open] (running) - 請依據專案最佳實踐...
  2. carlove-zwu [open] (stopped) - 請依據專案最佳實踐...
  3. 創建新的 convoy
  4. 取消

請選擇 [1-4]:
```

## 架構與組件

### 新增模組

```
src/cli/
├── commands.ts          # 修改：在 startConvoyWithBd 中加入檢測
├── duplicate-check.ts   # 新增：重複檢測邏輯
└── prompt.ts            # 新增：互動式選擇 UI
```

### 核心函數

**1. `extractIssueIds(text: string): string[]`**
- 從任務描述中抽取所有 Issue ID
- 使用 regex `/[A-Z]{2,10}-\d+/g`
- 回傳：`["SC-274"]` 或 `[]`

**2. `findDuplicateConvoys(issueIds: string[]): Promise<ConvoyMatch[]>`**
- 呼叫 `bd list --status=open` 和 `bd list --status=in_progress`
- 檢查每個 convoy 的 title 是否包含任一 issueId
- 回傳匹配的 convoy 列表（含 running 狀態）

**3. `promptConvoySelection(matches: ConvoyMatch[]): Promise<Selection>`**
- 顯示互動式選單
- 回傳用戶選擇：`{ action: 'resume', convoyId }` | `{ action: 'create' }` | `{ action: 'cancel' }`

### 資料結構

```typescript
interface ConvoyMatch {
  id: string;
  title: string;
  status: 'open' | 'in_progress';
  isRunning: boolean;  // tmux session 是否存在
  issueId: string;     // 匹配到的 issue ID
}

type Selection =
  | { action: 'resume'; convoyId: string }
  | { action: 'create' }
  | { action: 'cancel' };
```

## 流程整合

### 修改 `startConvoyWithBd` 流程

```
原本流程:
  startConvoyWithBd(task)
    → createConvoy()
    → createAgentBead()
    → launchMayor()

新流程:
  startConvoyWithBd(task)
    → extractIssueIds(task)           # 新增
    → findDuplicateConvoys(issueIds)  # 新增
    → if duplicates found:
        → promptConvoySelection()     # 新增
        → switch selection:
            resume  → resumeConvoyWithBd(convoyId)
            create  → 繼續原本流程
            cancel  → return early
    → createConvoy()
    → createAgentBead()
    → launchMayor()
```

### 程式碼位置

```typescript
// src/cli/commands.ts - startConvoyWithBd 函數開頭插入

export async function startConvoyWithBd(
  task: string,
  options: StartOptionsV2 = {}
): Promise<ConvoyState> {
  // === 新增：重複檢測 ===
  const issueIds = extractIssueIds(task);
  if (issueIds.length > 0) {
    const duplicates = await findDuplicateConvoys(issueIds);
    if (duplicates.length > 0) {
      const selection = await promptConvoySelection(duplicates);
      if (selection.action === 'resume') {
        return resumeConvoyWithBd(selection.convoyId, options);
      }
      if (selection.action === 'cancel') {
        throw new Error('Cancelled by user');
      }
      // action === 'create': 繼續執行
    }
  }
  // === 新增結束 ===

  // 原本的 convoy 創建邏輯...
}
```

## 測試與邊界情況

### 測試案例

| 案例 | 輸入 | 預期結果 |
|------|------|----------|
| 無 Issue ID | `"實作登入功能"` | 跳過檢測，直接創建 |
| 有 ID，無重複 | `"SC-999"` | 跳過選單，直接創建 |
| 有 ID，有重複 | `"SC-274"` | 顯示選單 |
| 多個 ID | `"SC-274 和 SC-275"` | 合併搜尋，顯示所有匹配 |
| 選擇恢復 running | 選 1 | 直接 attach session |
| 選擇恢復 stopped | 選 2 | 重建 session 後 attach |
| 選擇創建新的 | 選 3 | 繼續原流程 |
| 選擇取消 | 選 4 | 結束，不創建 |

### 邊界情況處理

1. **bd CLI 失敗** - catch error，顯示警告後繼續創建（降級處理）
2. **無 TTY（非互動模式）** - 檢測到重複時直接報錯，提示用 `--resume`
3. **Issue ID 在 title 中間** - regex 可正確抽取 `"請實作 SC-274 的功能"`

## 檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/cli/duplicate-check.ts` | 新增 | `extractIssueIds`, `findDuplicateConvoys` |
| `src/cli/prompt.ts` | 新增 | `promptConvoySelection` |
| `src/cli/duplicate-check.test.ts` | 新增 | 單元測試 |
| `src/cli/commands.ts` | 修改 | 整合到 `startConvoyWithBd` |

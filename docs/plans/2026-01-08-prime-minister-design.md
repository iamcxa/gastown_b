# Prime Minister Mode - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable autonomous convoy execution with PM (Prime Minister) making decisions on behalf of human, based on context file.

**Architecture:** Two-agent loop in tmux - Mayor asks questions, PM answers from context or escalates to human when uncertain.

**Tech Stack:** Deno, tmux, Claude Code agents, bd file protocol

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    tmux session: gastown-convoy             │
├────────────────────────────┬────────────────────────────────┤
│        Mayor Pane (0)      │       Prime Minister Pane (1)  │
│   (Claude Code instance)   │     (Claude Code instance)     │
│                            │                                │
│  - Asks questions          │  - Monitors Mayor's output     │
│  - Delegates to workers    │  - Reads context file          │
│  - Updates bd file         │  - Answers questions           │
│  - Executes convoy         │  - Escalates to human if stuck │
└────────────────────────────┴────────────────────────────────┘
                    │                        │
                    └──────────┬─────────────┘
                               ▼
                    ┌─────────────────────┐
                    │    convoy.bd file   │
                    │  - pending-question │
                    │  - answer           │
                    │  - decision-log     │
                    └─────────────────────┘
```

### Role Hierarchy

| Role | Responsibility | Talks To |
|------|----------------|----------|
| **Human (King)** | Ultimate authority | PM (in Prime mode) or Mayor (in Mayor mode) |
| **Prime Minister** | Decision proxy based on context | Human (escalation), Mayor (answers) |
| **Mayor** | Convoy coordination, task delegation | PM or Human, Workers |
| **Workers** | Implementation (Planner, Foreman, etc.) | Mayor |

### Two Operating Modes

| Mode | CLI | Human Interface | Decision Maker |
|------|-----|-----------------|----------------|
| **Mayor mode** | `gastown "task"` | Mayor pane | Human directly |
| **Prime mode** | `gastown --prime "task"` | PM pane | PM (escalates if uncertain) |

---

## 2. Communication Protocol

### bd File Message Format

```markdown
## Meta
convoy: implement-auth-feature
mode: prime
phase: planning

## Prime Minister Communication
pending-question: |
  Which authentication provider should we use?
  Context: We need user login for the admin panel.
question-type: decision
question-options:
  - Supabase Auth (recommended for our stack)
  - Firebase Auth
  - Custom JWT implementation
question-from: mayor
question-at: 2026-01-07T23:15:00Z

answer: |
  Use Supabase Auth.
  Reasoning: Context file specifies "Use Supabase ecosystem" and
  decision principle #1 is "Simplicity First". Supabase Auth
  integrates seamlessly with our existing Supabase setup.
answer-from: prime
answer-at: 2026-01-07T23:15:05Z
answer-confidence: high

## Decision Log
decision-log:
  - q: Which auth provider?
    a: Supabase Auth
    source: context + principle #1
    confidence: high
  - q: Session storage?
    a: HTTP-only cookies
    source: inferred from security constraint
    confidence: medium
```

### Question Detection Flow (Hybrid)

1. **Natural language detection** - PM monitors Mayor's pane output via `tmux capture-pane`
2. **Pattern matching** - Detects questions (ends with `?`, contains "which/should/how")
3. **Structured format** - Mayor can also write to bd file for complex decisions
4. **Context search** - PM searches context file for matching Q&A
5. **Inference** - If no match, use decision principles
6. **Escalation** - If uncertain, ask human in PM pane

---

## 3. Prime Minister Agent Behavior

### Core Responsibilities

1. **Monitor Mayor** - Watch Mayor's pane output for questions
2. **Consult Context** - Search context file for pre-defined answers
3. **Apply Principles** - Use decision principles when no direct answer
4. **Answer Mayor** - Write answers to bd file
5. **Escalate When Stuck** - Ask human in PM pane if truly uncertain

### PM Workflow

```
1. On Start:
   - Read context file ($GASTOWN_CONTEXT)
   - Load decision principles into memory
   - Begin monitoring Mayor's pane

2. On Question Detected:
   - Log: "📨 Question from Mayor: [question]"
   - Search context for matching Q&A
   - If found: Answer with "📗 From context: [answer]"
   - If not found: Try to infer from principles
   - If confident: Answer with "🧠 Inferred: [answer] (based on [principle])"
   - If uncertain: Ask human "👑 Need your decision: [question]"

3. On Human Response:
   - Log: "👑 King's decision: [answer]"
   - Write answer to bd file
   - Optionally add to context for future reference

4. Continuous:
   - Update bd with decision-log entries
   - Monitor for new questions every 2-3 seconds
   - Report status: "✅ Answered 5 questions, 1 escalated"
```

### Confidence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **high** | Direct match in context file | Answer immediately |
| **medium** | Inferred from principles | Answer with reasoning |
| **low** | Weak inference, could be wrong | Ask human |
| **none** | No idea, not covered | Must ask human |

### PM Environment Variables

```bash
GASTOWN_ROLE=prime
GASTOWN_BD=/path/to/convoy.bd
GASTOWN_CONTEXT=/path/to/context.md
GASTOWN_CONVOY=convoy-name
GASTOWN_MAYOR_PANE=0  # Pane index to monitor
```

---

## 4. CLI Interface & Startup Flow

### CLI Options

```bash
# Mayor mode (default) - human interacts with Mayor
gastown "Implement user authentication"

# Prime mode - PM makes decisions, human observes/intervenes
gastown --prime "Implement user authentication"
gastown --prime --context auth-context.md "Implement auth"

# Short form
gastown -p "Implement user authentication"
```

### Startup Flow (Prime Mode)

```
gastown --prime "task"
        │
        ▼
1. Create bd file (mode: prime, context-path: ...)
        │
        ▼
2. Create tmux session: gastown-{convoy-name}
        │
        ▼
3. Launch Mayor in pane 0 (left side)
   - Knows PM is active
   - Writes questions to bd, waits for answers
        │
        ▼
4. Split pane horizontally
   Launch PM in pane 1 (right side)
   - Starts monitoring Mayor's pane
        │
        ▼
5. Attach user to session
   - User sees both panes side-by-side
```

### Mayor Awareness of PM

When PM mode is active, Mayor's prompt includes:

```
"Prime Minister is active. Write questions to bd file under
'pending-question:'. Wait for 'answer:' in bd file before
proceeding. Do NOT ask user directly - PM handles decisions."
```

---

## 5. Implementation Plan

### Files to Create

| File | Purpose |
|------|---------|
| `.gastown/agents/prime.md` | PM agent definition |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add `primeMode`, question/answer types |
| `src/cli/commands.ts` | Handle `--prime` flag, launch PM pane |
| `src/claude/launcher.ts` | Add `launchPrime()` function |
| `src/claude/command.ts` | Add PM-specific prompt builder |
| `src/tmux/operations.ts` | Add `capturePaneOutput()` |
| `gastown.ts` | Add `--prime/-p` CLI flag |
| `.gastown/agents/mayor.md` | Add PM-aware behavior |

### New tmux Operations

```typescript
// Capture pane output for PM to monitor Mayor
export async function capturePaneOutput(
  sessionName: string,
  paneIndex: string,
  lines: number = 50
): Promise<string>

// Build capture command
export function buildCapturePaneCommand(
  sessionName: string,
  paneIndex: string,
  lines: number
): string
```

### bd File Schema Additions

```typescript
export interface BdFile {
  // ... existing fields
  mode: 'mayor' | 'prime';
  primeEnabled?: boolean;

  pendingQuestion?: {
    question: string;
    type: 'decision' | 'clarification' | 'approval';
    options?: string[];
    from: string;
    at: string;
  };

  answer?: {
    content: string;
    from: 'prime' | 'human';
    confidence: 'high' | 'medium' | 'low';
    reasoning?: string;
    at: string;
  };

  decisionLog?: Array<{
    question: string;
    answer: string;
    source: string;
    confidence: string;
  }>;
}
```

---

## 6. Testing Strategy

### Unit Tests

- PM prompt builder generates correct prompts
- Question detection patterns work correctly
- bd file pending-question/answer serialization
- Capture pane command builder

### Integration Tests

- `capturePaneOutput()` returns correct content
- PM pane launches after Mayor pane

### Manual Testing Checklist

- [ ] `gastown --prime` launches two-pane layout
- [ ] PM monitors Mayor's output
- [ ] PM answers questions from context file
- [ ] PM escalates to human when uncertain
- [ ] Decision log persisted in bd file
- [ ] User can observe entire flow in tmux

---

## 7. Future Roadmap (Out of Scope)

| Phase | Feature | Description |
|-------|---------|-------------|
| **Phase 2** | MCP Server | PM exposes MCP tools for external control |
| **Phase 3** | Mobile Bridge | PM sends notifications, receives commands via MCP |
| **Phase 4** | Multi-worker tabs | Worker panes with tab switching |
| **Phase 5** | Learning | PM learns from human corrections, improves context |

---

## 8. Success Criteria

- [ ] `gastown --prime` launches two-pane layout (Mayor | PM)
- [ ] PM monitors Mayor's output via `capture-pane`
- [ ] PM answers questions from context file with confidence levels
- [ ] PM escalates to human when confidence is low/none
- [ ] Decision log persisted in bd file
- [ ] User can observe entire Q&A flow in real-time
- [ ] Fallback to mayor mode works (`gastown` without `--prime`)

---

*Created: 2026-01-08*
*Author: Kent + Claude*

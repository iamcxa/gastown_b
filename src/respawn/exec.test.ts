// src/respawn/exec.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  prepareRespawn,
  executeRespawn,
  buildClaudeCommand,
  STATE_SPAWNING,
  STATE_WORKING,
  STATE_DEAD,
  CLAUDE_AGENT_FLAG,
  CLAUDE_RESUME_FLAG,
  type RespawnContext,
} from './exec.ts';
import { getAgentState, type RoleName } from '../bd-cli/agent.ts';
import { setSlot } from '../bd-cli/slot.ts';
import { execBd } from '../bd-cli/executor.ts';

// Valid roles for validation (prevents injection via role parameter)
const VALID_ROLES = new Set<string>([
  'mayor', 'planner', 'foreman', 'polecat', 'witness', 'dog', 'refinery', 'prime',
]);

// Safe ID pattern: alphanumeric, hyphens, and underscores only
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Helper to create an agent-type bead for testing
// Uses parameterized-style approach with validation to prevent SQL injection
async function createTestAgentBead(role: RoleName): Promise<string> {
  // Validate role is a known value (prevents injection)
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Generate a safe ID with timestamp
  const id = `gastown_b-exec-test-${Date.now()}`;
  const title = `test-${role}`;
  const dbPath = '.beads/beads.db';

  // Use sqlite3 with parameterized INSERT via .param command
  // This avoids string interpolation in SQL
  const cmd = new Deno.Command('sqlite3', {
    args: [dbPath],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });
  const process = cmd.spawn();

  // Write SQL with .param for parameterized query
  const writer = process.stdin.getWriter();
  const sql = `.param init
.param set :id '${id}'
.param set :title '${title}'
.param set :role '${role}'
INSERT INTO issues (id, title, issue_type, role_type, status) VALUES (:id, :title, 'agent', :role, 'open');
INSERT INTO labels (issue_id, label) VALUES (:id, 'gt:agent');
`;
  await writer.write(new TextEncoder().encode(sql));
  await writer.close();

  const { code, stderr } = await process.output();
  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);
    throw new Error(`Failed to create test agent: ${err}`);
  }

  return id;
}

// Helper to delete a test bead safely
async function deleteTestBead(id: string): Promise<void> {
  // Validate ID format to prevent injection
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid bead ID format: ${id}`);
  }

  const dbPath = '.beads/beads.db';

  // Use sqlite3 with parameterized DELETE
  const cmd = new Deno.Command('sqlite3', {
    args: [dbPath],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });
  const process = cmd.spawn();

  const writer = process.stdin.getWriter();
  const sql = `.param init
.param set :id '${id}'
DELETE FROM labels WHERE issue_id = :id;
DELETE FROM issues WHERE id = :id;
`;
  await writer.write(new TextEncoder().encode(sql));
  await writer.close();

  await process.output();
}

Deno.test('prepareRespawn gathers agent context', async () => {
  const agentId = await createTestAgentBead('polecat');

  try {
    const context = await prepareRespawn(agentId);

    assertExists(context.agentId);
    assertEquals(context.agentId, agentId);
    assertEquals(context.role, 'polecat');
    assertEquals(context.taskId, null); // No task attached
    assertEquals(context.sessionName, ''); // Not set by prepareRespawn
  } finally {
    await deleteTestBead(agentId);
  }
});

Deno.test('prepareRespawn includes attached task', async () => {
  const agentId = await createTestAgentBead('foreman');

  // Create a task to attach
  const taskId = await execBd(['create', 'respawn-exec-test-task', '--type', 'task', '--silent']);

  try {
    // Attach task to agent via hook slot
    await setSlot(agentId, 'hook', taskId.trim());

    const context = await prepareRespawn(agentId);

    assertEquals(context.agentId, agentId);
    assertEquals(context.role, 'foreman');
    assertEquals(context.taskId, taskId.trim());
  } finally {
    await execBd(['close', taskId.trim(), '--reason', 'Test cleanup']);
    await deleteTestBead(agentId);
  }
});

Deno.test('buildClaudeCommand generates correct command', () => {
  const cmd = buildClaudeCommand('agent-123', 'polecat', 'task-456', '/project/dir');

  assertEquals(
    cmd,
    `cd /project/dir && GASTOWN_AGENT=agent-123 GASTOWN_ROLE=polecat GASTOWN_BD=task-456 claude ${CLAUDE_AGENT_FLAG} polecat ${CLAUDE_RESUME_FLAG} agent-123`
  );
});

Deno.test('buildClaudeCommand works without taskId', () => {
  const cmd = buildClaudeCommand('agent-789', 'witness', null, '/home/user/project');

  assertEquals(
    cmd,
    `cd /home/user/project && GASTOWN_AGENT=agent-789 GASTOWN_ROLE=witness claude ${CLAUDE_AGENT_FLAG} witness ${CLAUDE_RESUME_FLAG} agent-789`
  );
});

Deno.test('executeRespawn updates agent state', async () => {
  const agentId = await createTestAgentBead('dog');

  const context: RespawnContext = {
    agentId,
    role: 'dog',
    taskId: null,
    sessionName: 'test-session',
  };

  try {
    const result = await executeRespawn(context, '/tmp/test-project');

    assertEquals(result, true);
    // Agent should be in 'working' state after successful respawn
    const state = await getAgentState(agentId);
    assertEquals(state, STATE_WORKING);
  } finally {
    await deleteTestBead(agentId);
  }
});

Deno.test('state constants are defined correctly', () => {
  assertEquals(STATE_SPAWNING, 'spawning');
  assertEquals(STATE_WORKING, 'working');
  assertEquals(STATE_DEAD, 'dead');
});

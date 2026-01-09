// src/dashboard/dashboard.test.ts

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { generateMprocsConfig, type DashboardConvoyInfo } from './mprocs.ts';
import { mapConvoyStatus, mapConvoysToDashboard } from './dashboard.ts';
import type { ConvoyInfo } from '../bd-cli/mod.ts';

Deno.test('generateMprocsConfig creates valid YAML structure', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'convoy-001', name: 'Test Convoy', status: 'running' },
  ];

  const config = generateMprocsConfig(convoys);

  // Should start with procs:
  assertStringIncludes(config, 'procs:');

  // Should have status pane
  assertStringIncludes(config, 'status:');
  assertStringIncludes(config, 'watch -n 2');
  assertStringIncludes(config, 'gastown --status');

  // Should have convoy pane
  assertStringIncludes(config, 'Test-Convoy:');
  assertStringIncludes(config, 'tmux attach -t');
  assertStringIncludes(config, 'gastown-convoy-001');
});

Deno.test('generateMprocsConfig handles multiple convoys', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'First', status: 'running' },
    { id: 'conv-2', name: 'Second', status: 'idle' },
    { id: 'conv-3', name: 'Third', status: 'stopped' },
  ];

  const config = generateMprocsConfig(convoys);

  // Should have all convoy panes
  assertStringIncludes(config, 'First:');
  assertStringIncludes(config, 'Second:');
  assertStringIncludes(config, 'Third:');

  // Each should have tmux attach command
  assertStringIncludes(config, 'gastown-conv-1');
  assertStringIncludes(config, 'gastown-conv-2');
  assertStringIncludes(config, 'gastown-conv-3');
});

Deno.test('generateMprocsConfig handles empty convoy list', () => {
  const convoys: DashboardConvoyInfo[] = [];

  const config = generateMprocsConfig(convoys);

  // Should have status pane
  assertStringIncludes(config, 'status:');

  // Should have no-convoys placeholder
  assertStringIncludes(config, 'no-convoys:');
  assertStringIncludes(config, 'No active convoys');
});

Deno.test('generateMprocsConfig sanitizes convoy names', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'Has Spaces & Special!', status: 'running' },
  ];

  const config = generateMprocsConfig(convoys);

  // Name should be sanitized (no spaces/special chars)
  assertStringIncludes(config, 'Has-Spaces---Special-:');
});

Deno.test('generateMprocsConfig truncates long names', () => {
  const convoys: DashboardConvoyInfo[] = [
    {
      id: 'conv-1',
      name: 'This is a very long convoy name that should be truncated to fit',
      status: 'running',
    },
  ];

  const config = generateMprocsConfig(convoys);

  // Name should be truncated to 30 chars
  const lines = config.split('\n');
  const convoyLine = lines.find((l) => l.includes('This-is-a-very-long'));
  assertEquals(convoyLine !== undefined, true);
  // The sanitized name before : should be <= 30 chars
  const match = convoyLine!.match(/^\s+([^:]+):/);
  assertEquals(match !== null, true);
  assertEquals(match![1].length <= 30, true);
});

Deno.test('generateMprocsConfig includes convoy status in fallback message', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'Test', status: 'idle' },
  ];

  const config = generateMprocsConfig(convoys);

  // Fallback message should include status
  assertStringIncludes(config, 'Status: idle');
});

Deno.test('mapConvoyStatus returns running when tmux session exists', () => {
  const convoy: ConvoyInfo = {
    id: 'conv-123',
    title: 'Test',
    description: '',
    status: 'open',
    labels: [],
    createdAt: '',
  };

  const sessions = ['gastown-conv-123', 'gastown-other'];
  const status = mapConvoyStatus(convoy, sessions);

  assertEquals(status, 'running');
});

Deno.test('mapConvoyStatus returns idle when no session but convoy is open', () => {
  const convoy: ConvoyInfo = {
    id: 'conv-123',
    title: 'Test',
    description: '',
    status: 'open',
    labels: [],
    createdAt: '',
  };

  const sessions = ['gastown-other'];
  const status = mapConvoyStatus(convoy, sessions);

  assertEquals(status, 'idle');
});

Deno.test('mapConvoyStatus returns idle for in_progress status without session', () => {
  const convoy: ConvoyInfo = {
    id: 'conv-123',
    title: 'Test',
    description: '',
    status: 'in_progress',
    labels: [],
    createdAt: '',
  };

  const sessions: string[] = [];
  const status = mapConvoyStatus(convoy, sessions);

  assertEquals(status, 'idle');
});

Deno.test('mapConvoyStatus returns stopped for closed convoy', () => {
  const convoy: ConvoyInfo = {
    id: 'conv-123',
    title: 'Test',
    description: '',
    status: 'closed',
    labels: [],
    createdAt: '',
  };

  const sessions: string[] = [];
  const status = mapConvoyStatus(convoy, sessions);

  assertEquals(status, 'stopped');
});

Deno.test('mapConvoysToDashboard converts convoy list correctly', () => {
  const convoys: ConvoyInfo[] = [
    { id: 'c1', title: 'First', description: '', status: 'open', labels: [], createdAt: '' },
    { id: 'c2', title: 'Second', description: '', status: 'closed', labels: [], createdAt: '' },
  ];

  const sessions = ['gastown-c1'];
  const result = mapConvoysToDashboard(convoys, sessions);

  assertEquals(result.length, 2);
  assertEquals(result[0].id, 'c1');
  assertEquals(result[0].name, 'First');
  assertEquals(result[0].status, 'running');
  assertEquals(result[1].id, 'c2');
  assertEquals(result[1].name, 'Second');
  assertEquals(result[1].status, 'stopped');
});

Deno.test('mapConvoysToDashboard handles empty lists', () => {
  const result = mapConvoysToDashboard([], []);
  assertEquals(result.length, 0);
});

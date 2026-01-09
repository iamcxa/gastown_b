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

  // Should have Control Room pane with industrial branding
  assertStringIncludes(config, '⛽ Control Room');
  assertStringIncludes(config, 'GAS TOWN');

  // Should have convoy pane with status icon (● = running)
  assertStringIncludes(config, '● convoy-001');
  assertStringIncludes(config, 'tmux attach -t');
  assertStringIncludes(config, 'gastown-convoy-001');
  // Should have box-drawing frames in detail output
  assertStringIncludes(config, '╔');
});

Deno.test('generateMprocsConfig handles multiple convoys', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'First', status: 'running' },
    { id: 'conv-2', name: 'Second', status: 'idle' },
    { id: 'conv-3', name: 'Third', status: 'stopped' },
  ];

  const config = generateMprocsConfig(convoys);

  // Should have all convoy panes with status icons (industrial style)
  assertStringIncludes(config, '● conv-1'); // running (filled circle)
  assertStringIncludes(config, '○ conv-2'); // idle (empty circle)
  assertStringIncludes(config, '◌ conv-3'); // stopped (dotted circle)

  // Each should have tmux attach command
  assertStringIncludes(config, 'gastown-conv-1');
  assertStringIncludes(config, 'gastown-conv-2');
  assertStringIncludes(config, 'gastown-conv-3');
});

Deno.test('generateMprocsConfig handles empty convoy list', () => {
  const convoys: DashboardConvoyInfo[] = [];

  const config = generateMprocsConfig(convoys);

  // Should have Control Room pane
  assertStringIncludes(config, '⛽ Control Room');

  // Should have welcome pane with industrial frame
  assertStringIncludes(config, '📋 Welcome');
  assertStringIncludes(config, 'No active convoys');
  assertStringIncludes(config, '╔'); // Box-drawing frame
});

Deno.test('generateMprocsConfig handles Unicode names', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: '請依據專案最佳實踐實作功能', status: 'running' },
  ];

  const config = generateMprocsConfig(convoys);

  // Pane label uses convoy ID (safe for all languages)
  assertStringIncludes(config, '● conv-1');
  // Full name shown in fallback message (inside box frame)
  assertStringIncludes(config, '請依據專案最佳實踐實作功能');
});

Deno.test('generateMprocsConfig uses convoy ID as pane label', () => {
  const convoys: DashboardConvoyInfo[] = [
    {
      id: 'my-convoy-abc123',
      name: 'This is a very long convoy name that would be truncated',
      status: 'running',
    },
  ];

  const config = generateMprocsConfig(convoys);

  // Pane label is the convoy ID with status icon
  assertStringIncludes(config, '● my-convoy-abc123');
  // Session name includes gastown prefix
  assertStringIncludes(config, 'gastown-my-convoy-abc123');
});

Deno.test('generateMprocsConfig includes convoy status in fallback message', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'Test', status: 'idle' },
  ];

  const config = generateMprocsConfig(convoys);

  // Fallback message should include status with industrial gauge
  assertStringIncludes(config, 'IDLE');
  assertStringIncludes(config, '▰▰▰▱▱'); // Progress bar for idle status
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

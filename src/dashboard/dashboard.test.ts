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

  // Should have procs section
  assertStringIncludes(config, 'procs:');

  // Should have Control Room pane with industrial branding
  assertStringIncludes(config, '◈ CONTROL ROOM');
  assertStringIncludes(config, 'GAS TOWN');

  // Should have convoy pane with status glyph (▶ = running)
  assertStringIncludes(config, '▶ convoy-001');
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

  // Should have all convoy panes with status glyphs (industrial style)
  assertStringIncludes(config, '▶ conv-1'); // running (play)
  assertStringIncludes(config, '◇ conv-2'); // idle (diamond)
  assertStringIncludes(config, '■ conv-3'); // stopped (square)

  // Each should have tmux attach command
  assertStringIncludes(config, 'gastown-conv-1');
  assertStringIncludes(config, 'gastown-conv-2');
  assertStringIncludes(config, 'gastown-conv-3');
});

Deno.test('generateMprocsConfig handles empty convoy list', () => {
  const convoys: DashboardConvoyInfo[] = [];

  const config = generateMprocsConfig(convoys);

  // Should have Control Room pane
  assertStringIncludes(config, '◈ CONTROL ROOM');

  // Should have welcome pane with industrial frame
  assertStringIncludes(config, '◇ WELCOME');
  assertStringIncludes(config, 'No active convoys');
});

Deno.test('generateMprocsConfig handles Unicode names', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: '請依據專案最佳實踐實作功能', status: 'running' },
  ];

  // With script path, uses script file (Unicode name not in YAML config itself)
  const scriptPaths = new Map([['conv-1', '/tmp/convoy-conv-1.sh']]);
  const config = generateMprocsConfig(convoys, undefined, scriptPaths);

  // Pane label uses convoy ID (safe for all languages)
  assertStringIncludes(config, '▶ conv-1');
  // Shell references script file
  assertStringIncludes(config, '/tmp/convoy-conv-1.sh');
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

  // Pane label is the convoy ID with status glyph
  assertStringIncludes(config, '▶ my-convoy-abc123');
  // Session name includes gastown prefix
  assertStringIncludes(config, 'gastown-my-convoy-abc123');
});

Deno.test('generateMprocsConfig includes convoy status in fallback message', () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: 'conv-1', name: 'Test', status: 'idle' },
  ];

  // Without script path, uses simple fallback
  const config = generateMprocsConfig(convoys);

  // Fallback message should include status (simple version without colors)
  assertStringIncludes(config, 'Status: idle');
  // Should have tmux attach command
  assertStringIncludes(config, 'tmux attach -t gastown-conv-1');
});

Deno.test('generateMprocsConfig includes mprocs configuration options', () => {
  const convoys: DashboardConvoyInfo[] = [];
  const config = generateMprocsConfig(convoys);

  // Should have mprocs global settings
  assertStringIncludes(config, 'proc_list_width:');
  assertStringIncludes(config, 'scrollback:');
  assertStringIncludes(config, 'mouse_scroll_speed:');
  assertStringIncludes(config, 'autorestart: true');
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

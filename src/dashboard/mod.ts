// src/dashboard/mod.ts

export { launchDashboard, mapConvoyStatus, mapConvoysToDashboard } from './dashboard.ts';
export {
  generateMprocsConfig,
  writeMprocsConfig,
  generateStatusScriptContent,
  type DashboardConvoyInfo,
  type ConvoyStatus,
} from './mprocs.ts';
export { generateCommanderScriptContent } from './commander-pane.ts';

// src/dashboard/mod.ts

export { launchDashboard, mapConvoyStatus, mapConvoysToDashboard } from './dashboard.ts';
export {
  generateMprocsConfig,
  writeMprocsConfig,
  type DashboardConvoyInfo,
  type ConvoyStatus,
} from './mprocs.ts';

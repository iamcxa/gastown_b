// src/dashboard/mprocs.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateMprocsConfig, DashboardConvoyInfo } from "./mprocs.ts";

Deno.test("generateMprocsConfig includes Commander pane", () => {
  const config = generateMprocsConfig([], undefined, undefined, "/path/commander.sh");
  assertStringIncludes(config, "COMMANDER");
  assertStringIncludes(config, "commander.sh");
});

Deno.test("generateMprocsConfig generates valid YAML with convoys", () => {
  const convoys: DashboardConvoyInfo[] = [
    { id: "convoy-1", name: "Test Convoy", status: "running" },
  ];
  const config = generateMprocsConfig(convoys);
  assertStringIncludes(config, "procs:");
  assertStringIncludes(config, "CONTROL ROOM");
  assertStringIncludes(config, "convoy-1");
});

Deno.test("generateMprocsConfig generates welcome pane when no convoys", () => {
  const config = generateMprocsConfig([]);
  assertStringIncludes(config, "WELCOME");
});

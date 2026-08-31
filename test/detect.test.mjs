import test from "node:test";
import assert from "node:assert/strict";
import { detectRuntimes } from "../plugins/agentic-repo/scripts/lib/detect.mjs";

test("detection reports marker and executable evidence without launching a runtime", async () => {
  const commands = new Set(["codex"]);
  const markers = new Set(["/repo/CLAUDE.md"]);
  const detected = await detectRuntimes("/repo", {
    commandExists: async (command) => commands.has(command),
    pathExists: async (target) => markers.has(target),
  });

  assert.deepEqual(detected.map((item) => item.id), ["codex", "claude-code"]);
  assert.deepEqual(detected[0].executableHits, ["codex"]);
  assert.deepEqual(detected[1].markerHits, ["CLAUDE.md"]);
});

test("no evidence produces no adapter selection", async () => {
  const detected = await detectRuntimes("/repo", {
    commandExists: async () => false,
    pathExists: async () => false,
  });
  assert.deepEqual(detected, []);
});


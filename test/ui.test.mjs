import test from "node:test";
import assert from "node:assert/strict";
import { createUi, isInteractive, renderHeader, renderInitPlan } from "../plugins/agentic-repo/scripts/lib/ui.mjs";

const env = { TERM: "xterm-256color" };
const terminal = (depth, columns = 100) => ({ isTTY: true, columns, getColorDepth: () => depth });
const plan = {
  cwd: "/work/app",
  version: "1.2.3",
  detected: [{ name: "Anthropic Claude Code", evidence: ["marker:.claude"] }],
  detectionMode: "auto",
  runtimes: ["claude-code"],
  profile: "full",
  enforce: "none",
  gitExclude: false,
  inspection: { created: ["AGENTS.md"], skipped: [], conflicts: ["CLAUDE.md"] },
};

test("only an interactive terminal outside CI, TERM=dumb, and --json gets the branded layout", () => {
  assert.equal(isInteractive(terminal(24), { env }), true);
  assert.equal(isInteractive({ isTTY: false }, { env }), false);
  assert.equal(isInteractive(terminal(24), { env: { TERM: "dumb" } }), false);
  assert.equal(isInteractive(terminal(24), { env: { ...env, CI: "true" } }), false);
  assert.equal(isInteractive(terminal(24), { env, json: true }), false);
});

test("a monochrome terminal keeps the layout without escape codes", () => {
  const text = renderInitPlan(createUi(terminal(1), { env, platform: "linux" }), plan);
  assert.equal(text.includes("\u001b["), false);
  assert.match(text, /▄▀█ █▀▀ █▀▀/);
  assert.match(text, /Runtimes +Anthropic Claude Code \(marker:\.claude\)\n/);
  assert.match(text, /Plan +1 to create · 0 unchanged · 1 conflict\n +✖ conflict CLAUDE\.md\n/);
});

test("a truecolor terminal paints the wordmark from amber to rose", () => {
  const header = renderHeader(createUi(terminal(24), { env, platform: "linux" }), "1.2.3");
  assert.ok(header.includes("\u001b[38;2;251;191;36m▄"));
  assert.ok(header.includes("\u001b[38;2;244;63;94m"));
});

test("narrow or non-Unicode terminals get a text header, and non-Unicode ones ASCII symbols", () => {
  const narrow = renderHeader(createUi(terminal(1, 50), { env, platform: "linux" }), "1.2.3");
  assert.equal(narrow, "\n  AGENTIC REPO KIT\n  ⚡ v1.2.3 · governed, knowledge-first kernel for AI coding agents\n\n");

  const ascii = createUi(terminal(1), { env: {}, platform: "win32" });
  assert.equal(renderHeader(ascii, "1.2.3"), "\n  AGENTIC REPO KIT\n  v1.2.3 - governed, knowledge-first kernel for AI coding agents\n\n");
  assert.equal(ascii.line("success", "Done."), "  + Done.\n");
  assert.match(renderInitPlan(ascii, plan), / x conflict CLAUDE\.md\n/);
  assert.equal(createUi(terminal(1), { env: { WT_SESSION: "1" }, platform: "win32" }).unicode, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, parseRuntimeSelection } from "../plugins/agentic-repo/scripts/lib/args.mjs";

test("init defaults to assisted automatic runtime detection", () => {
  const parsed = parseArgs(["init"]);
  assert.equal(parsed.command, "init");
  assert.equal(parsed.runtime, "auto");
});

test("runtime aliases normalize and duplicates collapse", () => {
  assert.deepEqual(parseRuntimeSelection("claude,codex,claude-code,copilot"), {
    mode: "explicit",
    runtimes: ["claude-code", "codex", "github-copilot"],
  });
});

test("none selects the universal kernel without adapters", () => {
  assert.deepEqual(parseRuntimeSelection("none"), { mode: "explicit", runtimes: [] });
});

test("unknown runtimes fail explicitly", () => {
  assert.throws(() => parseRuntimeSelection("imaginary-ide"), /Unknown runtime/);
});

test("governed workflow commands require their exact subcommand", () => {
  assert.equal(parseArgs(["knowledge", "lint"]).subcommand, "lint");
  assert.equal(parseArgs(["adr", "new", "--title", "Database boundary"]).title, "Database boundary");
  assert.throws(() => parseArgs(["anneal", "apply"]), /requires subcommand: new/);
});

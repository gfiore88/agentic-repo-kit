import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "../plugins/agentic-repo");
const assetsRoot = path.join(pluginRoot, "assets");
const skillsRoot = path.join(pluginRoot, "skills");

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-enforce-"));
}

async function fileExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function run(argv) {
  const out = [];
  const err = [];
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = (chunk) => (out.push(String(chunk)), true);
  process.stderr.write = (chunk) => (err.push(String(chunk)), true);
  try {
    const code = await runCli(argv);
    return { code, out: out.join(""), err: err.join("") };
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
}

test("ci enforcement projects the governance workflow and records the mode", async () => {
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: [], enforce: "ci" });
  const workflow = plan.files.find((file) => file.path === ".github/workflows/governance.yml");
  assert.ok(workflow, "expected the governance workflow to be generated");
  assert.match(workflow.content, /agentic-repo-kit verify/);

  const scaffold = plan.files.find((file) => file.path === "scaffold.yaml");
  assert.match(scaffold.content, /^enforcement: ci$/m);
  const lock = JSON.parse(plan.files.find((file) => file.path === "scaffold.lock").content);
  assert.equal(lock.enforcement, "ci");
});

test("default enforcement adds no workflow", async () => {
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: [] });
  assert.ok(!plan.files.some((file) => file.path === ".github/workflows/governance.yml"));
  const scaffold = plan.files.find((file) => file.path === "scaffold.yaml");
  assert.match(scaffold.content, /^enforcement: none$/m);
});

test("init --enforce ci writes the workflow and update preserves the mode", async () => {
  const dir = await tempDir();
  const init = await run(["init", "--runtime", "none", "--enforce", "ci", "--yes", "--cwd", dir]);
  assert.equal(init.code, 0);
  assert.ok(await fileExists(path.join(dir, ".github/workflows/governance.yml")));
  const lockAfterInit = JSON.parse(await readFile(path.join(dir, "scaffold.lock"), "utf8"));
  assert.equal(lockAfterInit.enforcement, "ci");

  const update = await run(["update", "--yes", "--cwd", dir]);
  assert.equal(update.code, 0);
  const lockAfterUpdate = JSON.parse(await readFile(path.join(dir, "scaffold.lock"), "utf8"));
  assert.equal(lockAfterUpdate.enforcement, "ci");
  assert.ok(await fileExists(path.join(dir, ".github/workflows/governance.yml")));
});

test("hooks enforcement is rejected honestly until its slice ships", async () => {
  const dir = await tempDir();
  const { code, err } = await run(["init", "--runtime", "none", "--enforce", "hooks", "--yes", "--cwd", dir]);
  assert.equal(code, 1);
  assert.match(err, /hooks is not available yet/);
});

test("an unknown enforcement mode is rejected", async () => {
  const { code, err } = await run(["init", "--enforce", "bogus", "--cwd", "."]);
  assert.equal(code, 1);
  assert.match(err, /Unknown enforcement mode/);
});

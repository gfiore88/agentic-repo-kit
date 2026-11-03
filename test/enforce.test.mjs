import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
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
  assert.match(workflow.content, /VERIFIER: agentic-repo-kit@\d+\.\d+\.\d+/);
  assert.match(workflow.content, /--adr "\$ADRS"/);
  assert.match(workflow.content, /merge-base HEAD/);
  assert.match(workflow.content, /set -- "\$@" --routine/);
  assert.doesNotMatch(workflow.content, /\$\{\{ github\.event\.pull_request\.body \}\}"/, "PR text must reach the script through env, not inline");

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

test("hooks enforcement projects an executable pre-push hook and sets core.hooksPath", async () => {
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: [], enforce: "hooks" });
  const hook = plan.files.find((file) => file.path === ".agents/hooks/pre-push");
  assert.ok(hook, "expected the pre-push hook to be generated");
  assert.match(hook.content, /verifier="agentic-repo-kit@\d+\.\d+\.\d+"/);
  assert.match(hook.content, /verify --changed "\$changed"/);
  assert.match(hook.content, /< \/dev\/null/);
  assert.match(hook.content, /merge-base/);
  assert.match(hook.content, /\^ADR:\[\[:space:\]\]\*routine/);

  const dir = await tempDir();
  await mkdir(path.join(dir, ".git"), { recursive: true });
  await writeFile(path.join(dir, ".git/config"), "[core]\n\tbare = false\n", "utf8");
  const init = await run(["init", "--runtime", "none", "--enforce", "hooks", "--yes", "--cwd", dir]);
  assert.equal(init.code, 0);

  const hookStat = await stat(path.join(dir, ".agents/hooks/pre-push"));
  assert.ok((hookStat.mode & 0o111) !== 0, "hook should be executable");
  const config = await readFile(path.join(dir, ".git/config"), "utf8");
  assert.match(config, /hooksPath = \.agents\/hooks/);
});

test("switching enforcement away from hooks resets core.hooksPath", async () => {
  const dir = await tempDir();
  await mkdir(path.join(dir, ".git"), { recursive: true });
  await writeFile(path.join(dir, ".git/config"), "[core]\n\tbare = false\n", "utf8");
  await run(["init", "--runtime", "none", "--enforce", "hooks", "--yes", "--cwd", dir]);
  const update = await run(["update", "--enforce", "none", "--yes", "--cwd", dir]);
  assert.equal(update.code, 0);
  const config = await readFile(path.join(dir, ".git/config"), "utf8");
  assert.ok(!/hooksPath/.test(config), "core.hooksPath should be removed");
});

test("an unknown enforcement mode is rejected", async () => {
  const { code, err } = await run(["init", "--enforce", "bogus", "--cwd", "."]);
  assert.equal(code, 1);
  assert.match(err, /Unknown enforcement mode/);
});

test("switching enforcement from ci to none removes the unmodified workflow", async () => {
  const dir = await tempDir();
  await run(["init", "--runtime", "none", "--enforce", "ci", "--yes", "--cwd", dir]);
  const update = await run(["update", "--enforce", "none", "--yes", "--cwd", dir]);
  assert.equal(update.code, 0);
  assert.ok(!await fileExists(path.join(dir, ".github/workflows/governance.yml")));
  assert.ok(!await fileExists(path.join(dir, ".github")), "empty parent directories are pruned");
});

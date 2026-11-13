import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { inspectGitExclude } from "../plugins/agentic-repo/scripts/lib/exclude.mjs";
import { sha256 } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { access } from "node:fs/promises";

async function simulateOlderKernelFile(dir, relative, content) {
  await writeFile(path.join(dir, relative), content, "utf8");
  const lockPath = path.join(dir, "scaffold.lock");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  lock.managedFiles.find((entry) => entry.path === relative).sha256 = sha256(content);
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

async function quiet(argv) {
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    return await runCli(argv);
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
}

async function temporaryDir() {
  return await mkdtemp(path.join(os.tmpdir(), "agentic-repo-update-"));
}

test("update preserves user documentation and upgrades kernel infrastructure", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // 1. Initial init
  const initCode = await runCli(["init", "--yes", "--cwd", dir, "--runtime", "none"]);
  assert.equal(initCode, 0);

  // 2. User customizes their project wiki and adds an ADR
  const customWikiContent = "# My Client Project Wiki\n\nCustom content that must not be lost.\n";
  await writeFile(path.join(dir, "docs/wiki/index.md"), customWikiContent, "utf8");

  await mkdir(path.join(dir, "docs/adr"), { recursive: true });
  const customAdrContent = "# ADR-0001: Client Custom Decision\n";
  await writeFile(path.join(dir, "docs/adr/0001-client-custom.md"), customAdrContent, "utf8");

  // Simulate a kernel file written by an older kit release (the lock records its hash)
  const oldSkillPath = path.join(dir, ".agents/skills/govern-development-task/SKILL.md");
  await simulateOlderKernelFile(dir, ".agents/skills/govern-development-task/SKILL.md", "# Old Skill Content\n");

  // 3. Run update
  const updateCode = await runCli(["update", "--yes", "--cwd", dir, "--runtime", "none"]);
  assert.equal(updateCode, 0);

  // 4. Verify user content is preserved
  const wikiAfter = await readFile(path.join(dir, "docs/wiki/index.md"), "utf8");
  assert.equal(wikiAfter, customWikiContent);

  const adrAfter = await readFile(path.join(dir, "docs/adr/0001-client-custom.md"), "utf8");
  assert.equal(adrAfter, customAdrContent);

  // 5. Verify kernel skill is upgraded to latest blueprint
  const skillAfter = await readFile(oldSkillPath, "utf8");
  assert.ok(skillAfter.includes("End-of-Task Annealing Diagnosis"));
  assert.notEqual(skillAfter, "# Old Skill Content\n");
});

test("update automatically maintains active local git exclusions", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  await mkdir(path.join(dir, ".git/info"), { recursive: true });

  // Init with git-exclude
  await runCli(["init", "--yes", "--cwd", dir, "--git-exclude", "--runtime", "none"]);
  const excludeBefore = await inspectGitExclude(dir);
  assert.equal(excludeBefore.active, true);

  // Update without specifying flag: should detect active exclude and refresh
  const updateCode = await runCli(["update", "--yes", "--cwd", dir]);
  assert.equal(updateCode, 0);

  const excludeAfter = await inspectGitExclude(dir);
  assert.equal(excludeAfter.active, true);
});

test("update alias 'upgrade' works identically", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const initCode = await runCli(["init", "--yes", "--cwd", dir, "--runtime", "none"]);
  assert.equal(initCode, 0);

  const upgradeCode = await runCli(["upgrade", "--yes", "--cwd", dir, "--runtime", "none"]);
  assert.equal(upgradeCode, 0);
});

test("update keeps user edits to kernel files, updates the rest, and --force takes the kit's version", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => rm(dir, { recursive: true, force: true }));
  assert.equal(await quiet(["init", "--yes", "--cwd", dir, "--runtime", "claude-code"]), 0);

  const agentsPath = path.join(dir, "AGENTS.md");
  const customized = `${await readFile(agentsPath, "utf8")}\n## My project rule\n`;
  await writeFile(agentsPath, customized, "utf8");
  await simulateOlderKernelFile(dir, ".agents/registry.md", "# Old registry\n");

  assert.equal(await quiet(["update", "--yes", "--cwd", dir]), 0);
  assert.equal(await readFile(agentsPath, "utf8"), customized, "user edit survives; this version has no kit changes to merge");
  assert.notEqual(await readFile(path.join(dir, ".agents/registry.md"), "utf8"), "# Old registry\n", "the rest of the kernel is updated");

  assert.equal(await quiet(["update", "--yes", "--force", "--cwd", dir]), 0);
  assert.notEqual(await readFile(agentsPath, "utf8"), customized);
});

test("update refuses to run in a repository without scaffold.lock", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, "AGENTS.md"), "# MY OWN AGENTS FILE\n", "utf8");
  assert.equal(await quiet(["update", "--yes", "--cwd", dir, "--runtime", "none"]), 1);
  assert.equal(await readFile(path.join(dir, "AGENTS.md"), "utf8"), "# MY OWN AGENTS FILE\n");
});

test("update removes unmodified files of a dropped runtime and keeps modified ones", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => rm(dir, { recursive: true, force: true }));
  assert.equal(await quiet(["init", "--yes", "--cwd", dir, "--runtime", "claude-code,cursor"]), 0);
  await writeFile(path.join(dir, "CLAUDE.md"), "my notes\n", "utf8");

  assert.equal(await quiet(["update", "--yes", "--cwd", dir, "--runtime", "cursor"]), 0);
  await assert.rejects(access(path.join(dir, ".claude/agents/code-reviewer.md")));
  assert.equal(await readFile(path.join(dir, "CLAUDE.md"), "utf8"), "my notes\n", "modified orphan is kept");
  await access(path.join(dir, ".cursor/rules/agentic-kernel.mdc"));
  const lock = JSON.parse(await readFile(path.join(dir, "scaffold.lock"), "utf8"));
  assert.deepEqual(lock.runtimes, ["cursor"]);
});

test("core profile installs only governance skills and update keeps the profile", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => rm(dir, { recursive: true, force: true }));
  assert.equal(await quiet(["init", "--yes", "--cwd", dir, "--runtime", "none", "--profile", "core"]), 0);
  await access(path.join(dir, ".agents/skills/govern-development-task/SKILL.md"));
  await assert.rejects(access(path.join(dir, ".agents/skills/test-driven-development/SKILL.md")));
  await assert.rejects(access(path.join(dir, ".agents/commands/addys/ship.toml")));

  assert.equal(await quiet(["update", "--yes", "--cwd", dir]), 0);
  await assert.rejects(access(path.join(dir, ".agents/skills/test-driven-development/SKILL.md")));
  assert.match(await readFile(path.join(dir, "scaffold.yaml"), "utf8"), /^profile: core$/m);

  assert.equal(await quiet(["update", "--yes", "--cwd", dir, "--profile", "full"]), 0);
  await access(path.join(dir, ".agents/skills/test-driven-development/SKILL.md"));
});

test("init ships a human-owned ADR gate configuration that update preserves", async (t) => {
  const dir = await temporaryDir();
  t.after(async () => rm(dir, { recursive: true, force: true }));
  assert.equal(await quiet(["init", "--yes", "--cwd", dir, "--runtime", "none"]), 0);
  const gatePath = path.join(dir, "docs/adr/gate.json");
  const gate = JSON.parse(await readFile(gatePath, "utf8"));
  assert.deepEqual(gate.exempt, []);
  assert.ok(gate.routine.includes("package-lock.json"));

  const customized = `${JSON.stringify({ exempt: ["vendor/**"], routine: [] }, null, 2)}\n`;
  await writeFile(gatePath, customized, "utf8");
  assert.equal(await quiet(["update", "--yes", "--cwd", dir]), 0);
  assert.equal(await readFile(gatePath, "utf8"), customized);
});

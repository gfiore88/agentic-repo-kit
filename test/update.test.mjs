import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { applyGitExclude, inspectGitExclude } from "../plugins/agentic-repo/scripts/lib/exclude.mjs";

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

  // Modify a kernel file to simulate an older version
  const oldSkillPath = path.join(dir, ".agents/skills/govern-development-task/SKILL.md");
  await writeFile(oldSkillPath, "# Old Skill Content\n", "utf8");

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

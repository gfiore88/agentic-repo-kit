import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  applyGitExclude,
  inspectGitExclude,
  removeGitExclude,
  MARKER_START,
  MARKER_END,
} from "../plugins/agentic-repo/scripts/lib/exclude.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

test("applyGitExclude adds managed block and preserves pre-existing content", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-git-"));
  const gitInfoDir = path.join(dir, ".git/info");
  await mkdir(gitInfoDir, { recursive: true });
  await writeFile(path.join(gitInfoDir, "exclude"), "# User custom rule\n*.local\n", "utf8");

  const result = await applyGitExclude(dir);
  assert.equal(result.ok, true);

  const content = await readFile(path.join(gitInfoDir, "exclude"), "utf8");
  assert.match(content, /# User custom rule/);
  assert.match(content, /\*\.local/);
  assert.match(content, new RegExp(MARKER_START));
  assert.match(content, /\.agents\//);
  assert.match(content, new RegExp(MARKER_END));
});

test("applyGitExclude is idempotent", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-git-"));
  await mkdir(path.join(dir, ".git/info"), { recursive: true });

  await applyGitExclude(dir);
  const first = await readFile(path.join(dir, ".git/info/exclude"), "utf8");

  await applyGitExclude(dir);
  const second = await readFile(path.join(dir, ".git/info/exclude"), "utf8");

  assert.equal(first, second);
  const startCount = second.split(MARKER_START).length - 1;
  assert.equal(startCount, 1);
});

test("inspectGitExclude reports active status and patterns", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-git-"));
  await mkdir(path.join(dir, ".git/info"), { recursive: true });

  const before = await inspectGitExclude(dir);
  assert.equal(before.active, false);
  assert.equal(before.patterns.length, 0);

  await applyGitExclude(dir);
  const after = await inspectGitExclude(dir);
  assert.equal(after.active, true);
  assert.ok(after.patterns.includes(".agents/"));
  assert.ok(after.patterns.includes("AGENTS.md"));
  assert.ok(after.patterns.includes("THIRD_PARTY_NOTICES.md"));
});

test("removeGitExclude removes managed block and preserves other rules", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-git-"));
  const excludeFile = path.join(dir, ".git/info/exclude");
  await mkdir(path.dirname(excludeFile), { recursive: true });
  await writeFile(excludeFile, "# Custom keep\nbuild/\n", "utf8");

  await applyGitExclude(dir);
  assert.equal((await inspectGitExclude(dir)).active, true);

  const removeResult = await removeGitExclude(dir);
  assert.equal(removeResult.ok, true);
  assert.equal(removeResult.removed, true);

  const content = await readFile(excludeFile, "utf8");
  assert.match(content, /# Custom keep/);
  assert.match(content, /build\//);
  assert.doesNotMatch(content, new RegExp(MARKER_START));
});

test("applyGitExclude gracefully handles missing .git directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-nogit-"));
  const result = await applyGitExclude(dir);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no-git");
});

test("init with --git-exclude configures .git/info/exclude end-to-end", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-e2e-"));
  await mkdir(path.join(dir, ".git"), { recursive: true });

  const exitCode = await runCli(["init", "--cwd", dir, "--yes", "--runtime", "none", "--git-exclude"]);
  assert.equal(exitCode, 0);

  const status = await inspectGitExclude(dir);
  assert.equal(status.active, true);
  assert.ok(status.patterns.includes(".agents/"));
});

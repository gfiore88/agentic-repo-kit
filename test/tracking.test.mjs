import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { parseIndexPaths, resolveGitDirs } from "../plugins/agentic-repo/scripts/lib/git.mjs";

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

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-tracking-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

// Git's offset varint, used by index version 4 for prefix compression.
function varint(value) {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest) {
    rest -= 1;
    bytes.unshift(0x80 | (rest & 0x7f));
    rest >>= 7;
  }
  return Buffer.from(bytes);
}

// Builds a Git index file with zeroed stat data and hashes, which the reader
// ignores.
function buildIndex({ version = 2, hashSize = 20, paths, extended = [], extensions = [] }) {
  const header = Buffer.alloc(12);
  header.write("DIRC", 0, "latin1");
  header.writeUInt32BE(version, 4);
  header.writeUInt32BE(paths.length, 8);
  const parts = [header];
  let previous = Buffer.alloc(0);
  for (const name of paths) {
    const nameBuffer = Buffer.from(name, "utf8");
    const isExtended = extended.includes(name);
    const fixed = Buffer.alloc(40 + hashSize + 2 + (isExtended ? 2 : 0));
    fixed.writeUInt16BE((isExtended ? 0x4000 : 0) | Math.min(nameBuffer.length, 0xfff), 40 + hashSize);
    if (version === 4) {
      let common = 0;
      while (common < previous.length && common < nameBuffer.length && previous[common] === nameBuffer[common]) common += 1;
      parts.push(fixed, varint(previous.length - common), nameBuffer.subarray(common), Buffer.from([0]));
    } else {
      const entry = Buffer.alloc((fixed.length + nameBuffer.length + 8) & ~7);
      fixed.copy(entry);
      nameBuffer.copy(entry, fixed.length);
      parts.push(entry);
    }
    previous = nameBuffer;
  }
  for (const [signature, data] of extensions) {
    const head = Buffer.alloc(8);
    head.write(signature, 0, "latin1");
    head.writeUInt32BE(data.length, 4);
    parts.push(head, data);
  }
  parts.push(Buffer.alloc(hashSize));
  return Buffer.concat(parts);
}

const SAMPLE_PATHS = [
  ".agents/agents/code-reviewer.md",
  ".agents/agents/security-auditor.md",
  ".agents/skills/govern-development-task/SKILL.md",
  "AGENTS.md",
  "a",
  "docs/wiki/caf\u00e9.md",
  "scaffold.lock",
];

test("parseIndexPaths reads index versions 2, 3, and 4 with SHA-1 and SHA-256", () => {
  const expected = new Set(SAMPLE_PATHS);
  assert.deepEqual(parseIndexPaths(buildIndex({ version: 2, paths: SAMPLE_PATHS })), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ version: 3, paths: SAMPLE_PATHS, extended: ["AGENTS.md"] })), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ version: 4, paths: SAMPLE_PATHS })), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ version: 2, hashSize: 32, paths: SAMPLE_PATHS }), 32), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ version: 4, hashSize: 32, paths: SAMPLE_PATHS }), 32), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ paths: SAMPLE_PATHS, extensions: [["TREE", Buffer.from("tree data")]] })), expected);
  assert.deepEqual(parseIndexPaths(buildIndex({ paths: [] })), new Set());
});

test("parseIndexPaths refuses partial, unknown, or damaged indexes", () => {
  assert.equal(parseIndexPaths(buildIndex({ paths: SAMPLE_PATHS, extensions: [["link", Buffer.alloc(20)]] })), null, "split index");
  assert.equal(parseIndexPaths(buildIndex({ paths: SAMPLE_PATHS, extensions: [["sdir", Buffer.alloc(0)]] })), null, "sparse index");
  assert.equal(parseIndexPaths(buildIndex({ version: 5, paths: SAMPLE_PATHS })), null, "unknown version");
  assert.equal(parseIndexPaths(buildIndex({ version: 2, paths: SAMPLE_PATHS, extended: ["a"] })), null, "extended flag in version 2");
  const valid = buildIndex({ paths: SAMPLE_PATHS });
  assert.equal(parseIndexPaths(Buffer.concat([Buffer.from("DIRX"), valid.subarray(4)])), null, "bad signature");
  assert.equal(parseIndexPaths(valid.subarray(0, 90)), null, "truncated");
});

test("exclusions and the hooks path go to the common directory of a linked worktree", async (t) => {
  const root = await tempDir(t);
  const common = path.join(root, "main", ".git");
  const worktreeGitDir = path.join(common, "worktrees", "wt");
  await mkdir(worktreeGitDir, { recursive: true });
  await writeFile(path.join(worktreeGitDir, "commondir"), "../..\n", "utf8");
  const repo = path.join(root, "wt");
  await mkdir(repo);
  await writeFile(path.join(repo, ".git"), "gitdir: ../main/.git/worktrees/wt\n", "utf8");

  assert.deepEqual(await resolveGitDirs(repo), { gitDir: worktreeGitDir, commonDir: common });
  const init = await run(["init", "--yes", "--runtime", "none", "--git-exclude", "--enforce", "hooks", "--cwd", repo]);
  assert.equal(init.code, 0);
  assert.match(await readFile(path.join(common, "info", "exclude"), "utf8"), /BEGIN AGENTIC REPO EXCLUDES/);
  assert.match(await readFile(path.join(common, "config"), "utf8"), /hooksPath = \.agents\/hooks/);
  assert.equal(await exists(path.join(worktreeGitDir, "info", "exclude")), false);
  assert.equal(await exists(path.join(worktreeGitDir, "config")), false);
});

test("doctor warns about kernel files that are neither tracked nor excluded", async (t) => {
  const dir = await tempDir(t);
  await mkdir(path.join(dir, ".git"));
  assert.equal((await run(["init", "--yes", "--runtime", "none", "--cwd", dir])).code, 0);
  const managed = JSON.parse(await readFile(path.join(dir, "scaffold.lock"), "utf8")).managedFiles.map((entry) => entry.path);

  const fresh = JSON.parse((await run(["doctor", "--json", "--cwd", dir])).out);
  assert.equal(fresh.trackingChecked, true, "a missing index means nothing is tracked yet");
  assert.equal(fresh.untracked.length, managed.length + 1);
  assert.equal(fresh.ok, true, "the warning never makes the kernel unhealthy");

  await writeFile(path.join(dir, ".git", "index"), buildIndex({ paths: [...managed].sort() }));
  const json = JSON.parse((await run(["doctor", "--json", "--cwd", dir])).out);
  assert.deepEqual(json.untracked, ["scaffold.lock"]);
  const text = await run(["doctor", "--cwd", dir]);
  assert.equal(text.code, 0);
  assert.match(text.out, /^Untracked: 1 kernel file\(s\) are neither committed nor excluded \(scaffold\.lock\)$/m);
  assert.match(text.out, /^Next step: commit them, or run `npx agentic-repo-kit exclude`/m);
  const status = JSON.parse((await run(["status", "--json", "--cwd", dir])).out);
  assert.equal(status.kernel.untracked, 1);
  assert.match((await run(["status", "--cwd", dir])).out, /^Git: 1 kernel file\(s\) neither committed nor excluded/m);

  assert.equal((await run(["exclude", "--cwd", dir])).code, 0);
  assert.deepEqual(JSON.parse((await run(["doctor", "--json", "--cwd", dir])).out).untracked, []);
});

test("doctor skips the tracking check without a readable index", async (t) => {
  const plain = await tempDir(t);
  assert.equal((await run(["init", "--yes", "--runtime", "none", "--cwd", plain])).code, 0);
  const result = await run(["doctor", "--cwd", plain]);
  assert.equal(result.code, 0);
  assert.match(result.out, /^Git tracking: not checked \(no readable Git index\)$/m);

  await mkdir(path.join(plain, ".git"));
  await writeFile(path.join(plain, ".git", "index"), buildIndex({ paths: ["AGENTS.md"], extensions: [["link", Buffer.alloc(20)]] }));
  const json = JSON.parse((await run(["doctor", "--json", "--cwd", plain])).out);
  assert.equal(json.trackingChecked, false);
  assert.deepEqual(json.untracked, []);
});

const gitAvailable = spawnSync("git", ["--version"]).status === 0;

test("doctor and exclusions agree with a real Git repository", { skip: !gitAvailable && "git is not available" }, async (t) => {
  const root = await tempDir(t);
  const git = (cwd, ...args) => {
    const result = spawnSync("git", ["-c", "user.email=test@example.com", "-c", "user.name=Test", ...args], { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };

  // A repository that commits the kernel.
  const owned = path.join(root, "owned");
  await mkdir(owned);
  git(owned, "init", "-q");
  assert.equal((await run(["init", "--yes", "--runtime", "github-copilot", "--cwd", owned])).code, 0);
  git(owned, "add", "-A");
  git(owned, "commit", "-q", "-m", "kernel");
  assert.deepEqual(JSON.parse((await run(["doctor", "--json", "--cwd", owned])).out).untracked, []);
  git(owned, "rm", "-q", "--cached", "scaffold.lock");
  assert.deepEqual(JSON.parse((await run(["doctor", "--json", "--cwd", owned])).out).untracked, ["scaffold.lock"]);
  git(owned, "update-index", "--index-version", "4");
  assert.deepEqual(JSON.parse((await run(["doctor", "--json", "--cwd", owned])).out).untracked, ["scaffold.lock"]);

  // A client repository whose kit files stay local, used from a linked worktree.
  const client = path.join(root, "client");
  await mkdir(client);
  git(client, "init", "-q");
  await writeFile(path.join(client, "app.php"), "<?php\n", "utf8");
  git(client, "add", "app.php");
  git(client, "commit", "-q", "-m", "client code");
  const worktree = path.join(root, "client-wt");
  git(client, "worktree", "add", "-q", worktree);
  assert.equal((await run(["init", "--yes", "--runtime", "none", "--git-exclude", "--enforce", "hooks", "--cwd", worktree])).code, 0);
  assert.equal(git(worktree, "status", "--porcelain"), "", "kit files are hidden in the linked worktree");
  assert.equal(git(worktree, "config", "core.hooksPath").trim(), ".agents/hooks");
  assert.deepEqual(JSON.parse((await run(["doctor", "--json", "--cwd", worktree])).out).untracked, []);
});

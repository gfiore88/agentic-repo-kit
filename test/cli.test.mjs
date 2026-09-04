import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-cli-"));
}

async function fileExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

// Runs the CLI while capturing stdout/stderr so we can assert on machine output
// and exit codes without touching the real process streams.
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

test("no arguments prints help and exits zero", async () => {
  const { code, out } = await run([]);
  assert.equal(code, 0);
  assert.match(out, /Agentic Repository Kernel/);
  assert.match(out, /Usage:/);
});

test("--help prints help", async () => {
  const { code, out } = await run(["--help"]);
  assert.equal(code, 0);
  assert.match(out, /Runtime IDs:/);
});

test("unknown command exits non-zero with a diagnostic", async () => {
  const { code, err } = await run(["frobnicate"]);
  assert.equal(code, 1);
  assert.match(err, /Unknown command: frobnicate/);
});

test("unknown option exits non-zero with a diagnostic", async () => {
  const { code, err } = await run(["init", "--nope"]);
  assert.equal(code, 1);
  assert.match(err, /Unknown option: --nope/);
});

test("init --dry-run writes nothing", async () => {
  const dir = await tempDir();
  const { code } = await run(["init", "--dry-run", "--cwd", dir, "--runtime", "none"]);
  assert.equal(code, 0);
  assert.equal(await fileExists(path.join(dir, "AGENTS.md")), false);
});

test("init without confirmation in a non-interactive shell exits 2 and writes nothing", async () => {
  const dir = await tempDir();
  const { code } = await run(["init", "--cwd", dir, "--runtime", "none"]);
  assert.equal(code, 2);
  assert.equal(await fileExists(path.join(dir, "AGENTS.md")), false);
});

test("init --yes --json emits a parseable plan and applies it", async () => {
  const dir = await tempDir();
  const { code, out } = await run(["init", "--yes", "--json", "--cwd", dir, "--runtime", "none"]);
  assert.equal(code, 0);
  const payload = JSON.parse(out);
  assert.equal(payload.cwd, dir);
  assert.deepEqual(payload.runtimes, []);
  assert.ok(payload.created.length > 0);
  assert.deepEqual(payload.conflicts, []);
  assert.equal(await fileExists(path.join(dir, "AGENTS.md")), true);
});

test("doctor reports an uninitialized repository as unhealthy", async () => {
  const dir = await tempDir();
  const { code, out } = await run(["doctor", "--json", "--cwd", dir]);
  assert.equal(code, 1);
  const payload = JSON.parse(out);
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.missing, ["scaffold.lock"]);
});

test("doctor reports a fresh initialization as healthy", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--cwd", dir, "--runtime", "none"]);
  const { code, out } = await run(["doctor", "--json", "--cwd", dir]);
  assert.equal(code, 0);
  const payload = JSON.parse(out);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.divergent, []);
});

test("doctor stays healthy after the user customizes user-owned documentation", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--cwd", dir, "--runtime", "none"]);
  await writeFile(path.join(dir, "docs/wiki/index.md"), "# My Project Wiki\n", "utf8");
  const { code } = await run(["doctor", "--cwd", dir]);
  assert.equal(code, 0);
});

test("knowledge lint passes on a fresh knowledge base and fails when missing", async () => {
  const dir = await tempDir();
  const uninitialized = await run(["knowledge", "lint", "--cwd", dir]);
  assert.equal(uninitialized.code, 1);

  await run(["init", "--yes", "--cwd", dir, "--runtime", "none"]);
  const initialized = await run(["knowledge", "lint", "--cwd", dir]);
  assert.equal(initialized.code, 0);
});

test("adr new requires a title and otherwise creates a Proposed artifact", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--cwd", dir, "--runtime", "none"]);

  const missingTitle = await run(["adr", "new", "--cwd", dir]);
  assert.equal(missingTitle.code, 1);
  assert.match(missingTitle.err, /requires --title/);

  const created = await run(["adr", "new", "--title", "Persistence boundary", "--json", "--cwd", dir]);
  assert.equal(created.code, 0);
  const payload = JSON.parse(created.out);
  assert.equal(payload.status, "Proposed");
  assert.equal(await fileExists(path.join(dir, payload.created)), true);
});

test("exclude command reports non-git targets and manages a git repository", async () => {
  const nonGit = await tempDir();
  const listed = await run(["exclude", "--list", "--cwd", nonGit]);
  assert.equal(listed.code, 1);

  const gitDir = await tempDir();
  await mkdir(path.join(gitDir, ".git/info"), { recursive: true });
  assert.equal((await run(["exclude", "--cwd", gitDir])).code, 0);
  assert.equal((await run(["exclude", "--list", "--cwd", gitDir])).code, 0);
  assert.equal((await run(["exclude", "--remove", "--cwd", gitDir])).code, 0);
});

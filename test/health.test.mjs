import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "../plugins/agentic-repo/scripts/lib/args.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

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

async function initialized(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-health-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.equal((await run(["init", "--yes", "--runtime", "none", "--cwd", dir])).code, 0);
  return dir;
}

test("doctor lists customized kernel files without failing, and --strict fails on them", async (t) => {
  const dir = await initialized(t);
  const agents = path.join(dir, "AGENTS.md");
  await writeFile(agents, `${await readFile(agents, "utf8")}\n## Project rules\n`, "utf8");

  const result = await run(["doctor", "--cwd", dir]);
  assert.equal(result.code, 0);
  assert.match(result.out, /^Missing: 0; divergent: 1$/m);
  assert.match(result.out, /^ {2}customized: AGENTS\.md$/m);
  assert.match(result.out, /^Customized kernel files are supported: update merges your changes/m);
  assert.match(result.out, /^Status: healthy$/m);

  const strict = await run(["doctor", "--strict", "--cwd", dir]);
  assert.equal(strict.code, 1);
  assert.match(strict.out, /^ {2}divergent: AGENTS\.md$/m);
  assert.match(strict.out, /^Status: unhealthy$/m);

  const status = await run(["status", "--cwd", dir]);
  assert.match(status.out, /^Integrity: healthy \(1 customized\)$/m);
  assert.throws(() => parseArgs(["update", "--strict"]), /--strict applies only to doctor/);
});

test("doctor reports pending kit changes and stays unhealthy for real problems", async (t) => {
  const dir = await initialized(t);
  const lockPath = path.join(dir, "scaffold.lock");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  lock.managedFiles.find((entry) => entry.path === "AGENTS.md").kitVersion = "0.0.1-test";
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

  const pending = await run(["doctor", "--json", "--cwd", dir]);
  assert.equal(pending.code, 0);
  assert.deepEqual(JSON.parse(pending.out).pending, ["AGENTS.md"]);
  assert.match((await run(["doctor", "--cwd", dir])).out, /^Pending kit changes: 1 kernel file\(s\) kept at an older kit version \(AGENTS\.md\)$/m);
  assert.match((await run(["status", "--cwd", dir])).out, /^Pending: 1 kernel file\(s\) wait for the kit's changes/m);

  await unlink(path.join(dir, ".agents", "registry.md"));
  const missing = await run(["doctor", "--cwd", dir]);
  assert.equal(missing.code, 1, "a missing kernel file is a real problem");
  assert.match((await run(["status", "--cwd", dir])).out, /^Integrity: unhealthy \(missing 1, conflict markers 0; run doctor\)$/m);
});

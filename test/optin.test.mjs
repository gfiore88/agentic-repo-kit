import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function initialized() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-optin-"));
  await run(["init", "--yes", "--runtime", "none", "--cwd", dir]);
  return dir;
}

const gatePath = (dir) => path.join(dir, "docs/adr/gate.json");
const readGate = async (dir) => JSON.parse(await readFile(gatePath(dir), "utf8"));

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

test("update creates a missing gate.json without the tier unless --enable-low-risk", async () => {
  const plain = await initialized();
  await rm(gatePath(plain));
  const update = await run(["update", "--yes", "--json", "--cwd", plain]);
  assert.equal(update.code, 0);
  assert.equal(JSON.parse(update.out).lowRiskTier, "disabled");
  const created = await readGate(plain);
  assert.equal(created.lowRisk, undefined, "update never enables the tier silently");
  assert.ok(created.routine.length > 0);
  const doctor = await run(["doctor", "--cwd", plain]);
  assert.equal(doctor.code, 0);

  const optedIn = await initialized();
  await rm(gatePath(optedIn));
  const enabled = await run(["update", "--yes", "--enable-low-risk", "--cwd", optedIn]);
  assert.equal(enabled.code, 0);
  assert.match(enabled.out, /Low-risk tier: will be enabled/);
  assert.equal((await readGate(optedIn)).lowRisk.maxFiles, 5);
});

test("--enable-low-risk adds the default policy to an existing gate.json and keeps its keys", async () => {
  const dir = await initialized();
  const custom = `${JSON.stringify({ exempt: ["assets/generated/**"], routine: ["yarn.lock"] })}\n`;
  await writeFile(gatePath(dir), custom, "utf8");

  const plain = await run(["update", "--yes", "--cwd", dir]);
  assert.match(plain.out, /Low-risk tier: disabled; add the default policy with --enable-low-risk/);
  assert.equal(await readFile(gatePath(dir), "utf8"), custom, "without the flag the user-owned file is untouched");

  const enabled = await run(["update", "--yes", "--enable-low-risk", "--cwd", dir]);
  assert.equal(enabled.code, 0);
  assert.match(enabled.out, /Enabled the low-risk tier in docs\/adr\/gate\.json/);
  const gate = await readGate(dir);
  assert.deepEqual(gate.exempt, ["assets/generated/**"]);
  assert.deepEqual(gate.routine, ["yarn.lock"]);
  assert.deepEqual([gate.lowRisk.maxFiles, gate.lowRisk.maxLines], [5, 200]);
  const verify = await run(["verify", "--json", "--cwd", dir, "--changed", "docs/wiki/index.md"]);
  assert.equal(JSON.parse(verify.out).ok, true, "the added policy is valid");
});

test("an existing lowRisk section is never overwritten", async () => {
  const dir = await initialized();
  const gate = await readGate(dir);
  gate.lowRisk.maxFiles = 3;
  const custom = `${JSON.stringify(gate)}\n`;
  await writeFile(gatePath(dir), custom, "utf8");
  const update = await run(["update", "--yes", "--json", "--enable-low-risk", "--cwd", dir]);
  assert.equal(JSON.parse(update.out).lowRiskTier, "enabled");
  assert.equal(await readFile(gatePath(dir), "utf8"), custom);
});

test("an invalid gate.json refuses --enable-low-risk without writing anything", async () => {
  const dir = await initialized();
  await writeFile(gatePath(dir), "{ not json", "utf8");
  await rm(path.join(dir, ".agents/registry.md"));
  const update = await run(["update", "--yes", "--enable-low-risk", "--cwd", dir]);
  assert.equal(update.code, 1);
  assert.match(update.err, /not valid JSON.*No files written/);
  assert.equal(await readFile(gatePath(dir), "utf8"), "{ not json");
  assert.equal(await exists(path.join(dir, ".agents/registry.md")), false, "the rest of the update is not applied either");
});

test("--dry-run with --enable-low-risk only reports the change", async () => {
  const dir = await initialized();
  const custom = `${JSON.stringify({ exempt: [], routine: [] })}\n`;
  await writeFile(gatePath(dir), custom, "utf8");
  const dry = await run(["update", "--dry-run", "--enable-low-risk", "--cwd", dir]);
  assert.equal(dry.code, 0);
  assert.match(dry.out, /Low-risk tier: will be enabled/);
  assert.equal(await readFile(gatePath(dir), "utf8"), custom);
});

test("--enable-low-risk is accepted only by update", () => {
  assert.equal(parseArgs(["update", "--enable-low-risk"]).enableLowRisk, true);
  assert.throws(() => parseArgs(["init", "--enable-low-risk"]), /applies only to update/);
});

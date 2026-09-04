import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyGovernance } from "../plugins/agentic-repo/scripts/lib/verify.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-verify-"));
}

async function writeAdr(dir, name, status) {
  await mkdir(path.join(dir, "docs/adr"), { recursive: true });
  await writeFile(
    path.join(dir, "docs/adr", name),
    `---\ntitle: "X"\nstatus: "${status}"\ndate: "2026-09-04"\n---\n\n# X\n`,
    "utf8"
  );
}

test("documentation-only changes do not require an ADR", async () => {
  const dir = await tempDir();
  const result = await verifyGovernance(dir, { changedFiles: ["docs/wiki/index.md"] });
  assert.equal(result.ok, true);
  assert.equal(result.adrGateApplied, true);
});

test("source changes without an Accepted ADR are flagged", async () => {
  const dir = await tempDir();
  const result = await verifyGovernance(dir, { changedFiles: ["src/app.js"] });
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((violation) => violation.kind === "adr-gate"));
});

test("source changes accompanied by an Accepted ADR pass", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0001-thing.md", "Accepted");
  const result = await verifyGovernance(dir, {
    changedFiles: ["src/app.js", "docs/adr/adr-0001-thing.md"],
  });
  assert.equal(result.ok, true);
});

test("a Proposed-only ADR does not satisfy the gate for source changes", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0001-thing.md", "Proposed");
  const result = await verifyGovernance(dir, {
    changedFiles: ["src/app.js", "docs/adr/adr-0001-thing.md"],
  });
  assert.equal(result.ok, false);
});

test("an ADR with an invalid status is flagged", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0002-bad.md", "Bogus");
  const result = await verifyGovernance(dir, {});
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((violation) => violation.kind === "adr"));
});

test("the ADR gate is skipped when no change set is provided", async () => {
  const dir = await tempDir();
  const result = await verifyGovernance(dir, {});
  assert.equal(result.adrGateApplied, false);
  assert.equal(result.ok, true);
});

test("verify CLI returns non-zero on violations and zero when compliant", async () => {
  const dir = await tempDir();
  const nonCompliant = await runCli(["verify", "--json", "--cwd", dir, "--changed", "src/app.js"]);
  assert.equal(nonCompliant, 1);

  await writeAdr(dir, "adr-0001-thing.md", "Accepted");
  const compliant = await runCli([
    "verify", "--json", "--cwd", dir, "--changed", "src/app.js,docs/adr/adr-0001-thing.md",
  ]);
  assert.equal(compliant, 0);
});

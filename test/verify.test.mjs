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

test("kit-managed adapter files do not trip the ADR gate", async () => {
  const dir = await tempDir();
  await writeFile(path.join(dir, "scaffold.lock"), JSON.stringify({
    managedFiles: [{ path: "CLAUDE.md", sha256: "x" }, { path: ".claude/agents/code-reviewer.md", sha256: "y" }],
  }), "utf8");
  const result = await verifyGovernance(dir, { changedFiles: ["CLAUDE.md", ".claude/agents/code-reviewer.md"] });
  assert.equal(result.ok, true);
  const withSource = await verifyGovernance(dir, { changedFiles: ["CLAUDE.md", "src/app.js"] });
  assert.equal(withSource.ok, false);
});

test("a referenced Accepted ADR satisfies the gate for follow-up work", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0007-event-bus.md", "Accepted");
  await writeAdr(dir, "adr-0008-draft.md", "Proposed");
  const accepted = await verifyGovernance(dir, { changedFiles: ["src/app.js"], adrReferences: ["ADR-0007"] });
  assert.equal(accepted.ok, true);
  assert.deepEqual(accepted.adrReferences.map((ref) => [ref.reference, ref.status]), [["ADR-0007", "Accepted"]]);

  const proposed = await verifyGovernance(dir, { changedFiles: ["src/app.js"], adrReferences: ["ADR-0008", "ADR-0099"] });
  assert.equal(proposed.ok, false);
  assert.deepEqual(proposed.adrReferences.map((ref) => ref.status), ["Proposed", null]);
});

test("verify CLI accepts --adr references", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0003-thing.md", "Accepted");
  const code = await runCli(["verify", "--json", "--cwd", dir, "--changed", "src/app.js", "--adr", "ADR-0003"]);
  assert.equal(code, 0);
});

async function writeGate(dir, config) {
  await mkdir(path.join(dir, "docs/adr"), { recursive: true });
  await writeFile(path.join(dir, "docs/adr/gate.json"), typeof config === "string" ? config : JSON.stringify(config), "utf8");
}

test("exempt globs in docs/adr/gate.json never need an ADR", async () => {
  const dir = await tempDir();
  await writeGate(dir, { exempt: [".editorconfig", "assets/generated/**"], routine: [] });
  const exempt = await verifyGovernance(dir, { changedFiles: [".editorconfig", "assets/generated/icons/a.svg"] });
  assert.equal(exempt.ok, true);
  const mixed = await verifyGovernance(dir, { changedFiles: [".editorconfig", "src/app.js"] });
  assert.equal(mixed.ok, false);
  assert.match(mixed.violations[0].detail, /src\/app\.js/);
  assert.doesNotMatch(mixed.violations[0].detail, /editorconfig/);
});

test("routine tier passes inside routine globs with a log entry and fails otherwise", async () => {
  const dir = await tempDir();
  await writeGate(dir, { exempt: [], routine: ["yarn.lock", "*.lock"] });
  const ok = await verifyGovernance(dir, { changedFiles: ["yarn.lock", "api/poetry.lock", "docs/wiki/log.md"], routine: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.routine, true);

  const noLog = await verifyGovernance(dir, { changedFiles: ["yarn.lock"], routine: true });
  assert.equal(noLog.ok, false);
  assert.match(noLog.violations[0].detail, /docs\/wiki\/log\.md/);

  const outside = await verifyGovernance(dir, { changedFiles: ["yarn.lock", "src/app.js", "docs/wiki/log.md"], routine: true });
  assert.equal(outside.ok, false);
  assert.match(outside.violations[0].detail, /outside the routine globs.*src\/app\.js/);

  const undeclared = await verifyGovernance(dir, { changedFiles: ["yarn.lock", "docs/wiki/log.md"] });
  assert.equal(undeclared.ok, false, "routine tier must be declared explicitly");
});

test("an Accepted ADR takes precedence over a routine declaration", async () => {
  const dir = await tempDir();
  await writeGate(dir, { routine: ["package-lock.json"] });
  await writeAdr(dir, "adr-0004-feature.md", "Accepted");
  const result = await verifyGovernance(dir, { changedFiles: ["src/app.js", "package-lock.json"], adrReferences: ["ADR-0004"], routine: true });
  assert.equal(result.ok, true);
});

test("an invalid gate configuration is reported", async () => {
  const dir = await tempDir();
  await writeGate(dir, "{ not json");
  const result = await verifyGovernance(dir, { changedFiles: ["docs/wiki/index.md"] });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].kind, "adr-config");
});

test("verify CLI accepts --routine", async () => {
  const dir = await tempDir();
  await writeGate(dir, { routine: ["yarn.lock"] });
  assert.equal(await runCli(["verify", "--json", "--cwd", dir, "--changed", "yarn.lock,docs/wiki/log.md", "--routine"]), 0);
});

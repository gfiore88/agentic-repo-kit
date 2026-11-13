import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KNOWLEDGE_FINDINGS, verifyGovernance } from "../plugins/agentic-repo/scripts/lib/verify.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { applyPlan } from "../plugins/agentic-repo/scripts/lib/writer.mjs";
import { lintKnowledge } from "../plugins/agentic-repo/scripts/lib/knowledge.mjs";
import { collectStatus } from "../plugins/agentic-repo/scripts/lib/status.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../plugins/agentic-repo");

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-verify-"));
}

async function initializedRepository() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-verify-init-"));
  const plan = await buildPlan({
    assetsRoot: path.join(pluginRoot, "assets"),
    skillsRoot: path.join(pluginRoot, "skills"),
    runtimes: [],
  });
  await applyPlan(cwd, plan);
  return cwd;
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

test("verify maps every knowledge lint category", async () => {
  const lint = await lintKnowledge(await initializedRepository());
  const categories = Object.keys(lint).filter((key) => Array.isArray(lint[key])).sort();
  assert.deepEqual(Object.keys(KNOWLEDGE_FINDINGS).sort(), categories);
});

test("verify enforces every knowledge lint category", async () => {
  const cwd = await initializedRepository();
  // Catalogued by path text but linked from nowhere, and without frontmatter.
  await writeFile(path.join(cwd, "docs/wiki/loner.md"), "# Loner\n\nNo inbound links.\n", "utf8");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(indexFile, `${await readFile(indexFile, "utf8")}\n<!-- loner.md -->\n`, "utf8");
  await mkdir(path.join(cwd, "docs/raw"), { recursive: true });
  await writeFile(path.join(cwd, "docs/raw/2026-09-04-note.md"), "raw note\n", "utf8");
  const logFile = path.join(cwd, "docs/wiki/log.md");
  await writeFile(logFile, `${await readFile(logFile, "utf8")}\n## Not a valid entry\n`, "utf8");

  const result = await verifyGovernance(cwd, {});
  assert.equal(result.ok, false);
  const details = result.violations.filter((violation) => violation.kind === "knowledge").map((violation) => violation.detail);
  assert.ok(details.includes("orphan page docs/wiki/loner.md"));
  assert.ok(details.includes("uncovered raw source docs/raw/2026-09-04-note.md"));
  assert.ok(details.some((detail) => /^malformed log entry docs\/wiki\/log\.md:\d+$/.test(detail)));
  assert.ok(details.includes("frontmatter: docs/wiki/loner.md -> missing frontmatter"));
});

test("verify passes on a healthy initialized knowledge base", async () => {
  const result = await verifyGovernance(await initializedRepository(), {});
  assert.equal(result.adrGateApplied, false);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
});

test("duplicate ADR numbers are violations and make references ambiguous", async () => {
  const dir = await tempDir();
  await writeAdr(dir, "adr-0001-use-redis-cache.md", "Accepted");
  await writeAdr(dir, "adr-0001-switch-to-postgres.md", "Proposed");
  await writeAdr(dir, "adr-0002-unique.md", "Accepted");

  const plain = await verifyGovernance(dir, {});
  assert.equal(plain.ok, false);
  assert.deepEqual(plain.violations, [{
    kind: "adr",
    detail: "ADR-0001 is used by more than one file (docs/adr/adr-0001-switch-to-postgres.md, docs/adr/adr-0001-use-redis-cache.md); renumber the later ADR",
  }]);

  const ambiguous = await verifyGovernance(dir, { changedFiles: ["src/db.js"], adrReferences: ["ADR-0001"] });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.adrReferences[0].status, null);
  assert.match(ambiguous.adrReferences[0].detail, /^ambiguous: docs\/adr\/adr-0001-switch-to-postgres\.md, docs\/adr\/adr-0001-use-redis-cache\.md$/);
  assert.ok(ambiguous.violations.some((violation) => violation.kind === "adr-gate"));

  const unique = await verifyGovernance(dir, { changedFiles: ["src/db.js"], adrReferences: ["ADR-0002"] });
  assert.equal(unique.adrReferences[0].status, "Accepted");
  assert.ok(!unique.violations.some((violation) => violation.kind === "adr-gate"));
});

test("ADR status parsing accepts CRLF line endings and trailing YAML comments", async () => {
  const dir = await tempDir();
  await mkdir(path.join(dir, "docs/adr"), { recursive: true });
  await writeFile(path.join(dir, "docs/adr/adr-0001-crlf.md"), '---\r\ntitle: "ADR-0001: Crlf"\r\nstatus: "Accepted"\r\n---\r\n\r\n# ADR-0001: Crlf\r\n', "utf8");
  await writeFile(path.join(dir, "docs/adr/adr-0002-comment.md"), '---\ntitle: "ADR-0002: Comment"  # short\nstatus: "Accepted"  # approved in review\n---\n\n# ADR-0002: Comment\n', "utf8");
  const result = await verifyGovernance(dir, { changedFiles: ["src/app.js"], adrReferences: ["ADR-0001", "ADR-0002"] });
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.adrReferences.map((reference) => reference.status), ["Accepted", "Accepted"]);
  const digest = await collectStatus(dir);
  assert.deepEqual(digest.adrs.map((record) => [record.id, record.status, record.title]), [
    ["ADR-0002", "Accepted", "Comment"],
    ["ADR-0001", "Accepted", "Crlf"],
  ]);
});

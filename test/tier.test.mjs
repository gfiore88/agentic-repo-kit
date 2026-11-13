import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLineCounts, readGateConfig, verifyGovernance } from "../plugins/agentic-repo/scripts/lib/verify.mjs";
import { collectStatus } from "../plugins/agentic-repo/scripts/lib/status.mjs";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../plugins/agentic-repo");
const blueprintGate = path.join(pluginRoot, "assets/blueprints/base/docs/adr/gate.json");

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-tier-"));
}

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

async function repoWithPolicy(policy = "blueprint") {
  const dir = await tempDir();
  await mkdir(path.join(dir, "docs/adr"), { recursive: true });
  const gate = JSON.parse(await readFile(blueprintGate, "utf8"));
  if (policy === null) delete gate.lowRisk;
  else if (policy !== "blueprint") gate.lowRisk = policy;
  await writeFile(path.join(dir, "docs/adr/gate.json"), JSON.stringify(gate), "utf8");
  return dir;
}

async function writeTierAdr(dir, name, fields = {}) {
  const frontmatter = { title: "Tier task", status: "Accepted", tier: "low-risk", review: "pending", ...fields };
  const body = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  await writeFile(path.join(dir, "docs/adr", name), `---\n${body}\n---\n\n# Tier task\n`, "utf8");
}

const TIER_ADR = "docs/adr/adr-0001-tier-task.md";
const SMALL_CHANGE = ["src/format.js", "test/format.test.js", TIER_ADR, "docs/wiki/log.md"];
const SMALL_LINES = "12:src/format.js,8:test/format.test.js,60:docs/adr/adr-0001-tier-task.md,4:docs/wiki/log.md";

test("a change within the thresholds passes through the tier and waits for review", async () => {
  const dir = await repoWithPolicy();
  await writeTierAdr(dir, "adr-0001-tier-task.md");
  const result = await verifyGovernance(dir, { changedFiles: SMALL_CHANGE, lines: SMALL_LINES });
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.lowRiskAdrs, ["ADR-0001"]);
  const digest = await collectStatus(dir);
  assert.deepEqual(digest.pendingReviews.map((item) => [item.id, item.review]), [["ADR-0001", "pending"]]);
  assert.equal(digest.adrs[0].tier, "low-risk");
});

test("every excluded category keeps the normal stop", async () => {
  const dir = await repoWithPolicy();
  await writeTierAdr(dir, "adr-0001-tier-task.md");
  const cases = {
    security: "src/auth/session.js",
    dependencies: "package.json",
    publicApi: "src/api/routes.js",
    migrations: "db/migrations/0001_init.sql",
    governance: "AGENTS.md",
  };
  for (const [category, file] of Object.entries(cases)) {
    const changed = [...SMALL_CHANGE, file];
    const result = await verifyGovernance(dir, { changedFiles: changed, lines: `${SMALL_LINES},5:${file}` });
    const details = result.violations.filter((violation) => violation.kind === "adr-tier").map((violation) => violation.detail);
    assert.ok(details.some((detail) => detail.includes(`${file} is in the excluded category ${category}`)), `${category}: ${details.join("; ")}`);
  }
});

test("thresholds, unknown line counts, and untested code fail closed", async () => {
  const dir = await repoWithPolicy();
  await writeTierAdr(dir, "adr-0001-tier-task.md");
  const problems = async (options) => (await verifyGovernance(dir, options)).violations
    .filter((violation) => violation.kind === "adr-tier").map((violation) => violation.detail.replace(/^low-risk tier \(ADR-0001\): /, ""));

  const manyFiles = ["a", "b", "c", "d", "e"].map((name) => `src/${name}.js`);
  assert.deepEqual(await problems({ changedFiles: [...manyFiles, "test/a.test.js", TIER_ADR], lines: "60" }), ["6 changed source files exceed maxFiles 5"]);
  assert.deepEqual(await problems({ changedFiles: SMALL_CHANGE, lines: "150:src/format.js,51:test/format.test.js" }), ["201 changed lines exceed maxLines 200"]);
  assert.deepEqual(await problems({ changedFiles: SMALL_CHANGE }), ["the changed line count is unknown; pass --lines"]);
  assert.deepEqual(await problems({ changedFiles: SMALL_CHANGE, lines: "12:src/format.js" }), ["no line count for test/format.test.js"]);
  assert.deepEqual(await problems({ changedFiles: ["src/format.js", TIER_ADR], lines: "12:src/format.js" }), ["code changes without a changed test file"]);
  assert.deepEqual(await problems({ changedFiles: ["test/format.test.js", TIER_ADR], lines: "8:test/format.test.js" }), [], "test-only changes need no extra test");
});

test("a missing or malformed policy disables the tier", async () => {
  const disabled = await repoWithPolicy(null);
  await writeTierAdr(disabled, "adr-0001-tier-task.md");
  const result = await verifyGovernance(disabled, { changedFiles: SMALL_CHANGE, lines: SMALL_LINES });
  assert.ok(result.violations.some((violation) => violation.detail.endsWith("the low-risk tier is not enabled in docs/adr/gate.json")));
  const created = await run(["adr", "new", "--title", "Tiny fix", "--tier", "low-risk", "--cwd", disabled]);
  assert.equal(created.code, 1);
  assert.match(created.err, /low-risk tier is not enabled/);

  const malformed = await repoWithPolicy({ maxFiles: 0, maxLines: 200, tests: [], exclude: {} });
  await writeTierAdr(malformed, "adr-0001-tier-task.md");
  const broken = await verifyGovernance(malformed, { changedFiles: SMALL_CHANGE, lines: SMALL_LINES });
  assert.ok(broken.violations.some((violation) => violation.kind === "adr-config" && /lowRisk\.maxFiles must be a positive integer/.test(violation.detail)));
  assert.ok(broken.violations.some((violation) => violation.kind === "adr-tier" && /not enabled/.test(violation.detail)));
});

test("--require-reviews blocks pending, rejected, and incomplete reviews", async () => {
  const review = async (fields) => {
    const dir = await repoWithPolicy();
    await writeTierAdr(dir, "adr-0001-tier-task.md", fields);
    const result = await verifyGovernance(dir, { changedFiles: SMALL_CHANGE, lines: SMALL_LINES, requireReviews: true });
    return result.violations.filter((violation) => violation.kind === "adr-review").map((violation) => violation.detail);
  };
  assert.deepEqual(await review({}), ["ADR-0001 is waiting for human review"]);
  assert.deepEqual(await review({ review: "rejected" }), ["ADR-0001 was rejected in review"]);
  assert.deepEqual(await review({ review: "approved", reviewed_by: "Giovanni Fiore", reviewed_on: "2026-11-13" }),
    ["ADR-0001 review evidence is incomplete (reviewed_by, reviewed_on, review_quote)"]);
  assert.deepEqual(await review({ review: "approved", reviewed_by: "Giovanni Fiore", reviewed_on: "2026-11-13", review_quote: "approvo ADR-0001" }), []);

  const dir = await repoWithPolicy();
  await writeTierAdr(dir, "adr-0001-tier-task.md");
  const local = await verifyGovernance(dir, { changedFiles: SMALL_CHANGE, lines: SMALL_LINES });
  assert.equal(local.ok, true, "without --require-reviews local work never stops");
});

test("adr new --tier and adr review record a tier ADR and its human review", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--runtime", "none", "--cwd", dir]);
  const created = JSON.parse((await run(["adr", "new", "--title", "Fix date formatting", "--tier", "low-risk", "--json", "--cwd", dir])).out);
  assert.deepEqual([created.status, created.tier, created.review], ["Accepted", "low-risk", "pending"]);
  const file = path.join(dir, created.created);
  const content = await readFile(file, "utf8");
  assert.match(content, /^status: "Accepted"$/m);
  assert.match(content, /^tier: "low-risk"$/m);
  assert.match(content, /^review: "pending"$/m);
  assert.match(content, /## Low-Risk Tier Eligibility/);
  assert.match(content, /Human review: pending\./);

  const missingQuote = await run(["adr", "review", "--adr", "ADR-0001", "--decision", "approved", "--by", "Giovanni Fiore", "--cwd", dir]);
  assert.equal(missingQuote.code, 1);
  assert.match(missingQuote.err, /requires --quote/);

  const approved = await run(["adr", "review", "--adr", "ADR-0001", "--decision", "approved", "--by", "Giovanni Fiore", "--quote", "approvo ADR-0001 \"Fix date formatting\"", "--cwd", dir]);
  assert.equal(approved.code, 0);
  const reviewed = await readFile(file, "utf8");
  assert.match(reviewed, /^review: "approved"$/m);
  assert.match(reviewed, /^reviewed_by: "Giovanni Fiore"$/m);
  assert.match(reviewed, /^reviewed_on: "\d{4}-\d{2}-\d{2}"$/m);
  assert.match(reviewed, /^review_quote: "approvo ADR-0001 \\"Fix date formatting\\""$/m);
  assert.match(reviewed, /Human review: approved by Giovanni Fiore/);
  const again = await run(["adr", "review", "--adr", "ADR-0001", "--decision", "rejected", "--by", "Giovanni Fiore", "--quote", "no", "--cwd", dir]);
  assert.match(again.err, /already approved/);

  const gated = await verifyGovernance(dir, { changedFiles: ["src/date.js", "test/date.test.js", created.created], lines: "9:src/date.js,6:test/date.test.js", requireReviews: true });
  assert.deepEqual(gated.violations, []);

  const second = JSON.parse((await run(["adr", "new", "--title", "Rename helper", "--tier", "low-risk", "--json", "--cwd", dir])).out);
  const rejected = await run(["adr", "review", "--adr", "ADR-0002", "--decision", "rejected", "--by", "Giovanni Fiore", "--quote", "respingo ADR-0002", "--cwd", dir]);
  assert.equal(rejected.code, 0);
  assert.match(rejected.out, /Revert the change/);
  const rejectedContent = await readFile(path.join(dir, second.created), "utf8");
  assert.match(rejectedContent, /^status: "Rejected"$/m);
  assert.match(rejectedContent, /^\*\*Rejected\*\* in review/m);

  const normal = JSON.parse((await run(["adr", "new", "--title", "Bigger change", "--json", "--cwd", dir])).out);
  assert.equal(normal.status, "Proposed");
  const plain = await run(["adr", "review", "--adr", "ADR-0003", "--decision", "approved", "--by", "Giovanni Fiore", "--quote", "ok", "--cwd", dir]);
  assert.match(plain.err, /not a low-risk tier ADR/);
});

test("the shipped gate.json enables a valid policy with the PRD-0007 thresholds", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--runtime", "none", "--cwd", dir]);
  const gate = await readGateConfig(dir);
  assert.deepEqual(gate.problems, []);
  assert.equal(gate.lowRisk.maxFiles, 5);
  assert.equal(gate.lowRisk.maxLines, 200);
});

test("line counts accept a total or numstat-derived counts per path", () => {
  assert.deepEqual(parseLineCounts("42"), { total: 42, perPath: null });
  assert.deepEqual([...parseLineCounts("3:src/a.js,1:img/logo.png,2:src/a.js").perPath], [["src/a.js", 5], ["img/logo.png", 1]]);
  assert.match(parseLineCounts("3:src/a.js,oops").error, /invalid --lines entry "oops"/);
  assert.equal(parseLineCounts(null), null);
});

test("projections pass line counts, and only CI requires reviews for the default branch", async () => {
  const options = { assetsRoot: path.join(pluginRoot, "assets"), skillsRoot: path.join(pluginRoot, "skills"), runtimes: [] };
  const hook = (await buildPlan({ ...options, enforce: "hooks" })).files.find((file) => file.path === ".agents/hooks/pre-push").content;
  const ci = (await buildPlan({ ...options, enforce: "ci" })).files.find((file) => file.path === ".github/workflows/governance.yml").content;
  for (const script of [hook, ci]) {
    assert.match(script, /git diff --numstat --no-renames/);
    assert.match(script, /git diff --name-only --no-renames/);
  }
  assert.match(hook, /verify --changed "\$changed" --lines "\$lines"/);
  assert.doesNotMatch(hook, /--require-reviews/, "local pushes never stop for reviews");
  assert.match(ci, /set -- verify --changed "\$CHANGED" --lines "\$LINES"/);
  assert.match(ci, /if \[ "\$TARGET" = "\$DEFAULT_BRANCH" \]; then set -- "\$@" --require-reviews; fi/);
  assert.match(ci, /BASE_REF: \$\{\{ github\.base_ref \}\}/);
});

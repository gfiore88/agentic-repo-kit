import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { applyPlan } from "../plugins/agentic-repo/scripts/lib/writer.mjs";
import { createGovernedArtifact } from "../plugins/agentic-repo/scripts/lib/artifacts.mjs";
import { lintKnowledge } from "../plugins/agentic-repo/scripts/lib/knowledge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "../plugins/agentic-repo");

async function initializedRepository() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-workflow-"));
  const plan = await buildPlan({
    assetsRoot: path.join(pluginRoot, "assets"),
    skillsRoot: path.join(pluginRoot, "skills"),
    runtimes: [],
  });
  await applyPlan(cwd, plan);
  return cwd;
}

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(target));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(target);
  }
  return files;
}

test("fresh knowledge base passes deterministic lint", async () => {
  const cwd = await initializedRepository();
  assert.deepEqual(await lintKnowledge(cwd), {
    ok: true,
    checkedPages: 4,
    brokenLinks: [],
    uncataloguedPages: [],
    uncitedFacts: [],
    orphanPages: [],
    uncoveredSources: [],
    malformedLogEntries: [],
    frontmatterIssues: [],
  });
});

test("knowledge lint catches broken links, uncatalogued pages, and uncited facts", async () => {
  const cwd = await initializedRepository();
  await writeFile(path.join(cwd, "docs/wiki/orphan.md"), "# Orphan\n\n- `[FACT]` Unsupported.\n- [Missing](missing.md)\n", "utf8");
  const result = await lintKnowledge(cwd);
  assert.equal(result.ok, false);
  assert.equal(result.brokenLinks.length, 1);
  assert.deepEqual(result.uncataloguedPages, ["docs/wiki/orphan.md"]);
  assert.deepEqual(result.uncitedFacts, [{ file: "docs/wiki/orphan.md", line: 3 }]);
});

test("knowledge lint accepts page-level source provenance header", async () => {
  const cwd = await initializedRepository();
  await writeFile(
    path.join(cwd, "docs/wiki/client-spec.md"),
    "---\ntype: source\ntitle: Client Specification\ncreated: 2026-09-04\nupdated: 2026-09-04\nsources: [\"docs/raw/client.md\"]\n---\n\n# Client Specification\n\n**Source**: `docs/raw/client.md`\n\n- `[FACT]` Valid fact inheriting page source.\n- `[FACT]` Another valid fact.\n",
    "utf8"
  );
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  const indexContent = await readFile(indexFile, "utf8");
  await writeFile(indexFile, `${indexContent}\n- [Client Spec](client-spec.md)\n`, "utf8");

  const result = await lintKnowledge(cwd);
  assert.equal(result.ok, true);
  assert.equal(result.uncitedFacts.length, 0);
});

test("knowledge lint flags orphan pages, uncovered raw sources, and malformed log entries", async () => {
  const cwd = await initializedRepository();
  // Orphan: catalogued by path text in index but linked from nowhere.
  await writeFile(path.join(cwd, "docs/wiki/loner.md"), "# Loner\n\nNo inbound links.\n", "utf8");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  const indexContent = await readFile(indexFile, "utf8");
  await writeFile(indexFile, `${indexContent}\n<!-- loner.md -->\n`, "utf8");
  // Uncovered raw source: no sources/ summary page.
  await mkdir(path.join(cwd, "docs/raw"), { recursive: true });
  await writeFile(path.join(cwd, "docs/raw/2026-09-04-note.md"), "raw note\n", "utf8");
  // Malformed log entry.
  const logFile = path.join(cwd, "docs/wiki/log.md");
  const logContent = await readFile(logFile, "utf8");
  await writeFile(logFile, `${logContent}\n## Not a valid entry\n`, "utf8");

  const result = await lintKnowledge(cwd);
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncataloguedPages, []);
  assert.deepEqual(result.orphanPages, ["docs/wiki/loner.md"]);
  assert.deepEqual(result.uncoveredSources, ["docs/raw/2026-09-04-note.md"]);
  assert.equal(result.malformedLogEntries.length, 1);
  assert.equal(result.malformedLogEntries[0].file, "docs/wiki/log.md");
});

test("knowledge lint accepts a covered raw source with a sources/ summary", async () => {
  const cwd = await initializedRepository();
  await mkdir(path.join(cwd, "docs/raw"), { recursive: true });
  await writeFile(path.join(cwd, "docs/raw/2026-09-04-note.md"), "raw note\n", "utf8");
  await mkdir(path.join(cwd, "docs/wiki/sources"), { recursive: true });
  await writeFile(
    path.join(cwd, "docs/wiki/sources/2026-09-04-note.md"),
    "---\ntype: source\ntitle: Note summary\ncreated: 2026-09-04\nupdated: 2026-09-04\nsources: [\"docs/raw/2026-09-04-note.md\"]\n---\n\n# Note summary\n\n**Source**: `docs/raw/2026-09-04-note.md`\n\n- `[FACT]` Summary point.\n",
    "utf8"
  );
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  const indexContent = await readFile(indexFile, "utf8");
  await writeFile(indexFile, `${indexContent}\n- [Note summary](sources/2026-09-04-note.md)\n`, "utf8");

  const result = await lintKnowledge(cwd);
  assert.deepEqual(result.uncoveredSources, []);
  assert.deepEqual(result.orphanPages, []);
  assert.equal(result.ok, true);
});

test("knowledge lint validates page frontmatter", async () => {
  const cwd = await initializedRepository();
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(path.join(cwd, "docs/wiki/no-front.md"), "# No Front\n\nBody only.\n", "utf8");
  await writeFile(
    path.join(cwd, "docs/wiki/bad-front.md"),
    "---\ntype: bogus\ntitle: Bad\ncreated: 2026-09-04\nupdated: yesterday\n---\n\n# Bad\n\n- `[FACT]` Unsourced claim.\n",
    "utf8"
  );
  const indexContent = await readFile(indexFile, "utf8");
  await writeFile(indexFile, `${indexContent}\n- [No Front](no-front.md)\n- [Bad Front](bad-front.md)\n`, "utf8");

  const result = await lintKnowledge(cwd);
  assert.equal(result.ok, false);
  const issuesFor = (file) => result.frontmatterIssues.filter((item) => item.file === file).map((item) => item.issue);
  assert.deepEqual(issuesFor("docs/wiki/no-front.md"), ["missing frontmatter"]);
  const bad = issuesFor("docs/wiki/bad-front.md");
  assert.ok(bad.includes("invalid frontmatter type: bogus"));
  assert.ok(bad.includes("invalid updated date: yesterday"));
  assert.ok(bad.includes("fact-bearing page missing non-empty sources"));
});

test("knowledge lint accepts conformant frontmatter with sources provenance", async () => {
  const cwd = await initializedRepository();
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(
    path.join(cwd, "docs/wiki/typed.md"),
    "---\ntype: concept\ntitle: Typed\ncreated: 2026-09-04\nupdated: 2026-09-04\nsources: [\"docs/raw/typed.md\"]\n---\n\n# Typed\n\n- `[FACT]` Sourced via frontmatter.\n",
    "utf8"
  );
  const indexContent = await readFile(indexFile, "utf8");
  await writeFile(indexFile, `${indexContent}\n- [Typed](typed.md)\n`, "utf8");

  const result = await lintKnowledge(cwd);
  assert.deepEqual(result.frontmatterIssues, []);
  assert.equal(result.uncitedFacts.length, 0);
  assert.equal(result.ok, true);
});

test("ADR, PRD, and annealing commands create gated artifacts", async () => {
  const cwd = await initializedRepository();
  const adr = await createGovernedArtifact(cwd, "adr", { title: "Persistence boundary" });
  const prd = await createGovernedArtifact(cwd, "prd", { title: "Repository bootstrap" });
  const target = path.join(cwd, "AGENTS.md");
  const before = await readFile(target, "utf8");
  const proposal = await createGovernedArtifact(cwd, "anneal", {
    title: "Read decisions first",
    target: "AGENTS.md",
  });
  assert.match(await readFile(adr, "utf8"), /status: "Proposed"/);
  assert.match(await readFile(prd, "utf8"), /\*\*Status\*\*: Draft/);
  assert.match(await readFile(proposal, "utf8"), /\*\*Status\*\*: PENDING/);
  assert.equal(await readFile(target, "utf8"), before);
});

test("full generated repository has no broken relative Markdown links", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-links-"));
  const plan = await buildPlan({
    assetsRoot: path.join(pluginRoot, "assets"),
    skillsRoot: path.join(pluginRoot, "skills"),
    runtimes: ["codex", "claude-code", "github-copilot", "antigravity", "gemini-cli", "cursor", "opencode", "kiro"],
  });
  await applyPlan(cwd, plan);
  const broken = [];
  for (const file of await collectMarkdown(cwd)) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].split("#")[0];
      if (!href || /^(?:https?:|mailto:|file:|\$\{)/.test(href)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(href));
      try { await access(target); } catch { broken.push([path.relative(cwd, file), match[1]]); }
    }
  }
  assert.deepEqual(broken, []);
});

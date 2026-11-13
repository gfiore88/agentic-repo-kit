import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { applyPlan, isUserOwnedPath } from "../plugins/agentic-repo/scripts/lib/writer.mjs";
import { createGovernedArtifact } from "../plugins/agentic-repo/scripts/lib/artifacts.mjs";
import { lintKnowledge, maskFencedCode, scalarValue } from "../plugins/agentic-repo/scripts/lib/knowledge.mjs";

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

test("knowledge lint ignores links and facts inside fenced code blocks", async () => {
  const cwd = await initializedRepository();
  const page = path.join(cwd, "docs/wiki/conventions.md");
  const lines = [
    "---",
    "type: concept",
    "title: Wiki conventions",
    "created: 2026-11-13",
    "updated: 2026-11-13",
    "---",
    "",
    "# Wiki conventions",
    "",
    "```markdown",
    "- [FACT] The API uses OAuth. (see the auth page)",
    "- See [Auth flow](concepts/auth-flow.md).",
    "```",
    "",
    "~~~~",
    "~~~",
    "- [Still code](missing.md)",
    "~~~~",
    "",
  ];
  await writeFile(page, lines.join("\n"), "utf8");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(indexFile, `${await readFile(indexFile, "utf8")}\n- [Conventions](conventions.md)\n`, "utf8");
  assert.equal((await lintKnowledge(cwd)).ok, true, "fenced examples are not wiki content");

  await writeFile(page, [...lines, "- `[FACT]` Visible claim without a citation.", ""].join("\n"), "utf8");
  const result = await lintKnowledge(cwd);
  assert.deepEqual(result.brokenLinks, []);
  assert.deepEqual(result.uncitedFacts, [{ file: "docs/wiki/conventions.md", line: 20 }]);
  assert.deepEqual(result.frontmatterIssues, [{ file: "docs/wiki/conventions.md", issue: "fact-bearing page missing non-empty sources" }]);
});

test("fenced code masking keeps line numbers and follows fence rules", () => {
  assert.equal(maskFencedCode("a\n```js\n[x](y.md)\n```\nb"), "a\n\n\n\nb");
  assert.equal(maskFencedCode("a\n``` not `a fence`\n[x](y.md)"), "a\n``` not `a fence`\n[x](y.md)");
  assert.equal(maskFencedCode("```\n``` trailing text does not close\n```\nafter"), "\n\n\nafter");
  assert.equal(maskFencedCode("```\r\n[x](y.md)\r\n```\r\nafter"), "\n\n\nafter");
  assert.equal(maskFencedCode("a\n   ```\n- [FACT] unclosed fences run to the end"), "a\n\n");
});

test("knowledge lint accepts well-formed log entries in CRLF checkouts", async () => {
  const cwd = await initializedRepository();
  const logFile = path.join(cwd, "docs/wiki/log.md");
  const crlf = (await readFile(logFile, "utf8")).replace(/\n/g, "\r\n");
  const content = `${crlf}\r\n## [2026-11-13] implementation | CRLF entry\r\n\r\n## Not a valid entry\r\n`;
  await writeFile(logFile, content, "utf8");
  const result = await lintKnowledge(cwd);
  assert.equal(result.malformedLogEntries.length, 1);
  assert.equal(result.malformedLogEntries[0].line, content.split("\r\n").indexOf("## Not a valid entry") + 1);
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

for (const profile of ["full", "core"]) test(`${profile} generated repository has no broken relative Markdown links`, async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-links-"));
  const plan = await buildPlan({
    assetsRoot: path.join(pluginRoot, "assets"),
    skillsRoot: path.join(pluginRoot, "skills"),
    runtimes: ["codex", "claude-code", "github-copilot", "antigravity", "gemini-cli", "cursor", "opencode", "kiro"],
    profile,
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
  if (profile === "core") {
    // Canonical kernel files must not point at skills the core profile omits.
    const installed = new Set(plan.files.filter((file) => file.path.startsWith(".agents/skills/")).map((file) => file.path.split("/")[2]));
    const dangling = plan.files
      .filter((file) => !file.path.startsWith(".agents/skills/") && !file.path.startsWith(".agents/upstream/"))
      .flatMap((file) => [...file.content.matchAll(/\.agents\/skills\/([a-z0-9-]+)/g)].map((match) => [file.path, match[1]]))
      .filter(([, skill]) => !installed.has(skill));
    assert.deepEqual(dangling, []);
  }
});

test("a wiki page created from the shipped template passes lint once filled in", async () => {
  const cwd = await initializedRepository();
  const template = await readFile(path.join(cwd, "docs/templates/wiki-page-template.md"), "utf8");
  const page = template
    .replaceAll("[Topic]", "Auth flow")
    .replaceAll("YYYY-MM-DD", "2026-11-13")
    .replace("sources: []", 'sources: ["docs/raw/auth.md"]');
  await mkdir(path.join(cwd, "docs/wiki/concepts"), { recursive: true });
  await writeFile(path.join(cwd, "docs/wiki/concepts/auth-flow.md"), page, "utf8");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(indexFile, `${await readFile(indexFile, "utf8")}\n- [Auth flow](concepts/auth-flow.md)\n`, "utf8");
  const result = await lintKnowledge(cwd);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("generated instructions pin the generating kit version", async () => {
  const options = {
    assetsRoot: path.join(pluginRoot, "assets"),
    skillsRoot: path.join(pluginRoot, "skills"),
    runtimes: ["codex", "claude-code", "github-copilot", "antigravity", "gemini-cli", "cursor", "opencode", "kiro"],
    enforce: "hooks",
  };
  const plan = await buildPlan({ ...options, kitVersion: "9.9.9" });
  const projected = plan.files.filter((file) => !file.path.startsWith(".agents/upstream/"));
  const invocations = projected.flatMap((file) =>
    [...file.content.matchAll(/npx (?:--yes )?agentic-repo-kit\S*/g)].map((match) => [file.path, match[0]]));
  assert.ok(invocations.length >= 10, "kernel instructions invoke the CLI");
  assert.deepEqual(invocations.filter(([, text]) => !text.startsWith("npx --yes agentic-repo-kit@9.9.9")), []);
  assert.deepEqual(invocations.filter(([file]) => isUserOwnedPath(file)), [], "preserved files would keep a stale pin");
  const bare = /(?<![\w@/-])agentic-repo (?:init|update|upgrade|doctor|status|verify|knowledge|adr|prd|anneal|exclude)\b/;
  assert.deepEqual(projected.filter((file) => bare.test(file.content)).map((file) => file.path), []);
  assert.match(plan.files.find((file) => file.path === ".agents/hooks/pre-push").content, /verifier="agentic-repo-kit@9\.9\.9"/);

  const source = await readFile(path.join(pluginRoot, "skills/curate-project-knowledge/SKILL.md"), "utf8");
  assert.match(source, /`npx agentic-repo-kit knowledge lint`/, "sources stay version-free for the plugin");

  const unknown = await buildPlan({ ...options, kitVersion: null });
  assert.match(unknown.files.find((file) => file.path === "AGENTS.md").content, /`npx --yes agentic-repo-kit status`/);
});

test("the ADR template keeps the official ADR skill's structure", async () => {
  const skill = await readFile(path.join(pluginRoot, "skills/create-architectural-decision-record/SKILL.md"), "utf8");
  const official = skill.match(/```md\n([\s\S]*?)\n```/)[1];
  const template = await readFile(path.join(pluginRoot, "assets/blueprints/base/docs/templates/adr-template.md"), "utf8");
  const keys = (content) => content.match(/^---\n([\s\S]*?)\n---/)[1].split("\n").map((line) => line.split(":")[0]);
  const sections = (content) => content.split("\n").filter((line) => /^## /.test(line));
  assert.deepEqual(keys(template), keys(official));
  assert.deepEqual(sections(template), sections(official));
});

test("annealing classes map consistently across the closure block, process, and prompt", async () => {
  const blueprint = path.join(pluginRoot, "assets/blueprints/base");
  const contract = await readFile(path.join(blueprint, "AGENTS.md"), "utf8");
  const process = await readFile(path.join(pluginRoot, "skills/anneal-agent-directives/references/annealing-process.md"), "utf8");
  const prompt = await readFile(path.join(blueprint, ".agents/prompts/analyze-agent-run.prompt.md"), "utf8");
  const closure = contract.match(/\*\*Classification\*\*: (.+)/)[1].match(/`[^`]+`/g);
  assert.deepEqual(closure, ["`None`", "`Agent Method`", "`Product/Domain Scope`", "`Tooling Gap`"]);
  for (const name of closure) {
    assert.match(process, new RegExp(`^\\| ${name.replace("/", "\\/")} \\|`, "m"), `${name} missing from the mapping table`);
    assert.ok(prompt.includes(name), `${name} missing from the analysis prompt`);
  }
  for (const stage1 of ["Domain Fact", "Architectural Decision", "Agent Method", "Capability", "Product Defect", "One-Off"]) {
    assert.ok(process.includes(`\`${stage1}\``) && prompt.includes(`\`${stage1}\``), `${stage1} must be named in both files`);
  }
  assert.ok(!`${process}${prompt}`.includes("One-Off Incident"));
});

test("the curation skill's frontmatter example passes lint when copied verbatim", async () => {
  const cwd = await initializedRepository();
  const skill = await readFile(path.join(pluginRoot, "skills/curate-project-knowledge/SKILL.md"), "utf8");
  const example = skill.match(/```yaml\n([\s\S]*?)\n```/)[1];
  await writeFile(path.join(cwd, "docs/wiki/example.md"), `${example}\n\n# Example\n\n- \`[FACT]\` Sourced claim.\n`, "utf8");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(indexFile, `${await readFile(indexFile, "utf8")}\n- [Example](example.md)\n`, "utf8");
  const result = await lintKnowledge(cwd);
  assert.deepEqual(result.frontmatterIssues, []);
  assert.equal(result.ok, true);
});

test("frontmatter scalars follow YAML comment rules", () => {
  assert.equal(scalarValue("concept   # note"), "concept");
  assert.equal(scalarValue('"Topic # one"  # note'), "Topic # one");
  assert.equal(scalarValue("'2026-11-13'"), "2026-11-13");
  assert.equal(scalarValue("a#b"), "a#b");
  assert.equal(scalarValue("Unquoted # trailing"), "Unquoted");
  assert.equal(scalarValue("# only a comment"), "");
});

test("knowledge lint reads frontmatter values with trailing YAML comments", async () => {
  const cwd = await initializedRepository();
  const page = (name, frontmatter) =>
    writeFile(path.join(cwd, `docs/wiki/${name}.md`), `---\n${frontmatter}\n---\n\n# ${name}\n\n- \`[FACT]\` Claim.\n`, "utf8");
  await page("commented", [
    "type: concept   # source | entity | concept",
    'title: "Topic # one"  # the quoted hash stays',
    "created: 2026-11-13 # first draft",
    "updated: 2026-11-13",
    "sources: # listed below",
    "  - docs/raw/a.md",
  ].join("\n"));
  await page("empty-sources", "type: concept\ntitle: Empty\ncreated: 2026-11-13\nupdated: 2026-11-13\nsources: # none yet");
  const indexFile = path.join(cwd, "docs/wiki/index.md");
  await writeFile(indexFile, `${await readFile(indexFile, "utf8")}\n- [Commented](commented.md)\n- [Empty](empty-sources.md)\n`, "utf8");
  const result = await lintKnowledge(cwd);
  assert.deepEqual(result.frontmatterIssues, [{ file: "docs/wiki/empty-sources.md", issue: "fact-bearing page missing non-empty sources" }]);
});

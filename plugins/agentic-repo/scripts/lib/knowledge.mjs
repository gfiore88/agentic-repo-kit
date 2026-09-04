import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function markdownFiles(root) {
  if (!await exists(root)) return [];
  const result = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) result.push(absolute);
    }
  }
  await visit(root);
  return result;
}

function relative(cwd, target) {
  return path.relative(cwd, target).split(path.sep).join("/");
}

const FRONTMATTER_TYPES = new Set(["index", "overview", "log", "questions", "source", "entity", "concept"]);

function unquote(value) {
  return value.replace(/^['"]|['"]$/g, "").trim();
}

function frontmatterSourcesNonEmpty(body) {
  const inline = body.match(/^sources:\s*\[([^\]]*)\]/m);
  if (inline) return inline[1].trim().length > 0;
  const block = body.match(/^sources:\s*\n((?:[ \t]*-[ \t]+.*\n?)+)/m);
  if (block) return /-[ \t]+\S+/.test(block[1]);
  const scalar = body.match(/^sources:[ \t]*(\S.*)$/m);
  return Boolean(scalar);
}

// Validates the mandatory per-page YAML frontmatter (ADR-0012) without a YAML dependency.
function validateFrontmatter(file, content, hasFact) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [{ file, issue: "missing frontmatter" }];
  const body = match[1];
  const field = (name) => {
    const value = body.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1];
    return value === undefined ? undefined : unquote(value);
  };
  const issues = [];
  const type = field("type");
  if (!type) issues.push({ file, issue: "missing frontmatter key: type" });
  else if (!FRONTMATTER_TYPES.has(type)) issues.push({ file, issue: `invalid frontmatter type: ${type}` });
  if (!field("title")) issues.push({ file, issue: "missing frontmatter key: title" });
  for (const dateKey of ["created", "updated"]) {
    const value = field(dateKey);
    if (!value) issues.push({ file, issue: `missing frontmatter key: ${dateKey}` });
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) issues.push({ file, issue: `invalid ${dateKey} date: ${value}` });
  }
  if (hasFact && !frontmatterSourcesNonEmpty(body)) issues.push({ file, issue: "fact-bearing page missing non-empty sources" });
  return issues;
}

export async function lintKnowledge(cwd) {
  const wikiRoot = path.join(cwd, "docs", "wiki");
  const indexPath = path.join(wikiRoot, "index.md");
  if (!await exists(indexPath)) throw new Error("Missing docs/wiki/index.md; run agentic-repo init first");
  const files = await markdownFiles(wikiRoot);
  const indexContent = await readFile(indexPath, "utf8");
  const brokenLinks = [];
  const uncataloguedPages = [];
  const uncitedFacts = [];
  const frontmatterIssues = [];
  const linkedTargets = new Set();
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(linkPattern)) {
      const href = match[1].split("#")[0];
      if (!href || /^(?:https?:|mailto:)/.test(href)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(href));
      linkedTargets.add(target);
      if (!await exists(target)) brokenLinks.push({ file: relative(cwd, file), href: match[1] });
    }
    if (file !== indexPath) {
      const relFromIndex = path.relative(wikiRoot, file).split(path.sep).join("/");
      if (!indexContent.includes(relFromIndex)) uncataloguedPages.push(relative(cwd, file));
    }
    const lines = content.split("\n");
    const headerSlice = lines.slice(0, 20).join("\n");
    const hasPageProvenance = /(^|\n)\s*(?:\*\*)?source(?:s)?(?:\*\*)?:\s*(?:`[^`]+`|\[[^\]]+\]\([^)]+\)|docs\/raw\/|https?:|\S+)/i.test(headerSlice);

    lines.forEach((line, index) => {
      if (line.includes("[FACT]")) {
        const hasLineCitation = /(source|sources|provenance|https?:|docs\/raw\/)/i.test(line);
        if (!hasLineCitation && !hasPageProvenance) {
          uncitedFacts.push({ file: relative(cwd, file), line: index + 1 });
        }
      }
    });
    frontmatterIssues.push(...validateFrontmatter(relative(cwd, file), content, content.includes("[FACT]")));
  }

  const orphanPages = files
    .filter((file) => file !== indexPath && !linkedTargets.has(file))
    .map((file) => relative(cwd, file));
  const uncoveredSources = await findUncoveredSources(cwd, wikiRoot);
  const malformedLogEntries = await findMalformedLogEntries(cwd, wikiRoot);

  return {
    ok:
      brokenLinks.length === 0 &&
      uncataloguedPages.length === 0 &&
      uncitedFacts.length === 0 &&
      orphanPages.length === 0 &&
      uncoveredSources.length === 0 &&
      malformedLogEntries.length === 0 &&
      frontmatterIssues.length === 0,
    checkedPages: files.length,
    brokenLinks,
    uncataloguedPages,
    uncitedFacts,
    orphanPages,
    uncoveredSources,
    malformedLogEntries,
    frontmatterIssues,
  };
}

// Flags human-owned raw sources that lack an agent-authored summary under wiki/sources/.
async function findUncoveredSources(cwd, wikiRoot) {
  const rawRoot = path.join(cwd, "docs", "raw");
  if (!await exists(rawRoot)) return [];
  const sourcesRoot = path.join(wikiRoot, "sources");
  const uncovered = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(absolute); continue; }
      if (!entry.isFile()) continue;
      if (entry.name.toLowerCase() === "readme.md") continue;
      const slug = entry.name.replace(/\.[^.]+$/, "");
      if (!await exists(path.join(sourcesRoot, `${slug}.md`))) uncovered.push(relative(cwd, absolute));
    }
  }
  await visit(rawRoot);
  return uncovered;
}

// Flags log headings that do not match `## [YYYY-MM-DD] <tag> | <description>`.
async function findMalformedLogEntries(cwd, wikiRoot) {
  const logPath = path.join(wikiRoot, "log.md");
  if (!await exists(logPath)) return [];
  const content = await readFile(logPath, "utf8");
  const entryPattern = /^##\s+\[[^\]]+\]\s+\S+\s+\|\s+.+$/;
  const malformed = [];
  content.split("\n").forEach((line, index) => {
    if (/^##\s/.test(line) && !entryPattern.test(line)) {
      malformed.push({ file: relative(cwd, logPath), line: index + 1 });
    }
  });
  return malformed;
}


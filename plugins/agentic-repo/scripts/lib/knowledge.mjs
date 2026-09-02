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

export async function lintKnowledge(cwd) {
  const wikiRoot = path.join(cwd, "docs", "wiki");
  const indexPath = path.join(wikiRoot, "index.md");
  if (!await exists(indexPath)) throw new Error("Missing docs/wiki/index.md; run agentic-repo init first");
  const files = await markdownFiles(wikiRoot);
  const indexContent = await readFile(indexPath, "utf8");
  const brokenLinks = [];
  const uncataloguedPages = [];
  const uncitedFacts = [];
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(linkPattern)) {
      const href = match[1].split("#")[0];
      if (!href || /^(?:https?:|mailto:)/.test(href)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(href));
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
  }

  return {
    ok: brokenLinks.length === 0 && uncataloguedPages.length === 0 && uncitedFacts.length === 0,
    checkedPages: files.length,
    brokenLinks,
    uncataloguedPages,
    uncitedFacts,
  };
}

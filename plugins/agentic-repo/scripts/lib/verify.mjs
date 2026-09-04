import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { lintKnowledge } from "./knowledge.mjs";

const ADR_STATUSES = new Set(["Proposed", "Accepted", "Rejected", "Superseded", "Deprecated"]);

// Paths that are governance or documentation and therefore do not, on their own,
// require an Accepted ADR to change.
const NON_SOURCE_PREFIXES = ["docs/", ".agents/"];
const NON_SOURCE_FILES = new Set([
  "README.md", "CHANGELOG.md", "LICENSE", "THIRD_PARTY_NOTICES.md",
  "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "AGENTS.md",
  "scaffold.yaml", "scaffold.lock", ".gitignore", ".npmignore", "package-lock.json",
]);

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/").replace(/^\.\//, "");
}

function isSourceChange(relativePath) {
  const normalized = normalize(relativePath);
  if (!normalized || NON_SOURCE_FILES.has(normalized)) return false;
  return !NON_SOURCE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isAdrPath(relativePath) {
  return /^docs\/adr\/adr-\d{4}-.+\.md$/.test(normalize(relativePath));
}

function adrStatus(content) {
  const frontMatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatter) return null;
  const match = frontMatter[1].match(/^status:\s*["']?([A-Za-z]+)["']?\s*$/m);
  return match ? match[1] : null;
}

// Deterministic governance check. Pure: no network and no subprocess. The set of
// changed files is supplied by the caller (a CI wrapper computes the git diff),
// keeping this engine portable and testable.
export async function verifyGovernance(cwd, { changedFiles = null } = {}) {
  const violations = [];

  try {
    const knowledge = await lintKnowledge(cwd);
    for (const link of knowledge.brokenLinks) violations.push({ kind: "knowledge", detail: `broken link in ${link.file} -> ${link.href}` });
    for (const page of knowledge.uncataloguedPages) violations.push({ kind: "knowledge", detail: `uncatalogued page ${page}` });
    for (const fact of knowledge.uncitedFacts) violations.push({ kind: "knowledge", detail: `uncited fact ${fact.file}:${fact.line}` });
  } catch {
    // No knowledge base to lint is not a governance violation on its own.
  }

  const adrDirectory = path.join(cwd, "docs", "adr");
  let adrNames = [];
  try { adrNames = await readdir(adrDirectory); } catch {}
  for (const name of adrNames) {
    if (!/^adr-\d{4}-.+\.md$/.test(name)) continue;
    const status = adrStatus(await readFile(path.join(adrDirectory, name), "utf8"));
    if (!status || !ADR_STATUSES.has(status)) {
      violations.push({ kind: "adr", detail: `docs/adr/${name} has a missing or invalid status` });
    }
  }

  const adrGateApplied = Array.isArray(changedFiles);
  if (adrGateApplied) {
    const changed = changedFiles.map(normalize).filter(Boolean);
    const sourceChanges = changed.filter(isSourceChange);
    if (sourceChanges.length > 0) {
      let acceptedInChangeSet = false;
      for (const relativePath of changed.filter(isAdrPath)) {
        try {
          if (adrStatus(await readFile(path.join(cwd, relativePath), "utf8")) === "Accepted") {
            acceptedInChangeSet = true;
            break;
          }
        } catch {}
      }
      if (!acceptedInChangeSet) {
        violations.push({
          kind: "adr-gate",
          detail: `source changes without an Accepted ADR in the change set: ${sourceChanges.join(", ")}`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations, adrGateApplied };
}

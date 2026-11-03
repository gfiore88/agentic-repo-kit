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

function isSourceChange(relativePath, managedPaths) {
  const normalized = normalize(relativePath);
  if (!normalized || NON_SOURCE_FILES.has(normalized) || managedPaths.has(normalized)) return false;
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

// Files written by the kit itself (adapters, hooks, generated workflows) are
// governance infrastructure, so kernel upgrades never trip the ADR gate.
async function readManagedPaths(cwd) {
  try {
    const lock = JSON.parse(await readFile(path.join(cwd, "scaffold.lock"), "utf8"));
    return new Set((lock.managedFiles ?? []).map((entry) => entry?.path).filter((entry) => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

export const GATE_CONFIG_PATH = "docs/adr/gate.json";

// Minimal glob matcher: `**` spans directories, `*` and `?` stay within one path
// segment, and a pattern without `/` matches the file name at any depth.
export function matchesGlob(relativePath, pattern) {
  const target = pattern.includes("/") ? relativePath : relativePath.split("/").pop();
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      const slash = pattern[index + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      index += slash ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`).test(target);
}

// Human-owned gate configuration (preserved by `update`):
//   exempt:  globs that never need an ADR (for example lockfiles or editor config)
//   routine: globs that may ship under the lightweight routine tier, which requires
//            an explicit routine declaration and an entry in docs/wiki/log.md
async function readGateConfig(cwd, violations) {
  let raw;
  try { raw = await readFile(path.join(cwd, GATE_CONFIG_PATH), "utf8"); } catch {
    return { exempt: [], routine: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    const list = (key) => Array.isArray(parsed?.[key]) ? parsed[key].filter((entry) => typeof entry === "string" && entry.trim()) : [];
    return { exempt: list("exempt"), routine: list("routine") };
  } catch (error) {
    violations.push({ kind: "adr-config", detail: `${GATE_CONFIG_PATH} is not valid JSON: ${error.message}` });
    return { exempt: [], routine: [] };
  }
}

function parseAdrReference(reference) {
  const digits = String(reference).trim().match(/^(?:adr-?)?(\d{1,4})$/i)?.[1];
  return digits ? digits.padStart(4, "0") : null;
}

// Deterministic governance check. Pure: no network and no subprocess. The set of
// changed files is supplied by the caller (a CI wrapper computes the git diff),
// keeping this engine portable and testable.
export async function verifyGovernance(cwd, { changedFiles = null, adrReferences = [], routine = false } = {}) {
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

  // Explicit references (for example `ADR-0013` in commit messages) let follow-up
  // work cite the Accepted ADR that governs it instead of duplicating decisions.
  const references = [];
  for (const raw of adrReferences) {
    const number = parseAdrReference(raw);
    if (!number) {
      references.push({ reference: String(raw), status: null, detail: "unrecognized ADR reference" });
      continue;
    }
    const name = adrNames.find((candidate) => candidate.startsWith(`adr-${number}-`) && candidate.endsWith(".md"));
    const status = name ? adrStatus(await readFile(path.join(adrDirectory, name), "utf8")) : null;
    references.push({ reference: `ADR-${number}`, status, detail: name ? `docs/adr/${name}` : "not found" });
  }
  const acceptedReference = references.some((reference) => reference.status === "Accepted");

  const adrGateApplied = Array.isArray(changedFiles);
  if (adrGateApplied) {
    const managedPaths = await readManagedPaths(cwd);
    const gate = await readGateConfig(cwd, violations);
    const changed = changedFiles.map(normalize).filter(Boolean);
    const sourceChanges = changed
      .filter((entry) => isSourceChange(entry, managedPaths))
      .filter((entry) => !gate.exempt.some((pattern) => matchesGlob(entry, pattern)));
    if (sourceChanges.length > 0) {
      let acceptedInChangeSet = acceptedReference;
      for (const relativePath of changed.filter(isAdrPath)) {
        try {
          if (adrStatus(await readFile(path.join(cwd, relativePath), "utf8")) === "Accepted") {
            acceptedInChangeSet = true;
            break;
          }
        } catch {}
      }
      // The routine tier is a fallback: an Accepted ADR always satisfies the gate.
      if (!acceptedInChangeSet && routine) {
        const outsideScope = sourceChanges.filter((entry) => !gate.routine.some((pattern) => matchesGlob(entry, pattern)));
        if (outsideScope.length > 0) {
          violations.push({ kind: "adr-gate", detail: `routine tier declared but these changes are outside the routine globs in ${GATE_CONFIG_PATH}: ${outsideScope.join(", ")}` });
        } else if (!changed.includes("docs/wiki/log.md")) {
          violations.push({ kind: "adr-gate", detail: "routine tier declared but the change set does not record the work in docs/wiki/log.md" });
        }
      } else if (!acceptedInChangeSet) {
        violations.push({
          kind: "adr-gate",
          detail: `source changes without an Accepted ADR in the change set or referenced via --adr: ${sourceChanges.join(", ")}`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations, adrGateApplied, adrReferences: references, routine: adrGateApplied && routine };
}

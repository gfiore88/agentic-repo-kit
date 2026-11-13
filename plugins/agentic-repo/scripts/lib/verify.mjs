import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isUserOwnedPath } from "./catalog.mjs";
import { lintKnowledge, scalarValue } from "./knowledge.mjs";
import { hasConflictMarkers } from "./merge.mjs";

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

// Accepts CRLF checkouts and trailing YAML comments (ADR-0017).
function frontmatterOf(content) {
  return content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? null;
}

function frontmatterValue(block, name) {
  const raw = block?.match(new RegExp(`^${name}:[ \\t]*(.*)$`, "m"))?.[1];
  return raw === undefined ? null : scalarValue(raw) || null;
}

export function adrStatus(content) {
  const value = frontmatterValue(frontmatterOf(content), "status");
  return value && /^[A-Za-z]+$/.test(value) ? value : null;
}

// Low-risk tier fields of an ADR (ADR-0019); every field is null when absent.
export function adrTierRecord(content) {
  const block = frontmatterOf(content);
  return {
    tier: frontmatterValue(block, "tier"),
    review: frontmatterValue(block, "review"),
    reviewedBy: frontmatterValue(block, "reviewed_by"),
    reviewedOn: frontmatterValue(block, "reviewed_on"),
    reviewQuote: frontmatterValue(block, "review_quote"),
  };
}

export const LOW_RISK_TIER = "low-risk";

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
//   lowRisk: the low-risk ADR tier policy (ADR-0019); absent means disabled
export const LOW_RISK_CATEGORIES = Object.freeze(["security", "dependencies", "publicApi", "migrations", "governance"]);

// A malformed policy disables the tier and is reported, so it can never widen it.
function parseLowRisk(value, problems) {
  if (value === undefined || value === null) return null;
  const globs = (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string" && item.trim());
  const issues = [];
  if (typeof value !== "object" || Array.isArray(value)) issues.push("lowRisk must be an object");
  else {
    for (const key of ["maxFiles", "maxLines"]) {
      if (!Number.isInteger(value[key]) || value[key] < 1) issues.push(`lowRisk.${key} must be a positive integer`);
    }
    if (!globs(value.tests)) issues.push("lowRisk.tests must be a list of globs");
    if (!value.exclude || typeof value.exclude !== "object" || Array.isArray(value.exclude)) issues.push("lowRisk.exclude must map each category to globs");
    else for (const category of LOW_RISK_CATEGORIES) {
      if (!globs(value.exclude[category])) issues.push(`lowRisk.exclude.${category} must be a list of globs`);
    }
  }
  if (issues.length > 0) {
    problems.push(`${GATE_CONFIG_PATH}: ${issues.join("; ")}; the low-risk tier is disabled`);
    return null;
  }
  return {
    maxFiles: value.maxFiles,
    maxLines: value.maxLines,
    tests: value.tests,
    exclude: Object.fromEntries(LOW_RISK_CATEGORIES.map((category) => [category, value.exclude[category]])),
  };
}

export async function readGateConfig(cwd) {
  const empty = { exempt: [], routine: [], lowRisk: null, problems: [] };
  let raw;
  try { raw = await readFile(path.join(cwd, GATE_CONFIG_PATH), "utf8"); } catch {
    return empty;
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (error) {
    return { ...empty, problems: [`${GATE_CONFIG_PATH} is not valid JSON: ${error.message}`] };
  }
  const problems = [];
  const list = (key) => Array.isArray(parsed?.[key]) ? parsed[key].filter((entry) => typeof entry === "string" && entry.trim()) : [];
  return { exempt: list("exempt"), routine: list("routine"), lowRisk: parseLowRisk(parsed?.lowRisk, problems), problems };
}

// `--lines` is either a total or a numstat-derived `count:path` list. With a list,
// only source changes count, so documentation never consumes the budget.
export function parseLineCounts(spec) {
  if (spec === null || spec === undefined) return null;
  const text = String(spec).trim();
  if (/^\d+$/.test(text)) return { total: Number(text), perPath: null };
  const perPath = new Map();
  for (const entry of text.split(",").map((item) => item.trim()).filter(Boolean)) {
    const match = entry.match(/^(\d+):(.+)$/);
    if (!match) return { error: `invalid --lines entry "${entry}" (use a total or count:path pairs)` };
    const file = normalize(match[2]);
    perPath.set(file, (perPath.get(file) ?? 0) + Number(match[1]));
  }
  return { total: null, perPath };
}

// Deterministic eligibility for the low-risk tier (ADR-0019). Fails closed: an
// unknown line count or a path without a count makes the change ineligible.
function lowRiskProblems(policy, changed, sourceChanges, lineCounts) {
  if (!policy) return [`the low-risk tier is not enabled in ${GATE_CONFIG_PATH}`];
  const problems = [];
  if (sourceChanges.length > policy.maxFiles) {
    problems.push(`${sourceChanges.length} changed source files exceed maxFiles ${policy.maxFiles}`);
  }
  if (!lineCounts) problems.push("the changed line count is unknown; pass --lines");
  else if (lineCounts.error) problems.push(lineCounts.error);
  else {
    const missing = lineCounts.perPath ? sourceChanges.filter((file) => !lineCounts.perPath.has(file)) : [];
    if (missing.length > 0) problems.push(`no line count for ${missing.join(", ")}`);
    const lines = lineCounts.perPath
      ? sourceChanges.reduce((sum, file) => sum + (lineCounts.perPath.get(file) ?? 0), 0)
      : lineCounts.total;
    if (lines > policy.maxLines) problems.push(`${lines} changed lines exceed maxLines ${policy.maxLines}`);
  }
  const isTest = (file) => policy.tests.some((pattern) => matchesGlob(file, pattern));
  if (sourceChanges.some((file) => !isTest(file)) && !changed.some(isTest)) {
    problems.push("code changes without a changed test file");
  }
  for (const file of changed) {
    for (const category of LOW_RISK_CATEGORIES) {
      if (policy.exclude[category].some((pattern) => matchesGlob(file, pattern))) {
        problems.push(`${file} is in the excluded category ${category}`);
      }
    }
  }
  return problems;
}

function reviewProblem(id, record) {
  if (record.review === "rejected") return `${id} was rejected in review`;
  if (record.review !== "approved") return `${id} is waiting for human review`;
  if (!record.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedOn ?? "") || !record.reviewQuote) {
    return `${id} review evidence is incomplete (reviewed_by, reviewed_on, review_quote)`;
  }
  return null;
}

function parseAdrReference(reference) {
  const digits = String(reference).trim().match(/^(?:adr-?)?(\d{1,4})$/i)?.[1];
  return digits ? digits.padStart(4, "0") : null;
}

// Every failing `knowledge lint` category is a governance violation, so `verify`
// and `knowledge lint` always agree on knowledge health (ADR-0015).
export const KNOWLEDGE_FINDINGS = Object.freeze({
  brokenLinks: (link) => `broken link in ${link.file} -> ${link.href}`,
  uncataloguedPages: (page) => `uncatalogued page ${page}`,
  uncitedFacts: (fact) => `uncited fact ${fact.file}:${fact.line}`,
  orphanPages: (page) => `orphan page ${page}`,
  uncoveredSources: (source) => `uncovered raw source ${source}`,
  malformedLogEntries: (entry) => `malformed log entry ${entry.file}:${entry.line}`,
  frontmatterIssues: (issue) => `frontmatter: ${issue.file} -> ${issue.issue}`,
});

// Parallel branches can each create "the next" ADR number. A duplicate makes an
// `ADR-NNNN` reference ambiguous, so every shared number is reported (ADR-0015).
export function adrNumberCollisions(names) {
  const byNumber = new Map();
  for (const name of [...names].sort()) {
    const number = name.match(/^adr-(\d{4})-.+\.md$/)?.[1];
    if (number) byNumber.set(number, [...(byNumber.get(number) ?? []), `docs/adr/${name}`]);
  }
  return [...byNumber]
    .filter(([, paths]) => paths.length > 1)
    .map(([number, paths]) => ({ id: `ADR-${number}`, paths }));
}

// Deterministic governance check. Pure: no network and no subprocess. The set of
// changed files is supplied by the caller (a CI wrapper computes the git diff),
// keeping this engine portable and testable.
export async function verifyGovernance(cwd, { changedFiles = null, adrReferences = [], routine = false, lines = null, requireReviews = false } = {}) {
  const violations = [];

  let knowledge = null;
  try { knowledge = await lintKnowledge(cwd); } catch {
    // No knowledge base to lint is not a governance violation on its own.
  }
  if (knowledge) {
    for (const [category, describe] of Object.entries(KNOWLEDGE_FINDINGS)) {
      for (const finding of knowledge[category]) violations.push({ kind: "knowledge", detail: describe(finding) });
    }
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
  for (const collision of adrNumberCollisions(adrNames)) {
    violations.push({ kind: "adr", detail: `${collision.id} is used by more than one file (${collision.paths.join(", ")}); renumber the later ADR` });
  }

  // Conflict markers that `update` left in a kernel file must be resolved before
  // the file is committed (ADR-0028).
  for (const managed of await readManagedPaths(cwd)) {
    if (isUserOwnedPath(managed)) continue;
    let content;
    try { content = await readFile(path.join(cwd, managed), "utf8"); } catch { continue; }
    if (hasConflictMarkers(content)) {
      violations.push({ kind: "merge-conflict", detail: `${managed} contains unresolved conflict markers from update` });
    }
  }

  // Explicit references (for example `ADR-0013` in commit messages) let follow-up
  // work cite the Accepted ADR that governs it instead of duplicating decisions.
  const references = [];
  const referencedPaths = [];
  for (const raw of adrReferences) {
    const number = parseAdrReference(raw);
    if (!number) {
      references.push({ reference: String(raw), status: null, detail: "unrecognized ADR reference" });
      continue;
    }
    const matches = adrNames.filter((candidate) => candidate.startsWith(`adr-${number}-`) && candidate.endsWith(".md")).sort();
    if (matches.length > 1) {
      // An ambiguous reference never satisfies the gate, even if one match is Accepted.
      references.push({ reference: `ADR-${number}`, status: null, detail: `ambiguous: ${matches.map((match) => `docs/adr/${match}`).join(", ")}` });
      continue;
    }
    const name = matches[0];
    const status = name ? adrStatus(await readFile(path.join(adrDirectory, name), "utf8")) : null;
    if (name) referencedPaths.push(`docs/adr/${name}`);
    references.push({ reference: `ADR-${number}`, status, detail: name ? `docs/adr/${name}` : "not found" });
  }

  const adrGateApplied = Array.isArray(changedFiles);
  let tierAdrIds = [];
  if (adrGateApplied) {
    const managedPaths = await readManagedPaths(cwd);
    const gate = await readGateConfig(cwd);
    for (const problem of gate.problems) violations.push({ kind: "adr-config", detail: problem });
    const changed = changedFiles.map(normalize).filter(Boolean);
    const sourceChanges = changed
      .filter((entry) => isSourceChange(entry, managedPaths))
      .filter((entry) => !gate.exempt.some((pattern) => matchesGlob(entry, pattern)));
    if (sourceChanges.length > 0) {
      const accepted = [];
      for (const relativePath of new Set([...changed.filter(isAdrPath), ...referencedPaths])) {
        let content;
        try { content = await readFile(path.join(cwd, relativePath), "utf8"); } catch { continue; }
        if (adrStatus(content) !== "Accepted") continue;
        accepted.push({ id: `ADR-${relativePath.match(/adr-(\d{4})-/)[1]}`, record: adrTierRecord(content) });
      }
      const acceptedInChangeSet = accepted.length > 0;
      // A tier ADR declares its task low-risk, so the whole change set must qualify,
      // and with --require-reviews (merges to the default branch) be reviewed.
      const tierAdrs = accepted.filter((adr) => adr.record.tier === LOW_RISK_TIER);
      tierAdrIds = tierAdrs.map((adr) => adr.id);
      if (tierAdrs.length > 0) {
        for (const problem of lowRiskProblems(gate.lowRisk, changed, sourceChanges, parseLineCounts(lines))) {
          violations.push({ kind: "adr-tier", detail: `low-risk tier (${tierAdrIds.join(", ")}): ${problem}` });
        }
        if (requireReviews) {
          for (const adr of tierAdrs) {
            const problem = reviewProblem(adr.id, adr.record);
            if (problem) violations.push({ kind: "adr-review", detail: problem });
          }
        }
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

  return {
    ok: violations.length === 0,
    violations,
    adrGateApplied,
    adrReferences: references,
    routine: adrGateApplied && routine,
    lowRiskAdrs: tierAdrIds,
    reviewsRequired: adrGateApplied && requireReviews,
  };
}

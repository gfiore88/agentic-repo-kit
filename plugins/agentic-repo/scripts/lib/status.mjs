import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { runDoctor } from "./doctor.mjs";
import { lintKnowledge, maskFencedCode, scalarValue } from "./knowledge.mjs";
import { adrNumberCollisions, adrStatus, adrTierRecord, KNOWLEDGE_FINDINGS, LOW_RISK_TIER } from "./verify.mjs";
import { readScaffoldLock } from "./writer.mjs";

// Read-only session digest (ADR-0015): one call replaces opening the log and every
// ADR/PRD to discover state. No writes, no network, and no subprocesses.

const OPEN_STATUSES = new Set(["Proposed", "Draft"]);
const LOG_ENTRY = /^##\s+\[([^\]]+)\]\s+(\S+)\s+\|\s+(.+?)\s*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KNOWLEDGE_LABELS = {
  brokenLinks: "broken links",
  uncataloguedPages: "uncatalogued pages",
  uncitedFacts: "uncited facts",
  orphanPages: "orphan pages",
  uncoveredSources: "uncovered raw sources",
  malformedLogEntries: "malformed log entries",
  frontmatterIssues: "frontmatter issues",
};

async function listDirectory(directory) {
  try { return (await readdir(directory)).sort(); } catch { return []; }
}

function frontmatterBlock(content) {
  return content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? null;
}

function frontmatterField(block, name) {
  const value = block?.match(new RegExp(`^${name}:[ \\t]*(.*)$`, "m"))?.[1];
  return value === undefined ? null : scalarValue(value) || null;
}

// Templates without frontmatter record status as a `- **Status**: Draft` bullet.
function bulletStatus(content) {
  return content.match(/^[ \t]*(?:[-*][ \t]+)?\*\*Status\*\*:[ \t]*([A-Za-z][A-Za-z -]*?)[ \t]*\r?$/m)?.[1] ?? null;
}

function recordTitle(content, block, fallback) {
  const heading = maskFencedCode(content).match(/^#[ \t]+(.+?)[ \t]*\r?$/m)?.[1];
  return (frontmatterField(block, "title") ?? heading ?? fallback)
    .replace(/^(?:ADR|PRD)-\d+:\s*/i, "")
    .replace(/^Annealing Proposal:\s*/i, "");
}

function awaitsReview(record) {
  return record.tier === LOW_RISK_TIER && record.status === "Accepted" && record.review !== "approved";
}

function byAttention(left, right) {
  const rank = (record) => (!record.status || OPEN_STATUSES.has(record.status) || awaitsReview(record) ? 0 : 1);
  return rank(left) - rank(right) || right.id.localeCompare(left.id) || left.path.localeCompare(right.path);
}

async function readRecords(cwd, directory, kind, readStatus, extra = () => ({})) {
  const pattern = new RegExp(`^${kind.toLowerCase()}-(\\d{4})-(.+)\\.md$`);
  const records = [];
  for (const name of await listDirectory(path.join(cwd, directory))) {
    const match = name.match(pattern);
    if (!match) continue;
    const content = await readFile(path.join(cwd, directory, name), "utf8");
    const block = frontmatterBlock(content);
    records.push({
      id: `${kind}-${match[1]}`,
      status: readStatus(content, block),
      title: recordTitle(content, block, match[2]),
      path: `${directory}/${name}`,
      ...extra(content),
    });
  }
  return records.sort(byAttention);
}

async function readPendingProposals(cwd) {
  const directory = ".agents/annealing/proposals";
  const pending = [];
  for (const name of await listDirectory(path.join(cwd, directory))) {
    if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
    const content = await readFile(path.join(cwd, directory, name), "utf8");
    const block = frontmatterBlock(content);
    const status = bulletStatus(content) ?? frontmatterField(block, "status");
    if (status && status.toUpperCase() !== "PENDING") continue;
    pending.push({ path: `${directory}/${name}`, status, title: recordTitle(content, block, name.slice(0, -3)) });
  }
  return pending;
}

// Logs are either appended (oldest first) or prepended (newest first). The order is
// inferred from the first and last dated entries so same-day entries stay in order;
// undated entries (such as the scaffold's `[INITIALIZED]`) rank after dated ones.
async function latestLogEntries(cwd, limit) {
  let content;
  try { content = await readFile(path.join(cwd, "docs", "wiki", "log.md"), "utf8"); } catch { return []; }
  const entries = maskFencedCode(content).split(/\r?\n/).flatMap((line, position) => {
    const match = line.match(LOG_ENTRY);
    return match ? [{ date: match[1], tag: match[2], description: match[3], position }] : [];
  });
  const dated = entries.filter((entry) => ISO_DATE.test(entry.date));
  const newestFirst = dated.length > 1 && dated[0].date > dated[dated.length - 1].date;
  const recency = (left, right) => (newestFirst ? left.position - right.position : right.position - left.position);
  return [
    ...[...dated].sort((left, right) => right.date.localeCompare(left.date) || recency(left, right)),
    ...entries.filter((entry) => !ISO_DATE.test(entry.date)).sort(recency),
  ].slice(0, limit).map(({ position, ...entry }) => entry);
}

async function kernelStatus(cwd) {
  const lock = await readScaffoldLock(cwd);
  if (!lock) return { initialized: false };
  const doctor = await runDoctor(cwd);
  return {
    initialized: true,
    kitVersion: typeof lock.kitVersion === "string" ? lock.kitVersion : null,
    profile: typeof lock.profile === "string" ? lock.profile : "full",
    enforcement: typeof lock.enforcement === "string" ? lock.enforcement : "none",
    runtimes: Array.isArray(lock.runtimes) ? lock.runtimes : [],
    integrity: { ok: doctor.ok, missing: doctor.missing.length, divergent: doctor.divergent.length },
    trackingChecked: doctor.trackingChecked,
    untracked: doctor.untracked.length,
    conflicted: doctor.conflicted?.length ?? 0,
    pending: doctor.pending?.length ?? 0,
  };
}

async function knowledgeStatus(cwd) {
  let lint;
  try { lint = await lintKnowledge(cwd); } catch { return { initialized: false }; }
  const issues = Object.fromEntries(Object.keys(KNOWLEDGE_FINDINGS).map((category) => [category, lint[category].length]));
  return { initialized: true, ok: lint.ok, checkedPages: lint.checkedPages, issues };
}

export async function collectStatus(cwd, { limit = 5 } = {}) {
  const adrs = await readRecords(cwd, "docs/adr", "ADR", (content) => adrStatus(content), (content) => {
    const { tier, review } = adrTierRecord(content);
    return { tier, review };
  });
  return {
    kernel: await kernelStatus(cwd),
    knowledge: await knowledgeStatus(cwd),
    pendingReviews: adrs.filter(awaitsReview).map(({ id, title, review, path: file }) => ({ id, title, review: review ?? "pending", path: file })),
    adrs,
    prds: await readRecords(cwd, "docs/product", "PRD", (content, block) => frontmatterField(block, "status") ?? bulletStatus(content)),
    pendingProposals: await readPendingProposals(cwd),
    adrCollisions: adrNumberCollisions(await listDirectory(path.join(cwd, "docs", "adr"))),
    log: await latestLogEntries(cwd, limit),
  };
}

function section(lines, label, items, render, note = "") {
  lines.push(items.length > 0 ? `${label}${note}:` : `${label}: none`);
  for (const item of items) lines.push(`  ${render(item)}`);
}

export function formatStatus(cwd, status) {
  const { kernel, knowledge } = status;
  const lines = [`Target: ${cwd}`];
  if (kernel.initialized) {
    lines.push(`Kernel: agentic-repo-kit ${kernel.kitVersion ?? "(unknown version)"}, profile ${kernel.profile}, enforcement ${kernel.enforcement}`);
    lines.push(`Adapters: ${kernel.runtimes.length > 0 ? kernel.runtimes.join(", ") : "none"}`);
    const { ok, missing, divergent } = kernel.integrity;
    lines.push(`Integrity: ${ok ? `healthy${divergent > 0 ? ` (${divergent} customized)` : ""}` : `unhealthy (missing ${missing}, conflict markers ${kernel.conflicted}; run doctor)`}`);
    if (kernel.untracked > 0) lines.push(`Git: ${kernel.untracked} kernel file(s) neither committed nor excluded; commit them or run exclude (see doctor)`);
    if (kernel.conflicted > 0) lines.push(`Merge: ${kernel.conflicted} kernel file(s) with unresolved conflict markers from update; resolve them (see doctor)`);
    if (kernel.pending > 0) lines.push(`Pending: ${kernel.pending} kernel file(s) wait for the kit's changes; run update when the npm registry is reachable`);
  } else lines.push("Kernel: not initialized (no readable scaffold.lock)");
  if (knowledge.initialized) {
    const failing = Object.entries(knowledge.issues)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => `${KNOWLEDGE_LABELS[category] ?? category} ${count}`);
    lines.push(`Knowledge: ${knowledge.ok ? "healthy" : `unhealthy (${failing.join(", ")}; run knowledge lint)`}, ${knowledge.checkedPages} pages`);
  } else lines.push("Knowledge: not initialized (no docs/wiki/index.md)");
  const record = (item) => `${item.id} ${item.status ?? "(no status)"}${item.tier ? ` (${item.tier}, review ${item.review ?? "pending"})` : ""}  ${item.title}`;
  section(lines, "Low-risk ADRs waiting for review", status.pendingReviews, (item) => `${item.id} ${item.review}  ${item.title}`);
  section(lines, "ADRs", status.adrs, record, " (open first)");
  section(lines, "PRDs", status.prds, record, " (open first)");
  section(lines, "Pending annealing proposals", status.pendingProposals, (item) => `${item.path}  ${item.title}`);
  section(lines, "ADR number collisions", status.adrCollisions, (item) => `${item.id}: ${item.paths.join(", ")}`);
  section(lines, "Latest log entries", status.log, (entry) => `[${entry.date}] ${entry.tag} | ${entry.description}`);
  return `${lines.join("\n")}\n`;
}

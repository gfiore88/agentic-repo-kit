import { access, mkdir, readFile, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isUserOwnedPath } from "./catalog.mjs";
import { inspectScaffoldLock } from "./lock.mjs";
import { sha256 } from "./plan.mjs";

export { isUserOwnedPath };

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function inspectPlan(cwd, plan) {
  const created = [];
  const skipped = [];
  const conflicts = [];

  for (const file of plan.files) {
    const target = path.join(cwd, file.path);
    if (!await exists(target)) {
      created.push(file.path);
      continue;
    }
    const current = await readFile(target, "utf8");
    if (current === file.content) skipped.push(file.path);
    else conflicts.push(file.path);
  }

  return { created, skipped, conflicts };
}

export async function applyPlan(cwd, plan, { dryRun = false } = {}) {
  const result = await inspectPlan(cwd, plan);
  if (dryRun || result.conflicts.length > 0) return result;

  for (const relative of result.created) {
    const file = plan.files.find((candidate) => candidate.path === relative);
    const target = path.join(cwd, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, { encoding: "utf8", flag: "wx" });
  }
  return result;
}

const GATE_FILE = "docs/adr/gate.json";

// State of the low-risk tier for `update` (ADR-0021): "enabled", "disabled",
// "will-enable" (the opt-in flag adds it), or "invalid" (gate.json is not JSON).
export async function inspectLowRiskOptIn(cwd, enable) {
  const target = path.join(cwd, GATE_FILE);
  if (!await exists(target)) return enable ? "will-enable" : "disabled";
  let parsed;
  try { parsed = JSON.parse(await readFile(target, "utf8")); } catch { return "invalid"; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "invalid";
  if (parsed.lowRisk !== undefined) return "enabled";
  return enable ? "will-enable" : "disabled";
}

// Adds the default policy to a user-owned gate.json only on explicit opt-in. Other
// keys are kept, and an existing lowRisk section is never overwritten.
export async function enableLowRiskTier(cwd, policy) {
  const target = path.join(cwd, GATE_FILE);
  const parsed = JSON.parse(await readFile(target, "utf8"));
  if (parsed.lowRisk !== undefined) return false;
  parsed.lowRisk = policy;
  await writeFile(target, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return true;
}

export async function readScaffoldLock(cwd) {
  return (await inspectScaffoldLock(cwd)).lock;
}

function lockedHashes(previousLock) {
  const hashes = new Map();
  for (const entry of previousLock?.managedFiles ?? []) {
    if (entry && typeof entry.path === "string" && typeof entry.sha256 === "string") hashes.set(entry.path, entry.sha256);
  }
  return hashes;
}

// Classifies every planned file against the previous scaffold.lock. A kernel-owned
// file is only replaced when its current content still matches the hash the kit
// recorded when it last wrote it; otherwise the user changed it and it is a conflict
// (overridable with `force`). Files the previous lock managed but the new plan no
// longer contains are removed when unmodified and kept when the user changed them.
export async function inspectUpdate(cwd, plan, { previousLock = null, force = false } = {}) {
  const created = [];
  const updated = [];
  const preserved = [];
  const unchanged = [];
  const conflicts = [];
  const removed = [];
  const keptOrphans = [];
  const previous = lockedHashes(previousLock);
  const planned = new Set(plan.files.map((file) => file.path));

  for (const file of plan.files) {
    const target = path.join(cwd, file.path);
    if (!await exists(target)) {
      created.push(file.path);
      continue;
    }
    if (isUserOwnedPath(file.path)) {
      preserved.push(file.path);
      continue;
    }
    const current = await readFile(target, "utf8");
    if (current === file.content) unchanged.push(file.path);
    else if (file.path === "scaffold.lock" || previous.get(file.path) === sha256(current) || force) updated.push(file.path);
    else conflicts.push(file.path);
  }

  for (const [relative, hash] of previous) {
    if (planned.has(relative) || isUserOwnedPath(relative)) continue;
    const target = path.join(cwd, relative);
    if (!await exists(target)) continue;
    if (sha256(await readFile(target, "utf8")) === hash) removed.push(relative);
    else keptOrphans.push(relative);
  }

  return { created, updated, preserved, unchanged, conflicts, removed, keptOrphans };
}

async function pruneEmptyParents(cwd, relative) {
  let directory = path.dirname(path.join(cwd, relative));
  const root = path.resolve(cwd);
  while (directory.startsWith(root) && directory !== root) {
    if ((await readdir(directory)).length > 0) return;
    await rmdir(directory);
    directory = path.dirname(directory);
  }
}

export async function applyUpdate(cwd, plan, { dryRun = false, previousLock = null, force = false } = {}) {
  const result = await inspectUpdate(cwd, plan, { previousLock, force });
  if (dryRun || result.conflicts.length > 0) return result;

  const byPath = new Map(plan.files.map((file) => [file.path, file]));
  for (const relative of [...result.created, ...result.updated]) {
    const target = path.join(cwd, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, byPath.get(relative).content, { encoding: "utf8" });
  }
  for (const relative of result.removed) {
    await unlink(path.join(cwd, relative));
    await pruneEmptyParents(cwd, relative);
  }
  return result;
}

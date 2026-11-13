import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { inspectGitExclude } from "./exclude.mjs";
import { readTrackedPaths, resolveGitDirs } from "./git.mjs";
import { describeLockProblem, findKernelMarkers, inspectScaffoldLock, readScaffoldYaml } from "./lock.mjs";
import { hasConflictMarkers } from "./merge.mjs";
import { sha256 } from "./plan.mjs";
import { isUserOwnedPath } from "./writer.mjs";

// Kernel files that Git would list as untracked: present on disk, absent from the
// index, and outside the managed exclude block (ADR-0026). Runs no subprocess.
async function inspectTracking(cwd, paths) {
  const dirs = await resolveGitDirs(cwd);
  const tracked = dirs ? await readTrackedPaths(dirs) : null;
  if (!tracked) return { trackingChecked: false, untracked: [] };
  const { patterns } = await inspectGitExclude(cwd);
  const excluded = (anchored) => patterns.some((pattern) => (pattern.endsWith("/") ? anchored.startsWith(pattern) : anchored === pattern));
  const untracked = [];
  for (const relative of paths) {
    if (tracked.has(relative) || excluded(`/${relative}`)) continue;
    try {
      await access(path.join(cwd, relative));
      untracked.push(relative);
    } catch {
      // Missing files are reported by the integrity check.
    }
  }
  return { trackingChecked: true, untracked };
}

export async function runDoctor(cwd) {
  const inspection = await inspectScaffoldLock(cwd);
  if (inspection.state !== "ok") {
    const markers = inspection.state === "missing" ? await findKernelMarkers(cwd) : [];
    const configured = Boolean(await readScaffoldYaml(cwd));
    const { problem, hint } = describeLockProblem(inspection, markers, { configured });
    return {
      ok: false,
      lockState: inspection.state,
      runtimes: [],
      missing: inspection.state === "missing" ? ["scaffold.lock"] : [],
      divergent: [],
      trackingChecked: false,
      untracked: [],
      error: problem,
      hint,
    };
  }

  const { lock } = inspection;
  const missing = [];
  const divergent = [];
  const conflicted = [];
  for (const managed of lock.managedFiles ?? []) {
    // User-owned paths are authored by the repository owner and preserved by
    // `update`; expected drift there must not mark the kernel unhealthy.
    if (isUserOwnedPath(managed.path)) continue;
    try {
      const content = await readFile(path.join(cwd, managed.path), "utf8");
      if (sha256(content) !== managed.sha256) divergent.push(managed.path);
      if (hasConflictMarkers(content)) conflicted.push(managed.path);
    } catch {
      missing.push(managed.path);
    }
  }

  const managedPaths = (lock.managedFiles ?? []).map((entry) => entry?.path).filter((entry) => typeof entry === "string");
  const tracking = await inspectTracking(cwd, ["scaffold.lock", ...managedPaths]);
  return {
    ok: missing.length === 0 && divergent.length === 0 && conflicted.length === 0,
    lockState: "ok",
    runtimes: lock.runtimes ?? [],
    missing,
    divergent,
    conflicted,
    ...tracking,
  };
}


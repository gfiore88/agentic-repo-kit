import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./plan.mjs";
import { isUserOwnedPath } from "./writer.mjs";

export async function runDoctor(cwd) {
  let lock;
  try {
    lock = JSON.parse(await readFile(path.join(cwd, "scaffold.lock"), "utf8"));
  } catch (error) {
    return {
      ok: false,
      runtimes: [],
      missing: ["scaffold.lock"],
      divergent: [],
      error: `Cannot read scaffold.lock: ${error.message}`,
    };
  }

  const missing = [];
  const divergent = [];
  for (const managed of lock.managedFiles ?? []) {
    // User-owned paths are authored by the repository owner and preserved by
    // `update`; expected drift there must not mark the kernel unhealthy.
    if (isUserOwnedPath(managed.path)) continue;
    try {
      const content = await readFile(path.join(cwd, managed.path), "utf8");
      if (sha256(content) !== managed.sha256) divergent.push(managed.path);
    } catch {
      missing.push(managed.path);
    }
  }

  return {
    ok: missing.length === 0 && divergent.length === 0,
    runtimes: lock.runtimes ?? [],
    missing,
    divergent,
  };
}


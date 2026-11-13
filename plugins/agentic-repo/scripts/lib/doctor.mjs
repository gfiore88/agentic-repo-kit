import { readFile } from "node:fs/promises";
import path from "node:path";
import { describeLockProblem, findKernelMarkers, inspectScaffoldLock, readScaffoldYaml } from "./lock.mjs";
import { sha256 } from "./plan.mjs";
import { isUserOwnedPath } from "./writer.mjs";

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
      error: problem,
      hint,
    };
  }

  const { lock } = inspection;
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
    lockState: "ok",
    runtimes: lock.runtimes ?? [],
    missing,
    divergent,
  };
}


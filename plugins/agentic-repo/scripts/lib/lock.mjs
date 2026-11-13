import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { PROFILES, RUNTIME_CATALOG, normalizeRuntimeId } from "./catalog.mjs";

// Files every kit version since 0.1.0 generates; their presence without a lock
// means the kernel exists but its lock was lost (ADR-0024).
const KERNEL_MARKERS = Object.freeze(["AGENTS.md", ".agents/registry.md"]);
const ENFORCEMENT_MODES = Object.freeze(["ci", "hooks", "none"]);

// Classifies scaffold.lock as "ok", "missing", "unreadable" (any read error other
// than ENOENT), or "invalid" (content that is not a JSON object).
export async function inspectScaffoldLock(cwd) {
  let content;
  try {
    content = await readFile(path.join(cwd, "scaffold.lock"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { state: "missing", lock: null, error: null };
    return { state: "unreadable", lock: null, error: error.message };
  }
  let lock;
  try {
    lock = JSON.parse(content);
  } catch (error) {
    return { state: "invalid", lock: null, error: error.message.replace(/\s+/g, " ") };
  }
  if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
    return { state: "invalid", lock: null, error: "not a JSON object" };
  }
  return { state: "ok", lock, error: null };
}

export async function findKernelMarkers(cwd) {
  const found = [];
  for (const marker of KERNEL_MARKERS) {
    try {
      await access(path.join(cwd, marker));
      found.push(marker);
    } catch {
      // Absent marker.
    }
  }
  return found;
}

// Parses the scaffold.yaml format the kit writes: `enforcement` (since 0.5.0),
// `profile` (since 0.7.0), and the `compatibility.runtimes` list (inline `[]` or one
// `- id` per line). Returns null without a usable runtime list.
export function parseScaffoldYaml(content) {
  const config = { runtimes: null, enforcement: null, profile: null };
  let inRuntimeList = false;
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    const scalar = line.match(/^(enforcement|profile):[ \t]*([\w-]+)[ \t]*$/);
    const list = line.match(/^[ \t]+runtimes:[ \t]*(\[\])?[ \t]*$/);
    const item = inRuntimeList ? line.match(/^[ \t]+-[ \t]*([\w-]+)[ \t]*$/) : null;
    if (scalar) config[scalar[1]] = scalar[2];
    else if (list) config.runtimes = [];
    else if (item) config.runtimes.push(normalizeRuntimeId(item[1]));
    if (line.trim() !== "") inRuntimeList = Boolean(list && !list[1]) || Boolean(item);
  }
  if (!config.runtimes || config.runtimes.some((runtime) => !RUNTIME_CATALOG[runtime])) return null;
  return {
    runtimes: [...new Set(config.runtimes)],
    enforcement: ENFORCEMENT_MODES.includes(config.enforcement) ? config.enforcement : null,
    profile: PROFILES.includes(config.profile) ? config.profile : null,
  };
}

export async function readScaffoldYaml(cwd) {
  let content;
  try {
    content = await readFile(path.join(cwd, "scaffold.yaml"), "utf8");
  } catch {
    return null;
  }
  const config = parseScaffoldYaml(content);
  return config ? { ...config, content } : null;
}

// Names the problem with an unusable lock and the next step that can succeed.
// `configured` means scaffold.yaml supplies the runtimes `update --adopt` needs.
export function describeLockProblem(inspection, kernelMarkers, { configured = false } = {}) {
  if (inspection.state === "missing" && kernelMarkers.length === 0) {
    return {
      problem: "scaffold.lock not found; this repository was not initialized by agentic-repo-kit",
      hint: "Run `npx agentic-repo-kit init` first (it stops on conflicting files instead of overwriting them).",
    };
  }
  if (inspection.state === "missing") {
    const adopt = `npx agentic-repo-kit update --adopt${configured ? "" : " --runtime <ids|none>"}`;
    return {
      problem: `scaffold.lock not found, but kernel files exist (${kernelMarkers.join(", ")})`,
      hint: `Restore scaffold.lock from version control or from the machine that initialized the repository. Otherwise run \`${adopt}\`: every kernel file that differs from this version becomes a conflict, and nothing is overwritten without --force. If agentic-repo-kit never initialized this repository, run \`npx agentic-repo-kit init\` instead.`,
    };
  }
  if (inspection.state === "unreadable") {
    return {
      problem: `cannot read scaffold.lock (${inspection.error})`,
      hint: "Fix its permissions, or restore it from version control.",
    };
  }
  return {
    problem: `scaffold.lock is not a valid lock (${inspection.error})`,
    hint: "Restore it from version control, for example after a merge conflict. If it cannot be restored, delete it and run `npx agentic-repo-kit update --adopt`.",
  };
}

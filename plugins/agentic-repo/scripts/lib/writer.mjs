import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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


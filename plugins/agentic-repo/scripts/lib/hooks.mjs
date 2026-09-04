import { access, chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stat } from "node:fs/promises";

export const HOOKS_DIR = ".agents/hooks";
export const MANAGED_HOOKS = ["pre-push"];

async function resolveGitDir(cwd) {
  const gitPath = path.join(cwd, ".git");
  try {
    const gitStat = await stat(gitPath);
    if (gitStat.isDirectory()) return gitPath;
    if (gitStat.isFile()) {
      const content = await readFile(gitPath, "utf8");
      const match = content.match(/^gitdir:\s*(.+)$/m);
      if (match) return path.resolve(cwd, match[1].trim());
    }
  } catch {
    return null;
  }
  return null;
}

// Minimal git-config editor scoped to the core.hooksPath key. Keeps the kit
// subprocess-free by writing .git/config directly, mirroring exclude.mjs.
function setCoreHooksPath(configText, value) {
  const lines = configText.split("\n");
  const isSection = (line) => /^\s*\[/.test(line);
  const isCoreHeader = (line) => /^\s*\[core\]\s*$/i.test(line);
  let coreStart = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (isCoreHeader(lines[index])) {
      coreStart = index;
      break;
    }
  }
  const entry = `\thooksPath = ${value}`;
  if (coreStart === -1) {
    const trimmed = configText.replace(/\n+$/, "");
    return `${trimmed ? `${trimmed}\n` : ""}[core]\n${entry}\n`;
  }
  let sectionEnd = lines.length;
  for (let index = coreStart + 1; index < lines.length; index += 1) {
    if (isSection(lines[index])) {
      sectionEnd = index;
      break;
    }
  }
  for (let index = coreStart + 1; index < sectionEnd; index += 1) {
    if (/^\s*hooksPath\s*=/i.test(lines[index])) {
      lines[index] = entry;
      return lines.join("\n");
    }
  }
  lines.splice(coreStart + 1, 0, entry);
  return lines.join("\n");
}

function removeCoreHooksPath(configText) {
  return configText
    .split("\n")
    .filter((line) => !/^\s*hooksPath\s*=/i.test(line))
    .join("\n");
}

function readCoreHooksPath(configText) {
  const match = configText.match(/^\s*hooksPath\s*=\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

export async function installGitHooks(cwd) {
  const gitDir = await resolveGitDir(cwd);
  if (!gitDir) return { ok: false, reason: "no-git" };

  for (const name of MANAGED_HOOKS) {
    const hookFile = path.join(cwd, HOOKS_DIR, name);
    try {
      await access(hookFile);
      await chmod(hookFile, 0o755);
    } catch {}
  }

  const configPath = path.join(gitDir, "config");
  let configText = "";
  try {
    configText = await readFile(configPath, "utf8");
  } catch {}
  await writeFile(configPath, setCoreHooksPath(configText, HOOKS_DIR), "utf8");
  return { ok: true, hooksPath: HOOKS_DIR, hooks: MANAGED_HOOKS };
}

// Only resets core.hooksPath when it still points at the managed directory, so
// we never clobber a hooks path the user configured for another purpose.
export async function uninstallGitHooks(cwd) {
  const gitDir = await resolveGitDir(cwd);
  if (!gitDir) return { ok: false, reason: "no-git" };

  const configPath = path.join(gitDir, "config");
  let configText = "";
  try {
    configText = await readFile(configPath, "utf8");
  } catch {
    return { ok: true, removed: false };
  }
  if (readCoreHooksPath(configText) !== HOOKS_DIR) {
    return { ok: true, removed: false };
  }
  await writeFile(configPath, removeCoreHooksPath(configText), "utf8");
  return { ok: true, removed: true };
}

export async function inspectGitHooks(cwd) {
  const gitDir = await resolveGitDir(cwd);
  if (!gitDir) return { ok: false, reason: "no-git", active: false };
  try {
    const configText = await readFile(path.join(gitDir, "config"), "utf8");
    return { ok: true, active: readCoreHooksPath(configText) === HOOKS_DIR };
  } catch {
    return { ok: true, active: false };
  }
}

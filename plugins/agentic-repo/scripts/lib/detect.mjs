import { access } from "node:fs/promises";
import path from "node:path";
import { delimiter } from "node:path";
import { RUNTIME_CATALOG } from "./catalog.mjs";

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function commandExists(command, env = process.env, platform = process.platform) {
  const pathEntries = (env.PATH ?? "").split(delimiter).filter(Boolean);
  const extensions = platform === "win32"
    ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  for (const entry of pathEntries) {
    for (const extension of extensions) {
      if (await pathExists(path.join(entry, `${command}${extension}`))) return true;
    }
  }
  return false;
}

export async function detectRuntimes(cwd, dependencies = {}) {
  const hasCommand = dependencies.commandExists ?? commandExists;
  const exists = dependencies.pathExists ?? pathExists;
  const detected = [];

  for (const [id, runtime] of Object.entries(RUNTIME_CATALOG)) {
    const markerHits = [];
    for (const marker of runtime.markers) {
      if (await exists(path.join(cwd, marker))) markerHits.push(marker);
    }

    const executableHits = [];
    for (const executable of runtime.executables) {
      if (await hasCommand(executable)) executableHits.push(executable);
    }

    if (markerHits.length > 0 || executableHits.length > 0) {
      detected.push({ id, markerHits, executableHits });
    }
  }

  return detected;
}


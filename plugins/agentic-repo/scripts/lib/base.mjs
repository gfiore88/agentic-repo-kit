import { createHash } from "node:crypto";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { sha256 } from "./plan.mjs";

const PACKAGE = "agentic-repo-kit";
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function registryUrl(env = process.env) {
  const configured = env.npm_config_registry || "https://registry.npmjs.org/";
  return configured.endsWith("/") ? configured : `${configured}/`;
}

export function cacheRoot(env = process.env) {
  if (env.AGENTIC_REPO_KIT_CACHE) return env.AGENTIC_REPO_KIT_CACHE;
  if (process.platform === "win32" && env.LOCALAPPDATA) return path.join(env.LOCALAPPDATA, PACKAGE);
  return path.join(env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), PACKAGE);
}

// Reads the regular files of a gzip'd npm tarball, including PAX and GNU long
// names. Paths that would leave the archive are refused.
export function readTarball(gzipped) {
  const tar = gunzipSync(gzipped);
  const files = new Map();
  let offset = 0;
  let longName = null;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, length) => {
      const raw = header.subarray(start, start + length);
      const nul = raw.indexOf(0);
      return raw.subarray(0, nul < 0 ? length : nul).toString("utf8");
    };
    const size = Number.parseInt(field(124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156] || 48);
    const prefix = header.toString("latin1", 257, 263) === "ustar\u0000" ? field(345, 155) : "";
    const name = longName ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
    longName = null;
    const data = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === "x") {
      longName = data.toString("utf8").match(/(?:^|\n)\d+ path=([^\n]*)\n/)?.[1] ?? null;
      continue;
    }
    if (type === "L") {
      longName = data.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (type !== "0" && type !== "7") continue;
    const normalized = path.posix.normalize(name);
    if (normalized === ".." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
      throw new Error(`unsafe path in package: ${name}`);
    }
    files.set(normalized, Buffer.from(data));
  }
  return files;
}

async function fetchBuffer(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Downloads, verifies, and caches a published kit version; returns its root.
export async function ensurePackage(version, { env = process.env, timeoutMs = 30000 } = {}) {
  if (!VERSION_PATTERN.test(version)) throw new Error(`invalid kit version ${JSON.stringify(version)}`);
  const directory = path.join(cacheRoot(env), "packages", version);
  const root = path.join(directory, "package");
  try {
    await access(path.join(directory, ".complete"));
    return root;
  } catch {
    // Not cached yet.
  }
  const metadata = JSON.parse((await fetchBuffer(`${registryUrl(env)}${PACKAGE}/${version}`, timeoutMs)).toString("utf8"));
  const { tarball, integrity } = metadata.dist ?? {};
  if (typeof tarball !== "string" || typeof integrity !== "string" || !integrity.startsWith("sha512-")) {
    throw new Error(`the registry gives no sha512 integrity for ${PACKAGE}@${version}`);
  }
  const archive = await fetchBuffer(tarball, timeoutMs);
  if (createHash("sha512").update(archive).digest("base64") !== integrity.slice("sha512-".length)) {
    throw new Error(`${PACKAGE}@${version} does not match the registry's integrity hash`);
  }
  const staging = `${directory}.tmp-${process.pid}-${Date.now()}`;
  try {
    for (const [name, content] of readTarball(archive)) {
      const target = path.join(staging, ...name.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    await writeFile(path.join(staging, ".complete"), `${integrity}\n`, "utf8");
    await rm(directory, { recursive: true, force: true });
    await mkdir(path.dirname(directory), { recursive: true });
    await rename(staging, directory);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return root;
}

// Rebuilds the content the kit wrote for `paths`, as recorded in `lock`, and keeps
// a file only when its SHA-256 equals the hash in the lock (ADR-0028). An entry
// can name its own `kitVersion`; otherwise the lock's applies. The running version
// uses `currentPlan` and downloads nothing.
export async function rebuildBase(lock, paths, { currentVersion, currentPlan, env = process.env } = {}) {
  const bases = new Map();
  const reasons = new Map();
  const entries = new Map((lock.managedFiles ?? []).filter((entry) => typeof entry?.path === "string").map((entry) => [entry.path, entry]));
  const byVersion = new Map();
  for (const relative of paths) {
    const entry = entries.get(relative);
    const version = entry?.kitVersion ?? lock.kitVersion;
    if (!entry) reasons.set(relative, "the kit did not write this file");
    else if (typeof version !== "string") reasons.set(relative, "the lock records no kit version (initialized before 0.7.0)");
    else byVersion.set(version, [...(byVersion.get(version) ?? []), relative]);
  }
  const configuration = {
    runtimes: Array.isArray(lock.runtimes) ? lock.runtimes : [],
    enforce: typeof lock.enforcement === "string" ? lock.enforcement : "none",
    profile: typeof lock.profile === "string" ? lock.profile : "full",
  };
  for (const [version, wanted] of byVersion) {
    let plan;
    try {
      if (version === currentVersion && currentPlan) plan = await currentPlan(configuration);
      else {
        const root = await ensurePackage(version, { env });
        const library = path.join(root, "plugins", "agentic-repo");
        const { buildPlan } = await import(pathToFileURL(path.join(library, "scripts", "lib", "plan.mjs")).href);
        plan = await buildPlan({
          assetsRoot: path.join(library, "assets"),
          skillsRoot: path.join(library, "skills"),
          ...configuration,
        });
      }
    } catch (error) {
      for (const relative of wanted) reasons.set(relative, `cannot rebuild ${version}: ${error.message}`);
      continue;
    }
    const contents = new Map(plan.files.map((file) => [file.path, file.content]));
    for (const relative of wanted) {
      const content = contents.get(relative);
      if (content !== undefined && sha256(content) === entries.get(relative).sha256) bases.set(relative, content);
      else reasons.set(relative, `the content rebuilt from ${version} does not match the lock`);
    }
  }
  return { bases, reasons };
}

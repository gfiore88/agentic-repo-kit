import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Locates the Git directory of the repository at `cwd` and its common directory.
// A linked worktree's `.git` file points to a per-worktree directory whose
// `commondir` file names the shared one, where Git reads `info/exclude` and
// `config` (ADR-0026). Returns null outside a Git repository.
export async function resolveGitDirs(cwd) {
  const gitPath = path.join(cwd, ".git");
  let gitDir;
  try {
    const gitStat = await stat(gitPath);
    if (gitStat.isDirectory()) gitDir = gitPath;
    else if (gitStat.isFile()) {
      const match = (await readFile(gitPath, "utf8")).match(/^gitdir:\s*(.+)$/m);
      if (!match) return null;
      gitDir = path.resolve(cwd, match[1].trim());
    } else return null;
  } catch {
    return null;
  }
  let commonDir = gitDir;
  try {
    const common = (await readFile(path.join(gitDir, "commondir"), "utf8")).trim();
    if (common) commonDir = path.resolve(gitDir, common);
  } catch {
    // Not a linked worktree.
  }
  return { gitDir, commonDir };
}

// Index extensions after which the entries no longer describe the whole tree: a
// split index keeps part of them in a shared file, a sparse index collapses
// directories.
const PARTIAL_INDEX_EXTENSIONS = new Set(["link", "sdir"]);

function decodeVarint(buffer, start) {
  let offset = start;
  let byte = buffer[offset++];
  if (byte === undefined) throw new RangeError("truncated index");
  let value = byte & 0x7f;
  while (byte & 0x80) {
    byte = buffer[offset++];
    if (byte === undefined) throw new RangeError("truncated index");
    value = (value + 1) * 128 + (byte & 0x7f);
  }
  return { value, offset };
}

// Returns the paths recorded in a Git index (versions 2 to 4), or null when the
// index is not one this reader can describe completely.
export function parseIndexPaths(buffer, hashSize = 20) {
  try {
    if (buffer.length < 12 + hashSize || buffer.toString("latin1", 0, 4) !== "DIRC") return null;
    const version = buffer.readUInt32BE(4);
    if (version < 2 || version > 4) return null;
    const count = buffer.readUInt32BE(8);
    const end = buffer.length - hashSize;
    const paths = new Set();
    let previous = Buffer.alloc(0);
    let offset = 12;
    for (let entry = 0; entry < count; entry += 1) {
      const start = offset;
      const flagsOffset = start + 40 + hashSize;
      const flags = buffer.readUInt16BE(flagsOffset);
      offset = flagsOffset + 2;
      if (flags & 0x4000) {
        if (version < 3) return null;
        offset += 2;
      }
      let name;
      if (version === 4) {
        const strip = decodeVarint(buffer, offset);
        const nul = buffer.indexOf(0, strip.offset);
        if (nul < 0 || nul >= end || strip.value > previous.length) return null;
        name = Buffer.concat([previous.subarray(0, previous.length - strip.value), buffer.subarray(strip.offset, nul)]);
        offset = nul + 1;
      } else {
        const nul = buffer.indexOf(0, offset);
        if (nul < 0 || nul >= end) return null;
        name = buffer.subarray(offset, nul);
        offset = start + ((nul - start + 8) & ~7);
      }
      if (offset > end) return null;
      paths.add(name.toString("utf8"));
      previous = name;
    }
    while (offset + 8 <= end) {
      if (PARTIAL_INDEX_EXTENSIONS.has(buffer.toString("latin1", offset, offset + 4))) return null;
      offset += 8 + buffer.readUInt32BE(offset + 4);
    }
    return paths;
  } catch {
    return null;
  }
}

// Tracked paths of the repository, read without running Git. A missing index means
// nothing is tracked yet; an unreadable or partial one yields null.
export async function readTrackedPaths(dirs) {
  let buffer;
  try {
    buffer = await readFile(path.join(dirs.gitDir, "index"));
  } catch (error) {
    return error.code === "ENOENT" ? new Set() : null;
  }
  let hashSize = 20;
  try {
    const config = await readFile(path.join(dirs.commonDir, "config"), "utf8");
    if (/^\s*objectformat\s*=\s*sha256\s*$/im.test(config)) hashSize = 32;
  } catch {
    // Without a config the repository uses SHA-1.
  }
  return parseIndexPaths(buffer, hashSize);
}

import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const validator = path.join(os.homedir(), ".codex/skills/.system/skill-creator/scripts/quick_validate.py");
const skillsRoot = path.resolve("plugins/agentic-repo/skills");
const entries = await readdir(skillsRoot, { withFileTypes: true });
let failed = false;

for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
  const skillPath = path.join(skillsRoot, entry.name);
  const result = spawnSync("uv", ["run", "--with", "pyyaml", "python", validator, skillPath], { encoding: "utf8" });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;


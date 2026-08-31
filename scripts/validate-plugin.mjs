import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const validator = path.join(os.homedir(), ".codex/skills/.system/plugin-creator/scripts/validate_plugin.py");
const plugin = path.resolve("plugins/agentic-repo");
const result = spawnSync("uv", ["run", "--with", "pyyaml", "python", validator, plugin], { encoding: "utf8" });

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.status ?? 1;


import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Runs from the npm `version` lifecycle script so the Codex plugin manifest is
// bumped inside the same release commit and tag as package.json.
const manifestPath = path.resolve("plugins/agentic-repo/.codex-plugin/plugin.json");
const { version } = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.version !== version) {
  manifest.version = version;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
console.log(`plugin.json version: ${version}`);

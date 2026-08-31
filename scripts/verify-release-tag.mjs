import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expected = `v${packageJson.version}`;
const actual = process.env.RELEASE_TAG;

if (!actual) {
  console.error("RELEASE_TAG is required");
  process.exit(1);
}
if (actual !== expected) {
  console.error(`Release tag ${actual} does not match package version ${expected}`);
  process.exit(1);
}
console.log(`Release tag ${actual} matches package version ${packageJson.version}`);

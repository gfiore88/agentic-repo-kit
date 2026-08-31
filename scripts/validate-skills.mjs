import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const skillsRoot = path.resolve("plugins/agentic-repo/skills");
const allowedKeys = new Set(["name", "description", "license", "allowed-tools", "metadata"]);
const entries = (await readdir(skillsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((left, right) => left.name.localeCompare(right.name));
const failures = [];

function validateBody(body) {
  let fence = null;
  for (const line of body.split("\n")) {
    const marker = line.match(/^\s*(?:[-+*]|\d+[.)])?\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
    } else if (!fence && /^\s*\[TODO:[^\n]*\]\s*$/.test(line)) {
      return "instructions contain an unfinished TODO placeholder";
    }
  }
  return null;
}

for (const entry of entries) {
  const file = path.join(skillsRoot, entry.name, "SKILL.md");
  let content;
  try { content = await readFile(file, "utf8"); } catch {
    failures.push(`${entry.name}: SKILL.md not found`);
    continue;
  }
  const frontMatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatter) {
    failures.push(`${entry.name}: invalid YAML frontmatter`);
    continue;
  }
  let metadata;
  try { metadata = parse(frontMatter[1]); } catch (error) {
    failures.push(`${entry.name}: invalid YAML: ${error.message}`);
    continue;
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    failures.push(`${entry.name}: frontmatter must be a mapping`);
    continue;
  }
  const unexpected = Object.keys(metadata).filter((key) => !allowedKeys.has(key));
  if (unexpected.length) failures.push(`${entry.name}: unexpected frontmatter keys: ${unexpected.join(", ")}`);
  if (typeof metadata.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name) || metadata.name.length > 64) {
    failures.push(`${entry.name}: name must be valid hyphen-case with at most 64 characters`);
  }
  if (metadata.name !== entry.name) failures.push(`${entry.name}: directory and frontmatter name differ`);
  if (typeof metadata.description !== "string" || !metadata.description.trim()) {
    failures.push(`${entry.name}: description must be a non-empty string`);
  } else {
    if (metadata.description.length > 1024) failures.push(`${entry.name}: description exceeds 1024 characters`);
    if (/[<>]/.test(metadata.description)) failures.push(`${entry.name}: description contains angle brackets`);
    if (metadata.description.startsWith("[TODO:")) failures.push(`${entry.name}: description contains a TODO placeholder`);
  }
  const bodyError = validateBody(content.slice(frontMatter[0].length));
  if (bodyError) failures.push(`${entry.name}: ${bodyError}`);
}

if (failures.length) {
  console.error("Skill validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Skill validation passed: ${entries.length} skills`);


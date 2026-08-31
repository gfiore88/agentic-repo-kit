import { access, readFile } from "node:fs/promises";
import path from "node:path";

const pluginRoot = path.resolve("plugins/agentic-repo");
const manifestPath = path.join(pluginRoot, ".codex-plugin/plugin.json");
const allowedTopLevel = new Set([
  "id", "name", "version", "description", "skills", "apps", "mcpServers", "interface",
  "author", "homepage", "repository", "license", "keywords",
]);
const allowedInterface = new Set([
  "displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities",
  "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "brandColor", "composerIcon", "logo", "logoDark",
  "screenshots", "defaultPrompt", "default_prompt",
]);
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const failures = [];

function requiredString(object, key, prefix = "") {
  if (typeof object?.[key] !== "string" || !object[key].trim()) failures.push(`${prefix}${key} must be a non-empty string`);
}

function unknownKeys(object, allowed, prefix) {
  for (const key of Object.keys(object ?? {})) if (!allowed.has(key)) failures.push(`${prefix}${key} is not supported`);
}

function httpsUrl(value, field) {
  if (value === undefined) return;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error();
  } catch { failures.push(`${field} must be an absolute HTTPS URL`); }
}

async function pathExists(relative, field) {
  if (typeof relative !== "string" || path.isAbsolute(relative)) {
    failures.push(`${field} must be a relative path`);
    return;
  }
  try { await access(path.resolve(pluginRoot, relative)); } catch { failures.push(`${field} points to a missing path`); }
}

let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch (error) {
  console.error(`Plugin validation failed: ${error.message}`);
  process.exit(1);
}

unknownKeys(manifest, allowedTopLevel, "plugin.json field ");
requiredString(manifest, "name");
requiredString(manifest, "version");
requiredString(manifest, "description");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name ?? "")) failures.push("name must be a kebab-case identifier");
if (!semver.test(manifest.version ?? "")) failures.push("version must be strict semver");
if (JSON.stringify(manifest).includes("[TODO:")) failures.push("manifest contains an unfinished TODO placeholder");

if (!manifest.author || typeof manifest.author !== "object" || Array.isArray(manifest.author)) failures.push("author must be an object");
else {
  unknownKeys(manifest.author, new Set(["name", "email", "url"]), "author.");
  requiredString(manifest.author, "name", "author.");
  httpsUrl(manifest.author.url, "author.url");
}
httpsUrl(manifest.homepage, "homepage");
httpsUrl(manifest.repository, "repository");
if (manifest.skills !== undefined) await pathExists(manifest.skills, "skills");

const ui = manifest.interface;
if (!ui || typeof ui !== "object" || Array.isArray(ui)) failures.push("interface must be an object");
else {
  unknownKeys(ui, allowedInterface, "interface.");
  for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) requiredString(ui, field, "interface.");
  if (!Array.isArray(ui.capabilities) || !ui.capabilities.every((value) => typeof value === "string" && value.trim())) failures.push("interface.capabilities must be an array of non-empty strings");
  const prompts = ui.defaultPrompt ?? ui.default_prompt;
  if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > 3 || !prompts.every((value) => typeof value === "string" && value.trim() && value.length <= 128)) failures.push("interface.defaultPrompt must contain one to three strings of at most 128 characters");
  for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) httpsUrl(ui[field], `interface.${field}`);
  for (const field of ["composerIcon", "logo", "logoDark"]) if (ui[field] !== undefined) await pathExists(ui[field], `interface.${field}`);
}

if (failures.length) {
  console.error("Plugin validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Plugin validation passed: ${pluginRoot}`);

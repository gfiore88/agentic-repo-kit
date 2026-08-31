import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function collectFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" && current === root) return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, absolute));
    else if (entry.isFile()) {
      files.push({
        path: path.relative(root, absolute).split(path.sep).join("/"),
        content: await readFile(absolute, "utf8"),
      });
    }
  }
  return files;
}

function mergeFile(target, file, source) {
  const existing = target.get(file.path);
  if (existing && existing.content !== file.content) {
    throw new Error(`Blueprint collision for ${file.path}: ${existing.source} and ${source}`);
  }
  target.set(file.path, { ...file, source });
}

function agentMetadata(file) {
  const frontMatter = file.content.match(/^---\n([\s\S]*?)\n---/);
  const field = (name) => frontMatter?.[1].match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();
  const fallback = path.basename(file.path, ".md");
  return {
    id: (field("name") ?? fallback).replace(/^['"]|['"]$/g, ""),
    description: (field("description") ?? `Specialist agent defined in ${file.path}`).replace(/^['"]|['"]$/g, ""),
    sourcePath: `.agents/agents/${file.path}`,
  };
}

function quote(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function runtimeAgentFile(runtime, agent) {
  const common = `Read AGENTS.md, .agents/registry.md, and ${agent.sourcePath}. Follow the canonical role and repository governance. Runtime adapters never override human approval gates.`;
  if (runtime === "codex") {
    return {
      path: `.codex/agents/${agent.id}.toml`,
      content: `name = "${agent.id.replaceAll("-", "_")}"\ndescription = "${quote(agent.description)}"\ndeveloper_instructions = "${quote(common)}"\n`,
    };
  }
  if (runtime === "claude-code") {
    return {
      path: `.claude/agents/${agent.id}.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\nmodel: inherit\n---\n\n${common}\n`,
    };
  }
  if (runtime === "github-copilot") {
    return {
      path: `.github/agents/${agent.id}.agent.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\n---\n\n${common}\n`,
    };
  }
  if (runtime === "gemini-cli") {
    return {
      path: `.gemini/agents/${agent.id}.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\nkind: local\nmodel: inherit\n---\n\n${common}\n`,
    };
  }
  if (runtime === "opencode") {
    return {
      path: `.opencode/agents/${agent.id}.md`,
      content: `---\ndescription: ${JSON.stringify(agent.description)}\nmode: subagent\n---\n\n${common}\n`,
    };
  }
  return null;
}

function scaffoldYaml(runtimes) {
  if (runtimes.length === 0) {
    return "version: 1\ncompatibility:\n  detection: assisted\n  runtimes: []\n";
  }
  const runtimeLines = runtimes.map((runtime) => `    - ${runtime}`).join("\n");
  return `version: 1\ncompatibility:\n  detection: assisted\n  runtimes:\n${runtimeLines}\n`;
}

export async function buildPlan({ assetsRoot, skillsRoot, runtimes }) {
  const files = new Map();
  const baseRoot = path.join(assetsRoot, "blueprints", "base");
  const baseFiles = await collectFiles(baseRoot);
  for (const file of baseFiles) mergeFile(files, file, "base");
  const agents = baseFiles
    .filter((file) => file.path.startsWith(".agents/agents/") && file.path.endsWith(".md"))
    .map((file) => agentMetadata({ ...file, path: file.path.slice(".agents/agents/".length) }));

  for (const file of await collectFiles(skillsRoot)) {
    mergeFile(files, { ...file, path: `.agents/skills/${file.path}` }, "kernel-skill");
  }

  for (const runtime of runtimes) {
    const adapterRoot = path.join(assetsRoot, "adapters", runtime);
    for (const file of await collectFiles(adapterRoot)) mergeFile(files, file, runtime);
    for (const agent of agents) {
      const generated = runtimeAgentFile(runtime, agent);
      if (generated) mergeFile(files, generated, `${runtime}:generated-agent`);
    }
  }

  mergeFile(files, { path: "scaffold.yaml", content: scaffoldYaml(runtimes) }, "generated");

  const managed = [...files.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => ({ path: file.path, sha256: sha256(file.content), source: file.source }));
  const lockContent = `${JSON.stringify({ schemaVersion: 1, runtimes, managedFiles: managed }, null, 2)}\n`;
  mergeFile(files, { path: "scaffold.lock", content: lockContent }, "generated");

  return {
    runtimes: [...runtimes],
    files: [...files.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
}

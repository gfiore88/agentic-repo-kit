import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs, parseRuntimeSelection } from "./args.mjs";
import { RUNTIME_CATALOG, runtimeIds } from "./catalog.mjs";
import { detectRuntimes } from "./detect.mjs";
import { buildPlan } from "./plan.mjs";
import { applyPlan, applyUpdate, inspectPlan, inspectUpdate } from "./writer.mjs";
import { runDoctor } from "./doctor.mjs";
import { createGovernedArtifact } from "./artifacts.mjs";
import { lintKnowledge } from "./knowledge.mjs";
import { applyGitExclude, inspectGitExclude, removeGitExclude } from "./exclude.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(moduleDir, "../../assets");
const skillsRoot = path.resolve(moduleDir, "../../skills");

function helpText() {
  return `Agentic Repository Kernel

Usage:
  agentic-repo init [options]
  agentic-repo update [options]
  agentic-repo doctor [options]
  agentic-repo exclude [options]
  agentic-repo knowledge lint [options]
  agentic-repo adr new --title <title> [options]
  agentic-repo prd new --title <title> [options]
  agentic-repo anneal new --title <title> --target <file> [options]

Options:
  --runtime <ids|auto|none>  Override runtime selection (default: auto)
  --git-exclude, --exclude   Add generated paths to .git/info/exclude
  --remove                   Remove managed excludes from .git/info/exclude
  --list                     List active local exclusions
  --cwd <path>               Target repository (default: current directory)
  --yes, -y                  Confirm writes non-interactively
  --dry-run                  Show the plan without writing
  --json                     Emit machine-readable output
  --title <text>             Governed artifact title
  --target <path>            Canonical directive targeted by annealing
  --help, -h                 Show help

Runtime IDs:
  ${runtimeIds().join(", ")}
`;
}

function printPlan({ cwd, runtimes, detected, inspection, detectionMode, gitExclude }) {
  output.write(`Target: ${cwd}\n`);
  if (detected.length > 0) {
    output.write("Detected runtimes:\n");
    for (const item of detected) {
      const evidence = [...item.executableHits.map((hit) => `command:${hit}`), ...item.markerHits.map((hit) => `marker:${hit}`)];
      output.write(`  - ${RUNTIME_CATALOG[item.id].displayName} (${evidence.join(", ")})\n`);
    }
  } else if (detectionMode === "auto") output.write("Detected runtimes: none; universal kernel only.\n");
  else output.write("Runtime detection: skipped because selection is explicit.\n");
  output.write(`Selected adapters: ${runtimes.length > 0 ? runtimes.join(", ") : "none"}\n`);
  if (gitExclude) output.write("Local git exclude: enabled (.git/info/exclude)\n");
  output.write(`Create: ${inspection.created.length}, unchanged: ${inspection.skipped.length}, conflicts: ${inspection.conflicts.length}\n`);
  for (const conflict of inspection.conflicts) output.write(`  conflict: ${conflict}\n`);
}

function printUpdatePlan({ cwd, runtimes, inspection, gitExclude }) {
  output.write(`Target: ${cwd}\n`);
  output.write(`Selected adapters: ${runtimes.length > 0 ? runtimes.join(", ") : "none"}\n`);
  if (gitExclude) output.write("Local git exclude: enabled (.git/info/exclude)\n");
  output.write(`Update: ${inspection.updated.length}, create: ${inspection.created.length}, unchanged: ${inspection.unchanged.length}, preserved: ${inspection.preserved.length}\n`);
  for (const item of inspection.updated) output.write(`  update: ${item}\n`);
  for (const item of inspection.created) output.write(`  create: ${item}\n`);
  for (const item of inspection.preserved) output.write(`  preserve (user): ${item}\n`);
}

async function confirm(message) {
  const readline = createInterface({ input, output });
  try {
    const answer = (await readline.question(`${message} [Y/n] `)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}

async function runInit(options) {
  const cwd = path.resolve(options.cwd);
  const selection = parseRuntimeSelection(options.runtime);
  const detected = selection.mode === "auto" ? await detectRuntimes(cwd) : [];
  const runtimes = selection.mode === "auto" ? detected.map((item) => item.id) : selection.runtimes;
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes });
  const inspection = await inspectPlan(cwd, plan);

  if (options.json) {
    output.write(`${JSON.stringify({ cwd, detected, runtimes, gitExclude: options.gitExclude, ...inspection }, null, 2)}\n`);
  } else printPlan({ cwd, runtimes, detected, inspection, detectionMode: selection.mode, gitExclude: options.gitExclude });

  if (inspection.conflicts.length > 0) {
    if (!options.json) output.write("No files written because preflight found conflicts.\n");
    return 1;
  }
  if (options.dryRun) return 0;

  let approved = options.yes;
  if (!approved && input.isTTY && output.isTTY) approved = await confirm("Apply this initialization plan?");
  if (!approved) {
    if (!options.json) output.write("No files written. Re-run with --yes for non-interactive initialization.\n");
    return input.isTTY ? 0 : 2;
  }

  const result = await applyPlan(cwd, plan);
  if (options.gitExclude) {
    const excludeResult = await applyGitExclude(cwd);
    if (!options.json) {
      if (excludeResult.ok) output.write("Applied local exclusions to .git/info/exclude.\n");
      else output.write("Notice: .git directory not found; skipped .git/info/exclude.\n");
    }
  }
  if (!options.json) output.write(`Initialization complete. Created ${result.created.length} file(s).\n`);
  return 0;
}

async function readExistingRuntimes(cwd) {
  try {
    const lock = JSON.parse(await readFile(path.join(cwd, "scaffold.lock"), "utf8"));
    if (Array.isArray(lock.runtimes)) return lock.runtimes;
  } catch {}
  return null;
}

async function runUpdate(options) {
  const cwd = path.resolve(options.cwd);
  let runtimes;
  if (options.runtime !== "auto") {
    const selection = parseRuntimeSelection(options.runtime);
    runtimes = selection.runtimes;
  } else {
    const existing = await readExistingRuntimes(cwd);
    if (existing !== null) {
      runtimes = existing;
    } else {
      const detected = await detectRuntimes(cwd);
      runtimes = detected.map((item) => item.id);
    }
  }

  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes });
  const inspection = await inspectUpdate(cwd, plan);
  const excludeState = await inspectGitExclude(cwd);
  const shouldGitExclude = options.gitExclude || excludeState.active;

  if (options.json) {
    output.write(`${JSON.stringify({ cwd, runtimes, gitExclude: shouldGitExclude, ...inspection }, null, 2)}\n`);
  } else {
    printUpdatePlan({ cwd, runtimes, inspection, gitExclude: shouldGitExclude });
  }

  if (options.dryRun) return 0;

  let approved = options.yes;
  if (!approved && input.isTTY && output.isTTY) approved = await confirm("Apply this kernel update?");
  if (!approved) {
    if (!options.json) output.write("No files written. Re-run with --yes for non-interactive update.\n");
    return input.isTTY ? 0 : 2;
  }

  const result = await applyUpdate(cwd, plan);
  if (shouldGitExclude) {
    const excludeResult = await applyGitExclude(cwd);
    if (!options.json) {
      if (excludeResult.ok) output.write("Refreshed local exclusions in .git/info/exclude.\n");
      else output.write("Notice: .git directory not found; skipped .git/info/exclude.\n");
    }
  }
  if (!options.json) {
    output.write(`Kernel update complete. Updated ${result.updated.length}, created ${result.created.length}, preserved ${result.preserved.length} file(s).\n`);
  }
  return 0;
}

async function excludeCommand(options) {
  const cwd = path.resolve(options.cwd);
  if (options.remove) {
    const result = await removeGitExclude(cwd);
    if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
    else {
      if (result.ok) output.write("Removed managed exclusions from .git/info/exclude.\n");
      else output.write("Notice: .git directory not found.\n");
    }
    return result.ok ? 0 : 1;
  }

  if (options.list) {
    const result = await inspectGitExclude(cwd);
    if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
    else {
      output.write(`Target: ${cwd}\n`);
      output.write(`Active: ${result.active ? "yes" : "no"}\n`);
      output.write(`Excluded patterns: ${result.patterns.length}\n`);
      for (const pattern of result.patterns) output.write(`  - ${pattern}\n`);
    }
    return result.ok ? 0 : 1;
  }

  const result = await applyGitExclude(cwd);
  if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
  else {
    if (result.ok) output.write(`Applied ${result.patterns.length} local exclusions to .git/info/exclude.\n`);
    else output.write("Notice: .git directory not found.\n");
  }
  return result.ok ? 0 : 1;
}

async function doctorCommand(options) {
  const cwd = path.resolve(options.cwd);
  const result = await runDoctor(cwd);
  if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
  else {
    output.write(`Target: ${cwd}\n`);
    output.write(`Adapters: ${result.runtimes.length > 0 ? result.runtimes.join(", ") : "none"}\n`);
    output.write(`Missing: ${result.missing.length}; divergent: ${result.divergent.length}\n`);
    for (const missing of result.missing) output.write(`  missing: ${missing}\n`);
    for (const divergent of result.divergent) output.write(`  divergent: ${divergent}\n`);
    output.write(result.ok ? "Status: healthy\n" : "Status: unhealthy\n");
  }
  return result.ok ? 0 : 1;
}

async function knowledgeCommand(options) {
  const cwd = path.resolve(options.cwd);
  const result = await lintKnowledge(cwd);
  if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
  else {
    output.write(`Knowledge pages checked: ${result.checkedPages}\n`);
    output.write(`Broken links: ${result.brokenLinks.length}; uncatalogued pages: ${result.uncataloguedPages.length}; uncited facts: ${result.uncitedFacts.length}\n`);
    for (const item of result.brokenLinks) output.write(`  broken: ${item.file} -> ${item.href}\n`);
    for (const item of result.uncataloguedPages) output.write(`  uncatalogued: ${item}\n`);
    for (const item of result.uncitedFacts) output.write(`  uncited fact: ${item.file}:${item.line}\n`);
    output.write(result.ok ? "Status: healthy\n" : "Status: unhealthy\n");
  }
  return result.ok ? 0 : 1;
}

async function artifactCommand(options) {
  const cwd = path.resolve(options.cwd);
  const created = await createGovernedArtifact(cwd, options.command, options);
  const relative = path.relative(cwd, created).split(path.sep).join("/");
  const status = options.command === "adr" ? "Proposed" : options.command === "prd" ? "Draft" : "PENDING";
  if (options.json) output.write(`${JSON.stringify({ cwd, created: relative, status }, null, 2)}\n`);
  else {
    output.write(`Created ${relative}.\n`);
    if (options.command === "adr") output.write("Status: Proposed. Implementation remains blocked until explicit human acceptance.\n");
    else if (options.command === "prd") output.write("Status: Draft. Complete discovery and obtain human approval for important decisions.\n");
    else output.write("Status: PENDING. The target directive has not been modified.\n");
  }
  return 0;
}

export async function runCli(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help || options.command === "help") {
      output.write(helpText());
      return 0;
    }
    if (options.command === "init") return await runInit(options);
    if (options.command === "update") return await runUpdate(options);
    if (options.command === "exclude") return await excludeCommand(options);
    if (options.command === "doctor") return await doctorCommand(options);
    if (options.command === "knowledge") return await knowledgeCommand(options);
    return await artifactCommand(options);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 1;
  }
}


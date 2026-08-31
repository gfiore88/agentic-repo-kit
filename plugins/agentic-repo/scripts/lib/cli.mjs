import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs, parseRuntimeSelection } from "./args.mjs";
import { RUNTIME_CATALOG, runtimeIds } from "./catalog.mjs";
import { detectRuntimes } from "./detect.mjs";
import { buildPlan } from "./plan.mjs";
import { applyPlan, inspectPlan } from "./writer.mjs";
import { runDoctor } from "./doctor.mjs";
import { createGovernedArtifact } from "./artifacts.mjs";
import { lintKnowledge } from "./knowledge.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(moduleDir, "../../assets");
const skillsRoot = path.resolve(moduleDir, "../../skills");

function helpText() {
  return `Agentic Repository Kernel\n\nUsage:\n  agentic-repo init [options]\n  agentic-repo doctor [options]\n  agentic-repo knowledge lint [options]\n  agentic-repo adr new --title <title> [options]\n  agentic-repo prd new --title <title> [options]\n  agentic-repo anneal new --title <title> --target <file> [options]\n\nOptions:\n  --runtime <ids|auto|none>  Override runtime selection (default: auto)\n  --cwd <path>               Target repository (default: current directory)\n  --yes, -y                  Confirm writes non-interactively\n  --dry-run                  Show the plan without writing\n  --json                     Emit machine-readable output\n  --title <text>             Governed artifact title\n  --target <path>            Canonical directive targeted by annealing\n  --help, -h                 Show help\n\nRuntime IDs:\n  ${runtimeIds().join(", ")}\n`;
}

function printPlan({ cwd, runtimes, detected, inspection, detectionMode }) {
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
  output.write(`Create: ${inspection.created.length}, unchanged: ${inspection.skipped.length}, conflicts: ${inspection.conflicts.length}\n`);
  for (const conflict of inspection.conflicts) output.write(`  conflict: ${conflict}\n`);
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
    output.write(`${JSON.stringify({ cwd, detected, runtimes, ...inspection }, null, 2)}\n`);
  } else printPlan({ cwd, runtimes, detected, inspection, detectionMode: selection.mode });

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
  if (!options.json) output.write(`Initialization complete. Created ${result.created.length} file(s).\n`);
  return 0;
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
    if (options.command === "doctor") return await doctorCommand(options);
    if (options.command === "knowledge") return await knowledgeCommand(options);
    return await artifactCommand(options);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 1;
  }
}

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs, parseRuntimeSelection } from "./args.mjs";
import { RUNTIME_CATALOG, runtimeIds } from "./catalog.mjs";
import { detectRuntimes } from "./detect.mjs";
import { blueprintLowRiskPolicy, buildPlan, sha256 } from "./plan.mjs";
import { applyPlan, applyUpdate, enableLowRiskTier, inspectLowRiskOptIn, inspectPlan, inspectUpdate } from "./writer.mjs";
import { describeLockProblem, findKernelMarkers, inspectScaffoldLock, readScaffoldYaml } from "./lock.mjs";
import { runDoctor } from "./doctor.mjs";
import { verifyGovernance } from "./verify.mjs";
import { createGovernedArtifact, recordAdrReview } from "./artifacts.mjs";
import { lintKnowledge } from "./knowledge.mjs";
import { collectStatus, formatStatus } from "./status.mjs";
import { applyGitExclude, inspectGitExclude, removeGitExclude } from "./exclude.mjs";
import { installGitHooks, uninstallGitHooks } from "./hooks.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(moduleDir, "../../assets");
const skillsRoot = path.resolve(moduleDir, "../../skills");

function helpText() {
  return `Agentic Repository Kernel

Usage:
  agentic-repo init [options]
  agentic-repo update [options]
  agentic-repo doctor [options]
  agentic-repo status [--limit <n>] [options]
  agentic-repo verify [--changed <paths>] [--adr <ids>] [--routine] [--lines <n|count:path,...>] [--require-reviews] [options]
  agentic-repo exclude [options]
  agentic-repo knowledge lint [options]
  agentic-repo adr new --title <title> [--tier low-risk] [options]
  agentic-repo adr review --adr <id> --decision <approved|rejected> --by <name> --quote <text> [options]
  agentic-repo prd new --title <title> [options]
  agentic-repo anneal new --title <title> --target <file> [options]

The bare "agentic-repo" command requires a global install (npm i -g agentic-repo-kit).
Otherwise run every command as "npx agentic-repo-kit <command>", for example
"npx agentic-repo-kit status".

Options:
  --runtime <ids|auto|none>  Override runtime selection (default: auto)
  --profile <full|core>      Skill profile: every bundled skill or the governance kernel only (default full)
  --force                    update: overwrite kernel files you modified (default: stop and report)
  --adopt                    update: adopt a kernel whose scaffold.lock is lost (differing kernel files are conflicts)
  --git-exclude, --exclude   Add generated paths to .git/info/exclude
  --remove                   Remove managed excludes from .git/info/exclude
  --list                     List active local exclusions
  --cwd <path>               Target repository (default: current directory)
  --yes, -y                  Confirm writes non-interactively
  --dry-run                  Show the plan without writing
  --json                     Emit machine-readable output
  --title <text>             Governed artifact title
  --target <path>            Canonical directive targeted by annealing
  --changed <paths>          Comma-separated changed paths for the ADR gate
  --adr <ids>                Comma-separated ADR references (e.g. ADR-0013) governing the change
  --routine                  verify: declare routine work (paths must match docs/adr/gate.json "routine"; log entry required)
  --limit <n>                status: number of latest log entries to show (default 5)
  --lines <n|count:path,...> verify: changed line counts for the low-risk tier (a total, or numstat-derived counts per path)
  --require-reviews          verify: low-risk tier ADRs in the change set must have an approved human review
  --enable-low-risk          update: add the default low-risk tier policy to docs/adr/gate.json (explicit opt-in)
  --tier low-risk            adr new: accept the ADR through the low-risk tier in docs/adr/gate.json (review pending)
  --decision <decision>      adr review: approved or rejected (rejected also rejects the ADR)
  --by <name>                adr review: the human reviewer
  --quote <text>             adr review: the reviewer's own words, naming the task or ADR
  --enforce <mode>           Enforcement projection: ci, hooks, or none (default none)
  --help, -h                 Show help

Runtime IDs:
  ${runtimeIds().join(", ")}
`;
}

function printPlan({ cwd, runtimes, detected, inspection, detectionMode, gitExclude, enforce, profile }) {
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
  output.write(`Skill profile: ${profile}\n`);
  if (gitExclude) output.write("Local git exclude: enabled (.git/info/exclude)\n");
  output.write(`Enforcement: ${enforce}\n`);
  output.write(`Create: ${inspection.created.length}, unchanged: ${inspection.skipped.length}, conflicts: ${inspection.conflicts.length}\n`);
  for (const conflict of inspection.conflicts) output.write(`  conflict: ${conflict}\n`);
}

const LOW_RISK_PLAN = {
  enabled: "enabled (docs/adr/gate.json)",
  disabled: "disabled; add the default policy with --enable-low-risk",
  "will-enable": "will be enabled with the default policy (docs/adr/gate.json)",
  invalid: "unknown; docs/adr/gate.json is not valid JSON",
};

function printUpdatePlan({ cwd, runtimes, inspection, gitExclude, enforce, profile, lowRiskTier, adopting }) {
  output.write(`Target: ${cwd}\n`);
  if (adopting) output.write("Adoption: no scaffold.lock, so every existing kernel file that differs from this version is a conflict\n");
  output.write(`Selected adapters: ${runtimes.length > 0 ? runtimes.join(", ") : "none"}\n`);
  output.write(`Skill profile: ${profile}\n`);
  if (gitExclude) output.write("Local git exclude: enabled (.git/info/exclude)\n");
  output.write(`Enforcement: ${enforce}\n`);
  output.write(`Low-risk tier: ${LOW_RISK_PLAN[lowRiskTier]}\n`);
  output.write(`Update: ${inspection.updated.length}, create: ${inspection.created.length}, remove: ${inspection.removed.length}, unchanged: ${inspection.unchanged.length}, preserved: ${inspection.preserved.length}, conflicts: ${inspection.conflicts.length}\n`);
  for (const item of inspection.updated) output.write(`  update: ${item}\n`);
  for (const item of inspection.created) output.write(`  create: ${item}\n`);
  for (const item of inspection.removed) output.write(`  remove (no longer managed): ${item}\n`);
  for (const item of inspection.keptOrphans) output.write(`  keep (no longer managed, modified by you): ${item}\n`);
  for (const item of inspection.preserved) output.write(`  preserve (user): ${item}\n`);
  for (const item of inspection.conflicts) output.write(`  conflict (${adopting ? "differs from this version" : "modified by you"}): ${item}\n`);
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
  const enforce = options.enforce ?? "none";
  const profile = options.profile ?? "full";
  const selection = parseRuntimeSelection(options.runtime);
  const detected = selection.mode === "auto" ? await detectRuntimes(cwd) : [];
  const runtimes = selection.mode === "auto" ? detected.map((item) => item.id) : selection.runtimes;
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes, enforce, profile });
  const inspection = await inspectPlan(cwd, plan);

  if (options.json) {
    output.write(`${JSON.stringify({ cwd, detected, runtimes, profile, enforcement: enforce, gitExclude: options.gitExclude, ...inspection }, null, 2)}\n`);
  } else printPlan({ cwd, runtimes, detected, inspection, detectionMode: selection.mode, gitExclude: options.gitExclude, enforce, profile });

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
  await applyHookEnforcement(cwd, enforce, options);
  if (!options.json) output.write(`Initialization complete. Created ${result.created.length} file(s).\n`);
  return 0;
}

async function applyHookEnforcement(cwd, enforce, options) {
  if (enforce === "hooks") {
    const result = await installGitHooks(cwd);
    if (!options.json) {
      if (result.ok) output.write(`Installed local governance hooks via core.hooksPath (${result.hooksPath}).\n`);
      else output.write("Notice: .git directory not found; skipped hook installation.\n");
    }
    return;
  }
  const result = await uninstallGitHooks(cwd);
  if (result.ok && result.removed && !options.json) {
    output.write("Reset core.hooksPath: local governance hooks disabled.\n");
  }
}

async function runUpdate(options) {
  const cwd = path.resolve(options.cwd);
  const adopting = options.adopt;
  const lockInspection = await inspectScaffoldLock(cwd);
  if (adopting && lockInspection.state === "ok") {
    process.stderr.write("Error: this repository already has scaffold.lock; run update without --adopt.\n");
    return 1;
  }
  const configuration = await readScaffoldYaml(cwd);
  if (lockInspection.state !== "ok" && !(adopting && lockInspection.state === "missing")) {
    const markers = lockInspection.state === "missing" ? await findKernelMarkers(cwd) : [];
    const { problem, hint } = describeLockProblem(lockInspection, markers, { configured: Boolean(configuration) });
    process.stderr.write(`Error: ${problem}.${adopting ? " --adopt never replaces an existing lock." : ""} ${hint}\n`);
    return 1;
  }

  const previousLock = lockInspection.lock;
  let runtimes;
  if (options.runtime !== "auto") runtimes = parseRuntimeSelection(options.runtime).runtimes;
  else if (adopting) {
    if (!configuration) {
      process.stderr.write("Error: update --adopt needs the runtimes of this repository, and no scaffold.yaml lists them. Pass --runtime <ids|none>: auto-detection is unreliable here, because the kernel's .agents/agents/ and .agents/rules/ match the Antigravity markers.\n");
      return 1;
    }
    runtimes = configuration.runtimes;
  } else {
    runtimes = Array.isArray(previousLock.runtimes) ? previousLock.runtimes : (await detectRuntimes(cwd)).map((item) => item.id);
  }
  const recorded = adopting ? configuration ?? {} : previousLock;
  const enforce = options.enforce ?? (typeof recorded.enforcement === "string" ? recorded.enforcement : "none");
  const profile = options.profile ?? (typeof recorded.profile === "string" ? recorded.profile : "full");
  // Without a lock nothing proves that the kit wrote an existing kernel file, so
  // adoption compares against an empty baseline. scaffold.yaml, read above as the
  // configuration source, is regenerated instead of reported as a conflict.
  const baseline = adopting
    ? { managedFiles: configuration ? [{ path: "scaffold.yaml", sha256: sha256(configuration.content) }] : [] }
    : previousLock;

  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes, enforce, profile, lowRisk: options.enableLowRisk });
  const inspection = await inspectUpdate(cwd, plan, { previousLock: baseline, force: options.force });
  const lowRiskTier = await inspectLowRiskOptIn(cwd, options.enableLowRisk);
  const excludeState = await inspectGitExclude(cwd);
  const shouldGitExclude = options.gitExclude || excludeState.active || excludeState.legacy;

  if (options.json) {
    output.write(`${JSON.stringify({ cwd, adopt: adopting, runtimes, profile, enforcement: enforce, gitExclude: shouldGitExclude, lowRiskTier, ...inspection }, null, 2)}\n`);
  } else {
    printUpdatePlan({ cwd, runtimes, inspection, gitExclude: shouldGitExclude, enforce, profile, lowRiskTier, adopting });
  }

  if (options.enableLowRisk && lowRiskTier === "invalid") {
    process.stderr.write("Error: docs/adr/gate.json is not valid JSON; fix it before running update --enable-low-risk. No files written.\n");
    return 1;
  }

  if (inspection.conflicts.length > 0) {
    if (!options.json) {
      output.write(adopting
        ? "No files written: without scaffold.lock the kit cannot tell its older files from your edits, so every kernel file that differs from this version is a conflict. Back up the files you customized, then re-run with --force to overwrite them.\n"
        : "No files written: you modified the kernel files listed as conflicts. Move your changes into project files, or re-run with --force to overwrite them.\n");
    }
    return 1;
  }
  if (options.dryRun) return 0;

  let approved = options.yes;
  if (!approved && input.isTTY && output.isTTY) approved = await confirm(adopting ? "Adopt the kernel and apply this update?" : "Apply this kernel update?");
  if (!approved) {
    if (!options.json) output.write("No files written. Re-run with --yes for non-interactive update.\n");
    return input.isTTY ? 0 : 2;
  }

  const result = await applyUpdate(cwd, plan, { previousLock: baseline, force: options.force });
  if (lowRiskTier === "will-enable") {
    await enableLowRiskTier(cwd, await blueprintLowRiskPolicy(assetsRoot));
    if (!options.json) output.write("Enabled the low-risk tier in docs/adr/gate.json.\n");
  }
  if (shouldGitExclude) {
    const excludeResult = await applyGitExclude(cwd);
    if (!options.json) {
      if (excludeResult.ok) output.write("Refreshed local exclusions in .git/info/exclude.\n");
      else output.write("Notice: .git directory not found; skipped .git/info/exclude.\n");
    }
  }
  await applyHookEnforcement(cwd, enforce, options);
  if (!options.json) {
    output.write(`${adopting ? "Kernel adoption" : "Kernel update"} complete. Updated ${result.updated.length}, created ${result.created.length}, removed ${result.removed.length}, preserved ${result.preserved.length} file(s).\n`);
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
      if (result.legacy) output.write("Notice: an earlier version wrote exclusions to this linked worktree's own info/exclude, which Git ignores. Run `npx agentic-repo-kit exclude` or `update` to move them.\n");
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
    if (result.untracked.length > 0) {
      const sample = result.untracked.slice(0, 3).join(", ");
      output.write(`Untracked: ${result.untracked.length} kernel file(s) are neither committed nor excluded (${sample}${result.untracked.length > 3 ? ", ..." : ""})\n`);
      output.write("Next step: commit them, or run `npx agentic-repo-kit exclude` if they must stay out of Git (for example in a client repository).\n");
    } else if (result.lockState === "ok" && !result.trackingChecked) output.write("Git tracking: not checked (no readable Git index)\n");
    if (result.error) output.write(`Lock: ${result.error}\n`);
    if (result.hint) output.write(`Next step: ${result.hint}\n`);
    output.write(result.ok ? "Status: healthy\n" : "Status: unhealthy\n");
  }
  return result.ok ? 0 : 1;
}

async function statusCommand(options) {
  const cwd = path.resolve(options.cwd);
  const result = await collectStatus(cwd, { limit: options.limit ?? 5 });
  if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
  else output.write(formatStatus(cwd, result));
  return 0;
}

async function verifyCommand(options) {
  const cwd = path.resolve(options.cwd);
  const changedFiles = options.changed === null
    ? null
    : options.changed.split(",").map((entry) => entry.trim()).filter(Boolean);
  const adrReferences = options.adr === null
    ? []
    : options.adr.split(",").map((entry) => entry.trim()).filter(Boolean);
  const result = await verifyGovernance(cwd, {
    changedFiles, adrReferences, routine: options.routine, lines: options.lines, requireReviews: options.requireReviews,
  });
  if (options.json) output.write(`${JSON.stringify({ cwd, ...result }, null, 2)}\n`);
  else {
    output.write(`Target: ${cwd}\n`);
    output.write(`ADR gate: ${result.adrGateApplied ? (result.routine ? "applied (routine tier)" : "applied") : "skipped (pass --changed to enable)"}\n`);
    for (const reference of result.adrReferences) output.write(`ADR reference: ${reference.reference} -> ${reference.status ?? reference.detail}\n`);
    if (result.lowRiskAdrs.length > 0) {
      output.write(`Low-risk tier: ${result.lowRiskAdrs.join(", ")}${result.reviewsRequired ? " (reviews required)" : ""}\n`);
    }
    output.write(`Violations: ${result.violations.length}\n`);
    for (const violation of result.violations) output.write(`  ${violation.kind}: ${violation.detail}\n`);
    output.write(result.ok ? "Status: compliant\n" : "Status: non-compliant\n");
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
    output.write(`Orphan pages: ${result.orphanPages.length}; uncovered raw sources: ${result.uncoveredSources.length}; malformed log entries: ${result.malformedLogEntries.length}\n`);
    output.write(`Frontmatter issues: ${result.frontmatterIssues.length}\n`);
    for (const item of result.brokenLinks) output.write(`  broken: ${item.file} -> ${item.href}\n`);
    for (const item of result.uncataloguedPages) output.write(`  uncatalogued: ${item}\n`);
    for (const item of result.uncitedFacts) output.write(`  uncited fact: ${item.file}:${item.line}\n`);
    for (const item of result.orphanPages) output.write(`  orphan: ${item}\n`);
    for (const item of result.uncoveredSources) output.write(`  uncovered source: ${item}\n`);
    for (const item of result.malformedLogEntries) output.write(`  malformed log: ${item.file}:${item.line}\n`);
    for (const item of result.frontmatterIssues) output.write(`  frontmatter: ${item.file} -> ${item.issue}\n`);
    output.write(result.ok ? "Status: healthy\n" : "Status: unhealthy\n");
  }
  return result.ok ? 0 : 1;
}

async function reviewCommand(options) {
  const cwd = path.resolve(options.cwd);
  const result = await recordAdrReview(cwd, options);
  const relative = path.relative(cwd, result.file).split(path.sep).join("/");
  if (options.json) output.write(`${JSON.stringify({ cwd, adr: result.id, path: relative, review: result.review, status: result.status }, null, 2)}\n`);
  else {
    output.write(`Recorded ${result.review} review for ${result.id} (${relative}).\n`);
    if (result.review === "rejected") output.write("Status: Rejected. Revert the change unless the reviewer asked to fix it forward with a follow-up ADR.\n");
  }
  return 0;
}

async function artifactCommand(options) {
  const cwd = path.resolve(options.cwd);
  if (options.command === "adr" && options.subcommand === "review") return reviewCommand(options);
  if (options.tier && options.command !== "adr") throw new Error("--tier applies only to adr new");
  const created = await createGovernedArtifact(cwd, options.command, options);
  const relative = path.relative(cwd, created).split(path.sep).join("/");
  const lowRisk = options.command === "adr" && options.tier === "low-risk";
  const status = options.command === "adr" ? (lowRisk ? "Accepted" : "Proposed") : options.command === "prd" ? "Draft" : "PENDING";
  if (options.json) {
    output.write(`${JSON.stringify({ cwd, created: relative, status, ...(lowRisk ? { tier: "low-risk", review: "pending" } : {}) }, null, 2)}\n`);
  } else {
    output.write(`Created ${relative}.\n`);
    if (lowRisk) output.write("Status: Accepted by the low-risk tier; human review pending. Implement now, fill in the eligibility section, and record the review before merging to the default branch.\n");
    else if (options.command === "adr") output.write("Status: Proposed. Implementation remains blocked until explicit human acceptance.\n");
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
    if (options.command === "status") return await statusCommand(options);
    if (options.command === "verify") return await verifyCommand(options);
    if (options.command === "knowledge") return await knowledgeCommand(options);
    return await artifactCommand(options);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 1;
  }
}


import { normalizeRuntimeId, PROFILES, RUNTIME_CATALOG } from "./catalog.mjs";

function takeValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const args = [...argv];
  let command = args[0] && !args[0].startsWith("-") ? args.shift() : "help";
  if (command === "upgrade") command = "update";
  const subcommand = ["knowledge", "adr", "prd", "anneal"].includes(command)
    && args[0] && !args[0].startsWith("-") ? args.shift() : null;
  const options = {
    command,
    subcommand,
    cwd: process.cwd(),
    runtime: "auto",
    title: null,
    target: null,
    changed: null,
    enforce: null,
    profile: null,
    adr: null,
    limit: null,
    lines: null,
    tier: null,
    decision: null,
    by: null,
    quote: null,
    force: false,
    routine: false,
    requireReviews: false,
    enableLowRisk: false,
    adopt: false,
    strict: false,
    gitExclude: false,
    remove: false,
    list: false,
    yes: false,
    dryRun: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--git-exclude" || arg === "--exclude" || arg === "-e") options.gitExclude = true;
    else if (arg === "--remove") options.remove = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--routine") options.routine = true;
    else if (arg === "--require-reviews") options.requireReviews = true;
    else if (arg === "--enable-low-risk") options.enableLowRisk = true;
    else if (arg === "--adopt") options.adopt = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--cwd") {
      options.cwd = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--cwd=")) options.cwd = arg.slice(6);
    else if (arg === "--runtime") {
      options.runtime = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--runtime=")) options.runtime = arg.slice(10);
    else if (arg === "--title") {
      options.title = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--title=")) options.title = arg.slice(8);
    else if (arg === "--target") {
      options.target = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--target=")) options.target = arg.slice(9);
    else if (arg === "--changed") {
      options.changed = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--changed=")) options.changed = arg.slice(10);
    else if (arg === "--enforce") {
      options.enforce = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--enforce=")) options.enforce = arg.slice(10);
    else if (arg === "--profile") {
      options.profile = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--profile=")) options.profile = arg.slice(10);
    else if (arg === "--adr") {
      options.adr = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--adr=")) options.adr = arg.slice(6);
    else if (arg === "--limit") {
      options.limit = takeValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--limit=")) options.limit = arg.slice(8);
    else if (["--lines", "--tier", "--decision", "--by", "--quote"].includes(arg)) {
      options[arg.slice(2)] = takeValue(args, index, arg);
      index += 1;
    } else if (/^--(?:lines|tier|decision|by|quote)=/.test(arg)) {
      const separator = arg.indexOf("=");
      options[arg.slice(2, separator)] = arg.slice(separator + 1);
    }
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!["init", "update", "doctor", "status", "knowledge", "verify", "adr", "prd", "anneal", "exclude", "help"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }
  const allowedSubcommands = { knowledge: ["lint"], adr: ["new", "review"], prd: ["new"], anneal: ["new"] };
  if (allowedSubcommands[command] && !allowedSubcommands[command].includes(subcommand)) {
    throw new Error(`${command} requires subcommand: ${allowedSubcommands[command].join(" or ")}`);
  }

  if (options.enforce !== null && !["ci", "hooks", "none"].includes(options.enforce)) {
    throw new Error(`Unknown enforcement mode: ${options.enforce} (use ci, hooks, or none)`);
  }

  if (options.profile !== null && !PROFILES.includes(options.profile)) {
    throw new Error(`Unknown profile: ${options.profile} (use ${PROFILES.join(" or ")})`);
  }

  if (options.enableLowRisk && options.command !== "update") {
    throw new Error("--enable-low-risk applies only to update");
  }
  if (options.adopt && options.command !== "update") {
    throw new Error("--adopt applies only to update");
  }
  if (options.strict && options.command !== "doctor") {
    throw new Error("--strict applies only to doctor");
  }
  if (options.tier !== null && options.tier !== "low-risk") {
    throw new Error(`Unknown tier: ${options.tier} (use low-risk)`);
  }
  if (options.decision !== null && !["approved", "rejected"].includes(options.decision)) {
    throw new Error(`Unknown review decision: ${options.decision} (use approved or rejected)`);
  }

  if (options.limit !== null) {
    if (!/^\d+$/.test(options.limit)) throw new Error(`--limit must be a non-negative integer: ${options.limit}`);
    options.limit = Number(options.limit);
  }

  return options;
}

export function parseRuntimeSelection(spec) {
  const value = spec.trim().toLowerCase();
  if (value === "auto") return { mode: "auto", runtimes: [] };
  if (value === "none" || value === "") return { mode: "explicit", runtimes: [] };

  const runtimes = [...new Set(value.split(",").map(normalizeRuntimeId))];
  const unknown = runtimes.filter((runtime) => !RUNTIME_CATALOG[runtime]);
  if (unknown.length > 0) {
    throw new Error(`Unknown runtime${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`);
  }
  return { mode: "explicit", runtimes };
}

import { normalizeRuntimeId, RUNTIME_CATALOG } from "./catalog.mjs";

function takeValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift() : "help";
  const subcommand = ["knowledge", "adr", "prd", "anneal"].includes(command)
    && args[0] && !args[0].startsWith("-") ? args.shift() : null;
  const options = {
    command,
    subcommand,
    cwd: process.cwd(),
    runtime: "auto",
    title: null,
    target: null,
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
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!["init", "doctor", "knowledge", "adr", "prd", "anneal", "exclude", "help"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }
  const allowedSubcommands = { knowledge: "lint", adr: "new", prd: "new", anneal: "new" };
  if (allowedSubcommands[command] && subcommand !== allowedSubcommands[command]) {
    throw new Error(`${command} requires subcommand: ${allowedSubcommands[command]}`);
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

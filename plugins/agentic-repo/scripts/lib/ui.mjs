import os from "node:os";
import path from "node:path";

// Branded terminal layout for init, update, and help (ADR-0032). The module only
// builds strings; the CLI decides where to write them.

const ESC = "\u001b[";
const NAME = "AGENTIC REPO KIT";
const TAGLINE = "governed, knowledge-first kernel for AI coding agents";
const LABEL_WIDTH = 13;

// Two-row block letters: each character cell stacks two pixels drawn with ▀, ▄, and █.
const GLYPHS = {
  A: ["▄▀█", "█▀█"], C: ["█▀▀", "█▄▄"], E: ["█▀▀", "██▄"], G: ["█▀▀", "█▄█"],
  I: ["█", "█"], K: ["█▄▀", "█ █"], N: ["█▄ █", "█ ▀█"], O: ["█▀█", "█▄█"],
  P: ["█▀█", "█▀▀"], R: ["█▀█", "█▀▄"], T: ["▀█▀", " █ "], " ": [" ", " "],
};
const WORDMARK = [0, 1].map((row) => [...NAME].map((char) => GLYPHS[char][row]).join(" ").trimEnd());
const WORDMARK_WIDTH = Math.max(...WORDMARK.map((row) => row.length));

// The "electric" palette: amber, orange, and rose, after the README's ⚡ mark.
const GRADIENT = [[251, 191, 36], [249, 115, 22], [244, 63, 94]];

const SYMBOLS = {
  unicode: { success: "✔", warning: "⚠", error: "✖", info: "·", arrow: "→", dot: "·", mark: "⚡" },
  ascii: { success: "+", warning: "!", error: "x", info: "-", arrow: ">", dot: "-", mark: "" },
};

const UPDATE_ROWS = [
  ["updated", "update", "green"],
  ["created", "create", "green"],
  ["merged", "merge", "cyan", "your changes kept, kit changes applied"],
  ["retained", "keep", "dim", "your changes, no kit changes"],
  ["removed", "remove", "yellow", "no longer managed"],
  ["keptOrphans", "keep", "dim", "no longer managed, modified by you"],
  ["preserved", "preserve", "dim", "user"],
  ["conflicted", "conflict", "yellow", "conflict markers: your edits and the kit's overlap"],
];

export function isInteractive(stream, { json = false, env = process.env } = {}) {
  return !json && stream?.isTTY === true && env.TERM !== "dumb" && env.CI === undefined;
}

function supportsUnicode(env, platform) {
  if (platform !== "win32") return env.TERM !== "linux";
  return Boolean(env.WT_SESSION)
    || env.TERM_PROGRAM === "vscode"
    || env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
    || ["xterm-256color", "alacritty", "rxvt-unicode", "rxvt-unicode-256color"].includes(env.TERM);
}

// Nearest level of the xterm 6x6x6 color cube (0, 95, 135, 175, 215, 255).
function cubeIndex(value) {
  if (value < 48) return 0;
  if (value < 115) return 1;
  return Math.floor((value - 35) / 40);
}

function foreground([red, green, blue], depth) {
  if (depth >= 24) return `${ESC}38;2;${red};${green};${blue}m`;
  if (depth >= 8) return `${ESC}38;5;${16 + 36 * cubeIndex(red) + 6 * cubeIndex(green) + cubeIndex(blue)}m`;
  return `${ESC}33m`;
}

function mix(stops, position) {
  const scaled = position * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const weight = scaled - index;
  return stops[index].map((channel, offset) => Math.round(channel + (stops[index + 1][offset] - channel) * weight));
}

export function createUi(stream, { json = false, env = process.env, platform = process.platform } = {}) {
  const rich = isInteractive(stream, { json, env });
  const depth = rich && typeof stream.getColorDepth === "function" ? stream.getColorDepth(env) : 1;
  const color = depth >= 4;
  const unicode = supportsUnicode(env, platform);
  const columns = Number.isInteger(stream?.columns) && stream.columns > 0 ? stream.columns : 80;
  const symbols = unicode ? SYMBOLS.unicode : SYMBOLS.ascii;
  const wrap = (open, close) => (text) => (color ? `${ESC}${open}m${text}${ESC}${close}m` : `${text}`);
  const style = {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    cyan: wrap(36, 39),
    accent: (text) => (color ? `${foreground(GRADIENT[0], depth)}${text}${ESC}39m` : `${text}`),
  };
  const marks = {
    success: style.green(symbols.success),
    warning: style.yellow(symbols.warning),
    error: style.red(symbols.error),
    info: style.dim(symbols.info),
  };
  return {
    rich,
    depth,
    unicode,
    columns,
    symbols,
    style,
    // Plain output keeps the exact message; the rich layout prefixes a symbol.
    line(kind, text, richText = text) {
      return rich ? `  ${marks[kind]} ${richText}\n` : `${text}\n`;
    },
  };
}

export function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function paintWordmark(depth, row) {
  if (depth < 4) return row;
  if (depth < 8) return `${ESC}1m${ESC}33m${row}${ESC}39m${ESC}22m`;
  let painted = "";
  let previous = "";
  [...row].forEach((char, column) => {
    if (char !== " ") {
      const code = foreground(mix(GRADIENT, column / (WORDMARK_WIDTH - 1)), depth);
      if (code !== previous) painted += code;
      previous = code;
    }
    painted += char;
  });
  return `${ESC}1m${painted}${ESC}39m${ESC}22m`;
}

export function renderHeader(ui, version) {
  const { style, symbols } = ui;
  const about = [
    symbols.mark && style.accent(symbols.mark),
    version && style.bold(`v${version}`),
    style.dim(version ? `${symbols.dot} ${TAGLINE}` : TAGLINE),
  ].filter(Boolean).join(" ");
  if (!ui.unicode || ui.columns < WORDMARK_WIDTH + 4) return `\n  ${style.bold(style.accent(NAME))}\n  ${about}\n\n`;
  return `\n${WORDMARK.map((row) => `  ${paintWordmark(ui.depth, row)}\n`).join("")}  ${about}\n\n`;
}

function field(ui, label, value) {
  return `  ${ui.style.dim(label.padEnd(LABEL_WIDTH))} ${value}\n`;
}

function tally(ui, color, count, label) {
  return count > 0 ? color(`${count} ${label}`) : ui.style.dim(`${count} ${label}`);
}

function displayPath(cwd) {
  const home = os.homedir();
  return home && (cwd === home || cwd.startsWith(`${home}${path.sep}`)) ? `~${cwd.slice(home.length)}` : cwd;
}

function settings(ui, { runtimes, profile, enforce, gitExclude }) {
  return field(ui, "Adapters", runtimes.length > 0 ? runtimes.join(", ") : ui.style.dim("none"))
    + field(ui, "Profile", profile)
    + (gitExclude ? field(ui, "Git exclude", ".git/info/exclude") : "")
    + field(ui, "Enforcement", enforce);
}

export function renderInitPlan(ui, { cwd, version, detected, detectionMode, runtimes, profile, enforce, gitExclude, inspection }) {
  const { style, symbols } = ui;
  let text = renderHeader(ui, version) + field(ui, "Target", style.bold(displayPath(cwd)));
  if (detected.length === 0) {
    text += field(ui, "Runtimes", style.dim(detectionMode === "auto" ? "none detected; universal kernel only" : "detection skipped; the selection is explicit"));
  }
  detected.forEach(({ name, evidence }, index) => {
    text += field(ui, index === 0 ? "Runtimes" : "", `${name} ${style.dim(`(${evidence.join(", ")})`)}`);
  });
  text += settings(ui, { runtimes, profile, enforce, gitExclude });
  const conflicts = inspection.conflicts.length;
  text += `\n${field(ui, "Plan", [
    tally(ui, style.green, inspection.created.length, "to create"),
    style.dim(`${inspection.skipped.length} unchanged`),
    tally(ui, style.red, conflicts, conflicts === 1 ? "conflict" : "conflicts"),
  ].join(style.dim(` ${symbols.dot} `)))}`;
  for (const conflict of inspection.conflicts) text += field(ui, "", `${style.red(`${symbols.error} conflict`)} ${conflict}`);
  return `${text}\n`;
}

export function renderUpdatePlan(ui, { cwd, version, adopting, runtimes, profile, enforce, gitExclude, lowRisk, inspection }) {
  const { style, symbols } = ui;
  const dot = style.dim(` ${symbols.dot} `);
  let text = renderHeader(ui, version) + field(ui, "Target", style.bold(displayPath(cwd)));
  if (adopting) {
    text += field(ui, "Adoption", style.yellow("no scaffold.lock, so every existing kernel file that differs from this version is a conflict"));
  }
  text += settings(ui, { runtimes, profile, enforce, gitExclude }) + field(ui, "Low-risk tier", lowRisk);
  const conflicts = inspection.conflicts.length + inspection.conflicted.length + inspection.kept.length;
  text += `\n${field(ui, "Plan", [
    tally(ui, style.green, inspection.updated.length, "to update"),
    tally(ui, style.green, inspection.created.length, "to create"),
    tally(ui, style.cyan, inspection.merged.length, "to merge"),
    tally(ui, style.yellow, inspection.removed.length, "to remove"),
  ].join(dot))}`;
  text += field(ui, "", [
    style.dim(`${inspection.unchanged.length} unchanged`),
    style.dim(`${inspection.preserved.length} preserved`),
    tally(ui, style.red, conflicts, conflicts === 1 ? "conflict" : "conflicts"),
  ].join(dot));
  const rows = [
    ...UPDATE_ROWS.flatMap(([key, label, color, note]) => inspection[key].map((file) => [label, style[color], file, note])),
    ...inspection.kept.map((item) => ["keep", style.yellow, item.path, `yours; kit changes not applied: ${item.reason}`]),
    ...inspection.conflicts.map((file) => ["conflict", style.red, file, adopting ? "differs from this version" : "modified by you"]),
  ];
  if (rows.length > 0) text += "\n";
  for (const [label, color, file, note] of rows) {
    const name = color === style.dim ? style.dim(file) : file;
    text += field(ui, "", `${color(label.padEnd(8))} ${name}${note ? ` ${style.dim(`(${note})`)}` : ""}`);
  }
  return `${text}\n`;
}

export function renderNextSteps(ui) {
  const { style, symbols } = ui;
  const step = (text) => `  ${style.accent(symbols.arrow)} ${text}\n`;
  return [
    `\n  ${style.bold("Next steps")}\n`,
    step(`${style.cyan("npx agentic-repo-kit doctor")}  ${style.dim("check the kernel")}`),
    step(`${style.cyan("npx agentic-repo-kit status")}  ${style.dim("one-call digest at the start of each session")}`),
    step(`Start your coding agent here: its instructions begin at ${style.bold("AGENTS.md")}`),
    "\n",
  ].join("");
}

// The header replaces the plain help's title line; headings and flags are styled.
export function renderHelp(ui, text, version) {
  const { style } = ui;
  const body = text.split("\n").slice(1).map((line) => {
    if (/^[A-Z][\w ]*:$/.test(line)) return style.bold(line);
    const option = /^( {2})(-\S.*?)( {2,}.*)$/.exec(line);
    if (option) return `${option[1]}${style.cyan(option[2])}${option[3]}`;
    const usage = /^( {2})(agentic-repo)( .*)$/.exec(line);
    if (usage) return `${usage[1]}${style.accent(usage[2])}${usage[3]}`;
    return line;
  });
  return `${renderHeader(ui, version)}${body.join("\n").replace(/^\n+/, "")}`;
}

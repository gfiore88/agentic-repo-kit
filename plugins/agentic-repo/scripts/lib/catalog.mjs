export const RUNTIME_CATALOG = Object.freeze({
  codex: {
    displayName: "OpenAI Codex",
    executables: ["codex"],
    markers: [".codex", ".codex/config.toml"],
  },
  "claude-code": {
    displayName: "Anthropic Claude Code",
    executables: ["claude"],
    markers: ["CLAUDE.md", ".claude"],
  },
  "github-copilot": {
    displayName: "GitHub Copilot",
    executables: ["copilot"],
    markers: [
      ".github/copilot-instructions.md",
      ".github/instructions",
      ".github/agents",
    ],
  },
  antigravity: {
    displayName: "Google Antigravity",
    executables: ["agy"],
    markers: [".agents/rules", ".agents/agents"],
  },
  "gemini-cli": {
    displayName: "Google Gemini CLI",
    executables: ["gemini"],
    markers: ["GEMINI.md", ".gemini"],
  },
  cursor: {
    displayName: "Cursor",
    executables: ["cursor"],
    markers: [".cursor", ".cursor/rules"],
  },
  opencode: {
    displayName: "OpenCode",
    executables: ["opencode"],
    markers: ["opencode.json", "opencode.jsonc", ".opencode"],
  },
  kiro: {
    displayName: "Kiro",
    executables: ["kiro", "kiro-cli"],
    markers: [".kiro", ".kiro/steering"],
  },
});

export const RUNTIME_ALIASES = Object.freeze({
  claude: "claude-code",
  copilot: "github-copilot",
  gemini: "gemini-cli",
});

export function normalizeRuntimeId(value) {
  const normalized = value.trim().toLowerCase();
  return RUNTIME_ALIASES[normalized] ?? normalized;
}

export function runtimeIds() {
  return Object.keys(RUNTIME_CATALOG);
}

// Documentation the repository owner authors. `update` preserves these paths and
// `doctor` ignores their drift.
const USER_OWNED_PREFIXES = Object.freeze([
  "docs/wiki/",
  "docs/adr/",
  "docs/product/",
  "docs/raw/",
  "docs/specs/",
  "docs/templates/",
]);

export function isUserOwnedPath(relativePath) {
  return USER_OWNED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}


// Skill profiles. `full` installs every bundled skill and the imported command pack;
// `core` installs only the governance kernel skills.
export const PROFILES = Object.freeze(["full", "core"]);
export const CORE_SKILLS = Object.freeze([
  "anneal-agent-directives",
  "bootstrap-agentic-repository",
  "create-architectural-decision-record",
  "curate-project-knowledge",
  "govern-development-task",
  "prd",
]);

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


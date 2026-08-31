# Kernel and Runtime Adapters

- `[DECISION]` The product uses a canonical repository, Codex plugin, and dependency-free Node.js CLI. Source: [ADR-0001](../../adr/adr-0001-hybrid-distribution-and-runtime-adapters.md).
- `[DECISION]` Every generated project receives the universal kernel; only selected or detected runtime adapters are added. Source: ADR-0001.
- `[FACT]` `agentic-repo init` defaults to assisted automatic detection and never executes detected coding-agent binaries. Source: `plugins/agentic-repo/scripts/lib/detect.mjs`.
- `[FACT]` Canonical agent definitions live under `.agents/agents`; `plan.mjs` generates native wrappers for Codex, Claude Code, GitHub Copilot, Gemini CLI, and OpenCode. Source: `plugins/agentic-repo/scripts/lib/plan.mjs`.
- `[FACT]` `scaffold.lock` records managed paths and SHA-256 digests; `doctor` reports missing or divergent files. Source: `plugins/agentic-repo/scripts/lib/doctor.mjs`.

Adapters remain deliberately thin. Governance, knowledge rules, and human gates belong to canonical files so cross-runtime behavior cannot drift independently.


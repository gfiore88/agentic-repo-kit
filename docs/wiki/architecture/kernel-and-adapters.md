---
type: concept
title: Kernel and Runtime Adapters
created: 2026-08-31
updated: 2026-11-13
sources: ["plugins/agentic-repo/scripts/lib/detect.mjs", "plugins/agentic-repo/scripts/lib/plan.mjs", "plugins/agentic-repo/scripts/lib/doctor.mjs", "plugins/agentic-repo/scripts/lib/writer.mjs", "plugins/agentic-repo/scripts/lib/exclude.mjs", "plugins/agentic-repo/scripts/lib/status.mjs", "docs/adr/adr-0013-lock-aware-update-and-governance-gate-hardening.md", "docs/adr/adr-0015-run-efficiency-hardening-of-the-generated-kernel.md", "docs/adr/adr-0017-version-pinned-projected-invocation-and-tolerant-frontmatter-parsing.md", "docs/adr/adr-0001-hybrid-distribution-and-runtime-adapters.md"]
---

# Kernel and Runtime Adapters

- `[DECISION]` The product uses a canonical repository, Codex plugin, and dependency-free Node.js CLI. Source: [ADR-0001](../../adr/adr-0001-hybrid-distribution-and-runtime-adapters.md).
- `[DECISION]` Every generated project receives the universal kernel; only selected or detected runtime adapters are added. Source: ADR-0001.
- `[FACT]` `agentic-repo init` defaults to assisted automatic detection and never executes detected coding-agent binaries. Source: `plugins/agentic-repo/scripts/lib/detect.mjs`.
- `[FACT]` Canonical agent definitions live under `.agents/agents`; `plan.mjs` generates native wrappers for Codex, Claude Code, GitHub Copilot, Gemini CLI, and OpenCode. Source: `plugins/agentic-repo/scripts/lib/plan.mjs`.
- `[FACT]` `scaffold.lock` records managed paths and SHA-256 digests, the kit version, runtimes, enforcement mode, and skill profile; `doctor` reports missing or divergent files. Source: `plugins/agentic-repo/scripts/lib/doctor.mjs`.
- `[DECISION]` `update` only replaces a kernel file whose content still matches its locked hash; user-modified files are conflicts that abort the update unless `--force` is given, and unmodified files the plan no longer generates are removed. `update` refuses to run without `scaffold.lock`. Source: [ADR-0013](../../adr/adr-0013-lock-aware-update-and-governance-gate-hardening.md).
- `[FACT]` `.git/info/exclude` patterns are root-anchored and derived from `scaffold.lock` plus kit-owned growth directories, so new adapters cannot drift out of the exclusion list. Source: `plugins/agentic-repo/scripts/lib/exclude.mjs`.
- `[DECISION]` `--profile core` installs only the six governance kernel skills and omits the imported command pack; `full` (default) installs all 31 skills. Source: ADR-0013.
- `[FACT]` `status` is a read-only digest computed from `scaffold.lock`, `doctor`, `knowledge lint`, and the ADR, PRD, proposal, and log files; it writes nothing and makes no network or subprocess calls. Source: `plugins/agentic-repo/scripts/lib/status.mjs`.
- `[DECISION]` Kernel-owned projected content invokes the CLI pinned to the generating kit version (`npx --yes agentic-repo-kit@<version> <command>`), like the hooks and CI. `update` refreshes the pin, sources stay version-free, and user-owned files carry no invocation that could go stale. Source: [ADR-0017](../../adr/adr-0017-version-pinned-projected-invocation-and-tolerant-frontmatter-parsing.md), amending ADR-0015.

Adapters remain deliberately thin. Governance, knowledge rules, and human gates belong to canonical files so cross-runtime behavior cannot drift independently.


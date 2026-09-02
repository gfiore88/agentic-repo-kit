---
title: "PRD-0005: Kernel Update and Upgrade Command"
status: "Accepted"
date: "2026-09-02"
owners: ["Giovanni Fiore"]
---

# PRD-0005: Kernel Update and Upgrade Command

## 1. Executive Summary

### Problem statement

In repositories where `agentic-repo-kit init` has already been run, users create and maintain project-specific knowledge (e.g. customized `docs/wiki/index.md`, topic wiki pages, ADRs, and PRDs).
When a new version of `agentic-repo-kit` is released with updated lifecycle skills, improved operating contracts (`AGENTS.md`), or enhanced adapter definitions, running `agentic-repo init` halts because preflight checks flag the customized wiki pages as conflicts.
Users need a deterministic, safe way to upgrade the underlying AI operating kernel without risking loss or manual merging of their project-specific knowledge.

### Proposed solution

Introduce a dedicated `agentic-repo update` (alias: `agentic-repo upgrade`) command that:
1. **Preserves User Knowledge**: Strictly protects user-owned documentation paths (`docs/wiki/`, `docs/adr/`, `docs/product/`, `docs/raw/`, `docs/specs/`, `docs/templates/`) from being overwritten by stock blueprint templates.
2. **Upgrades Kernel Infrastructure**: Updates canonical skills (`.agents/skills/`), specialist agent personas (`.agents/agents/`), rules (`.agents/rules/`), workflows (`.agents/workflows/`), operating contracts (`AGENTS.md`), and active runtime adapters (`.github/agents/`, `.claude/`, etc.) to the latest release.
3. **Maintains Lockfile & Git Exclusions**: Recalculates `scaffold.lock` and automatically updates `.git/info/exclude` when managed local exclusions are active.

### Success criteria

- Running `agentic-repo update` in an existing repository upgrades kernel infrastructure files cleanly.
- Custom project documentation in `docs/wiki/` and `docs/adr/` is 100% preserved.
- `scaffold.lock` accurately reflects the updated infrastructure.
- Zero conflicts or blocking errors when upgrading valid repositories.

## 2. Technical Requirements

- `writer.mjs`: Provide `isUserOwnedPath`, `inspectUpdate`, and `applyUpdate`.
- `args.mjs`: Support `update` and `upgrade` commands with `--cwd`, `--yes/-y`, `--dry-run`, `--json`, `--git-exclude`, `--runtime`.
- `cli.mjs`: Wire `runUpdate` command handler with formatted output and non-interactive mode.

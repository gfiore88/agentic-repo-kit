---
title: "ADR-0007: Kernel Update Command and User Knowledge Preservation"
status: "Accepted"
date: "2026-09-02"
authors: "Giovanni Fiore and implementation agent"
tags: ["cli", "update", "upgrade", "lifecycle", "governance"]
supersedes: ""
superseded_by: ""
---

# ADR-0007: Kernel Update Command and User Knowledge Preservation

## Status

Accepted. Giovanni Fiore explicitly approved the implementation plan, PRD-0005, and ADR-0007 on 2026-09-02.

## Context

When initializing a new repository, `agentic-repo init` provides safe-by-design preflight checking to avoid accidental modification of existing files. However, for repositories that are already initialized, updating to newer versions of `agentic-repo-kit` was blocked whenever users customized their living wiki (`docs/wiki/`) or added project ADRs (`docs/adr/`).

A clear architectural boundary is required between **Kernel Infrastructure** (owned and maintained by the kit) and **User Project Knowledge** (owned by the project team).

## Decision

1. Distinguish between User-Owned paths and Kernel Infrastructure paths:
   - **User-Owned Paths (Preserved)**: `docs/wiki/`, `docs/adr/`, `docs/product/`, `docs/raw/`, `docs/specs/`, `docs/templates/`.
   - **Kernel Infrastructure (Upgraded)**: `.agents/skills/`, `.agents/agents/`, `.agents/rules/`, `.agents/workflows/`, `.agents/references/`, `.agents/licenses/`, `.agents/commands/`, `.agents/registry.md`, `THIRD_PARTY_NOTICES.md`, `AGENTS.md`, active runtime adapters (`.github/agents/`, `.claude/`, etc.), `scaffold.yaml`, and `scaffold.lock`.
2. Introduce the `agentic-repo update` (alias: `upgrade`) command:
   - Inspects existing runtimes in `scaffold.lock` / `scaffold.yaml` (or accepts `--runtime` override).
   - Upgrades infrastructure files in place while preserving all existing user-owned documentation files.
   - Recalculates and updates `scaffold.lock`.
   - Automatically maintains `.git/info/exclude` if local exclusion was active.

## Consequences

### Positive

- **POS-001**: Repositories can upgrade their AI kernel and skill capabilities seamlessly without conflict errors.
- **POS-002**: User project documentation and living wiki knowledge are strictly protected against accidental overwrite.
- **POS-003**: Lockfile and local Git exclusions remain synchronized with zero manual steps.

### Negative

- **NEG-001**: Custom edits made directly to canonical skill files (`.agents/skills/`) are overwritten during an update in favor of the upstream blueprint. (Users who need custom repository skills should place them in project-specific rule files or custom directories).

## References

- **REF-001**: [PRD-0005](../product/prd-0005-kernel-update-and-upgrade-command.md)
- **REF-002**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)
- **REF-003**: [ADR-0005](adr-0005-local-git-exclude-for-restricted-repositories.md)

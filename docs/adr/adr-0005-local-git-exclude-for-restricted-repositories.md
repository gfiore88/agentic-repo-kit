---
title: "ADR-0005: Local Git Exclude for Restricted Repositories"
status: "Accepted"
date: "2026-08-31"
authors: "Giovanni Fiore and implementation agent"
tags: ["git", "exclude", "enterprise", "governance", "cli"]
supersedes: ""
superseded_by: ""
---

# ADR-0005: Local Git Exclude for Restricted Repositories

## Status

Accepted. Giovanni Fiore explicitly approved the implementation plan, PRD-0003, and ADR-0005 for local Git exclude governance on 2026-08-31.

## Context

In enterprise environments, client repositories, or restricted codebases, developers are often prohibited from committing AI agent files or editing tracked `.gitignore` files. A developer wishing to use `agentic-repo-kit` locally needs a non-intrusive way to hide generated files (`.agents/`, `docs/`, `scaffold.*`, `CLAUDE.md`, `.cursorrules`, etc.) from `git status` without creating any diff in tracked files.

Git natively supports `.git/info/exclude`, which applies local ignore rules exclusively to the local repository clone and is never committed or pushed upstream.

## Decision

- Implement local exclude management in `plugins/agentic-repo/scripts/lib/exclude.mjs`.
- Add a `--git-exclude` flag to `agentic-repo init` to automatically write local exclusions during repository initialization.
- Add a dedicated standalone command `agentic-repo exclude` with `--remove`, `--list`, `--cwd`, and `--json` support.
- Encapsulate managed exclusion patterns within a clean delimiter block:
  ```text
  # --- BEGIN AGENTIC REPO EXCLUDES ---
  ...
  # --- END AGENTIC REPO EXCLUDES ---
  ```
- Preserve any existing, user-defined rules in `.git/info/exclude`.
- Gracefully handle repositories where `.git` is missing without throwing fatal errors.

## Consequences

### Positive

- **POS-001**: Developers can use `agentic-repo-kit` in restricted client repositories without touching `.gitignore` or polluting `git status`.
- **POS-002**: Changes to `.git/info/exclude` are strictly local to the developer's clone.
- **POS-003**: Delimited marker blocks ensure 100% idempotency upon repeated addition or removal.
- **POS-004**: Standalone command allows toggling local exclusions at any time after initialization.

### Negative

- **NEG-001**: Local exclusions must be reapplied if the repository is cloned anew to another machine (by design of Git's architecture).

## Alternatives Considered

### Modify `.gitignore` automatically

- **ALT-001**: **Description**: Append ignore rules to `.gitignore`.
- **ALT-002**: **Rejection rationale**: Violates enterprise constraints where `.gitignore` is a tracked file subject to PR review and team policy.

### Rely on global `~/.config/git/ignore`

- **ALT-003**: **Description**: Instruct developers to add patterns to their global user gitignore.
- **ALT-004**: **Rejection rationale**: Pollutes all repositories on the machine and requires manual user configuration outside the project scope.

## Implementation Notes

- **IMP-001**: Exclusion patterns cover core directories (`.agents/`, `docs/`, `scaffold.yaml`, `scaffold.lock`, `AGENTS.md`) and all supported runtime adapter files (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.github/agents/`, `.cursorrules`, `.opencode/`, `.kiro/`).
- **IMP-002**: Safe git directory resolution checks `.git` directory and `.git` file (`gitdir:` pointer).
- **IMP-003**: Full unit and integration tests cover addition, idempotency, removal, and missing `.git` fallback.

## References

- **REF-001**: [PRD-0003](../product/prd-0003-local-git-exclude-governance.md)
- **REF-002**: [Git Documentation on exclude](https://git-scm.com/docs/gitignore)
- **REF-003**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)

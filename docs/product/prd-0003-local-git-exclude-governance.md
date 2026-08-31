---
title: "PRD-0003: Local Git Exclude Governance"
status: "Accepted"
date: "2026-08-31"
owners: ["Giovanni Fiore"]
---

# PRD-0003: Local Git Exclude Governance

## 1. Executive Summary

### Problem statement

In corporate, client-contracted, or strictly governed open-source environments, developers cannot always commit AI-specific scaffolding files (`.agents/`, `docs/`, `scaffold.yaml`, `CLAUDE.md`, `.cursorrules`, etc.) to the remote repository. Furthermore, editing `.gitignore` directly is often prohibited or undesirable because `.gitignore` is a tracked file that triggers Git status modifications and appears in Pull Requests.

### Proposed solution

Provide native support for Git's local per-repository exclusion file (`.git/info/exclude`). Through an initialization flag (`--git-exclude`) or a standalone command (`agentic-repo exclude`), the CLI safely and idempotently appends generated scaffolding paths to `.git/info/exclude` within a clearly marked block. This allows developers to fully leverage `agentic-repo-kit` locally without polluting `git status` or leaving any footprint on the remote repository.

### Success criteria

- `agentic-repo init --git-exclude` automatically excludes generated scaffolding upon repository initialization.
- `agentic-repo exclude` provides standalone inspection, addition, and removal (`--remove`) of exclusions.
- Existing custom rules in `.git/info/exclude` are strictly preserved.
- Exclusion blocks are cleanly delimited with identifiable header and footer markers for 100% idempotent updates.
- If `.git` is not present (e.g. non-git directory or archive), the CLI provides a graceful non-fatal warning without crashing.
- `git status` in an initialized repository with exclusions enabled reports a clean working tree with 0 untracked scaffolding files.

## 2. User Experience and Functionality

### Personas

- **Enterprise / Client Developer**: Works in client repositories with strict branch policies and cannot commit AI tooling files upstream or modify `.gitignore`.
- **Privacy-Conscious Developer**: Wants to maintain personal AI agent notes and knowledge bases locally without exposing them to shared team remotes.
- **Freelance Consultant**: Regularly switches between client repositories and needs immediate local AI scaffolding with zero repository pollution.

### User stories

- As a contractor, I can run `npx agentic-repo-kit init --git-exclude` so that all agent instructions and wiki files remain local and invisible to the client's Git history.
- As a developer, I can run `agentic-repo exclude --remove` whenever my team decides to formally adopt the scaffolding into the shared repository.
- As a team lead, I can rest assured that developers using AI tools locally do not inadvertently push `.cursorrules` or `.agents/` into enterprise commits.

### Acceptance criteria

- Flag `--git-exclude` is recognized during `agentic-repo init`.
- Command `agentic-repo exclude` accepts `--remove`, `--list`, `--cwd`, and `--json`.
- Markers `# --- BEGIN AGENTIC REPO EXCLUDES ---` and `# --- END AGENTIC REPO EXCLUDES ---` encapsulate all managed patterns.
- Excluded patterns cover both core kernel directories and active runtime adapter files.

## 3. Technical Specifications

- Implemented in `plugins/agentic-repo/scripts/lib/exclude.mjs`.
- Reads and writes `.git/info/exclude` using standard Node.js `fs/promises`.
- Automatically ensures the `.git/info/` directory exists before writing.
- Preserves all preceding and following content outside the marker block.

## 4. Risks and Mitigation

- **Risk**: `.git` might be a file in worktrees/submodules rather than a directory.
  - **Mitigation**: Resolve git directory safely by checking whether `.git` is a directory or reading the `gitdir:` pointer.
- **Risk**: User manually edits inside the marker block.
  - **Mitigation**: Clean replacement of the delimited block with deterministic managed patterns upon re-run.

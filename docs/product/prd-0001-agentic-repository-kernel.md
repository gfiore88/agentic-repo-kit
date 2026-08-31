---
title: "PRD-0001: Agentic Repository Kernel"
status: "Accepted"
date: "2026-08-31"
owners: ["Project owner"]
---

# PRD-0001: Agentic Repository Kernel

## 1. Executive Summary

### Problem statement

Starting a software project repeatedly requires recreating the same knowledge architecture, agent roles, reusable skills, decision governance, and self-improvement workflow. Existing copies drift, contain project-specific paths, and target only some coding-agent runtimes.

### Proposed solution

Build a model-agnostic, multi-runtime repository kernel distributed as a canonical source repository, a skills-based plugin, and a CLI that installs a universal knowledge/governance core plus only the explicitly selected runtime adapters.

### Success criteria

- `agentic-repo init` defaults to assisted automatic runtime detection.
- Explicit runtime selection always overrides detection.
- Initialization never silently overwrites divergent files.
- The first release supports eight adapter IDs: Codex, Claude Code, GitHub Copilot, Antigravity, Gemini CLI, Cursor, OpenCode, and Kiro.
- Every generated repository contains a navigable, Git-versioned knowledge base.
- ADR, PRD, and self-annealing changes remain human-gated.
- Every new development task creates a dedicated Proposed ADR through the official skill and cannot enter implementation before human acceptance.
- Re-running initialization is idempotent for unchanged generated files.

## 2. User Experience and Functionality

### Personas

- Solo developer who repeatedly starts AI-assisted repositories.
- Engineering lead standardizing agent behavior across a team.
- Contributor using a different coding-agent runtime from the repository creator.

### User stories

- As a developer, I can run `agentic-repo init` without knowing adapter flags so that the system proposes the environments it detects.
- As a repository owner, I can explicitly select runtimes so that generated configuration matches team policy.
- As a contributor, I can inspect `AGENTS.md` and `docs/wiki/index.md` to understand both operating rules and project knowledge.
- As a reviewer, I can verify that an agent-directive improvement came from observable run evidence and human approval.

### Acceptance criteria

- Default invocation behaves as `--runtime auto`.
- `--runtime none` generates no runtime-specific directories.
- `--dry-run` performs no writes.
- `--yes` permits non-interactive initialization.
- Existing identical files are skipped; divergent files are reported as conflicts.
- A lock file records enabled runtimes and generated paths.
- A doctor command reports missing or divergent managed files.
- Generated repositories include the unmodified official GitHub ADR and PRD skills.
- Generated repositories include the complete Addy Osmani lifecycle skill pack and its shared references.
- The knowledge curator supports ingest, query-derived synthesis, indexing, logging, contradiction handling, and deterministic lint checks.
- Run diagnosis and directive-diff authoring are separate roles; neither can approve a persistent directive change.
- ADR, PRD, and annealing commands create `Proposed`, `Draft`, and `PENDING` artifacts respectively.

### Non-goals for v0.1

- Publishing to npm or a public plugin marketplace.
- Automatic upstream skill upgrades or unreviewed dependency refreshes.
- MCP services, centralized telemetry, or remote run storage.
- Full behavioral certification of every secondary coding agent.
- Automatic modification of approved directives after a retrospective.

## 3. AI System Requirements

- Canonical skills follow the open `SKILL.md` structure.
- Canonical agent definitions default to model inheritance.
- Runtime-specific permission and tool names are adapter concerns.
- Missing native enforcement must degrade explicitly to deterministic scripts or CI.
- Run analysis must use observable artifacts, not hidden chain-of-thought.

### Evaluation strategy

- Static validation of manifests, frontmatter, paths, and generated files.
- Golden-project tests for every runtime adapter.
- Behavioral scenarios for knowledge lookup, ADR/PRD gates, and self-annealing.
- Idempotency and conflict-preservation tests.

## 4. Technical Specifications

- Node.js 20+ dependency-free CLI for the initial implementation.
- Codex plugin under `plugins/agentic-repo/`.
- Universal repository contract in `AGENTS.md`.
- Shared skills stored in `.agents/skills` in generated projects when skill vendoring is introduced.
- Adapter-specific configuration generated only for selected runtimes.
- JSON lock file and human-readable YAML project configuration.

### Security and privacy

- Do not ingest secrets, credentials, `.env` contents, PII, or regulated data into versioned raw knowledge.
- Do not overwrite existing files silently.
- Do not execute detected runtime binaries during detection.
- Treat third-party skills as versioned supply-chain dependencies.

## 5. Risks and Roadmap

### Risks

- Runtime formats evolve independently.
- Similar concepts such as agents and hooks have different permission semantics.
- Excessive generated configuration can create drift and prompt duplication.
- Broad automatic detection can produce false positives.

### Phased rollout

- `v0.1`: complete governed kernel, pinned upstream skill packs, canonical roles, generated runtime agents, knowledge linting, artifact gates, and structural/end-to-end tests.
- `v0.2`: add/remove/upgrade lifecycle, three-way migration semantics, and reviewed upstream refresh tooling.
- `v0.3`: live-runtime compatibility fixtures and behavioral evaluation scenarios.
- `v1.0`: published npm package and plugin distribution with a certified compatibility matrix.

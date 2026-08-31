---
title: "PRD-0002: Developer Branding and Showcase"
status: "Accepted"
date: "2026-08-31"
owners: ["Giovanni Fiore"]
---

# PRD-0002: Developer Branding and Showcase

## 1. Executive Summary

### Problem statement

The initial `0.1.0` release established the technical foundation and publication pipeline for `agentic-repo-kit`. However, the repository `README.md` read as an internal technical specification rather than a developer-facing product showcase. Developers landing on GitHub or the npm registry package page lacked immediate visual clarity on what the tool does, how it transforms repositories, and how it bridges multiple AI coding runtimes (Claude Code, Codex, Copilot, Antigravity, Cursor, etc.) under a unified, governed knowledge base.

### Proposed solution

Redesign the project presentation into a developer-tooling showcase inspired by modern engineering tools (such as Vercel, Linear, and Raycast). The showcase introduces a cohesive dark-themed visual presentation, unified hero messaging, a clear ASCII/Unicode architecture map, value pillars, before-and-after comparisons, an explicit multi-runtime support matrix, chatbot workflow prompt cards, and rich npm search metadata.

### Success criteria

- A unified hero with clear value messaging: *"Transform any codebase into a governed, knowledge-first operating kernel for AI coding agents."*
- Immediate quickstart command (`npx agentic-repo-kit init`) visible above the fold.
- Visual architecture map showing the flow from raw safe sources to compiled living wiki, decision gates, skills, and runtime projections.
- Clean comparison table contrasting unmanaged agent repositories with governed `agentic-repo-kit` environments.
- Support matrix covering all 8 runtime adapters with generated integration targets.
- Conversational chatbot prompt cards for all four core workflows (Ingest, Query, Task ADR, Anneal).
- Zero external host dependencies for core markdown rendering on both GitHub and npm.
- Comprehensive search keywords and updated metadata in `package.json` for npm discoverability.

## 2. User Experience and Showcase Strategy

### Target Personas

- **AI-Native Developers**: Engineers looking for a structured, reusable foundation to run Claude Code, Codex, Cursor, or Copilot on their repositories without losing context between chat sessions.
- **Tech Leads & Architects**: Engineering leaders who need strict decision governance (ADRs), product scope boundaries (PRDs), and controlled self-annealing across distributed teams.
- **Open Source Contributors**: Developers evaluating tools on GitHub and npm who need to grasp the architecture and run the CLI in under 30 seconds.

### Core Value Pillars

1. **Living Git-Versioned Knowledge Base**: Safe raw ingestion (`docs/raw/`) compiled into an indexed living wiki (`docs/wiki/`) with deterministic linting and contradiction tracking.
2. **Mandatory Human-Gated Decisions**: Task ADRs via GitHub's official skill and PRDs created before domain implementation.
3. **One Kernel, Multi-Runtime Projections**: Canonical operating contract (`AGENTS.md` + `.agents/`) projected cleanly into runtime-specific files (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursorrules`, etc.).
4. **Governed Self-Annealing**: Two-stage retrospective optimization (run evidence diagnosis + directive diff authoring) with human approval gates.
5. **31+ Reusable Engineering Skills**: The full Addy Osmani lifecycle pack alongside GitHub official ADR/PRD skills and Karpathy-style knowledge curation.

## 3. Technical & Compatibility Invariants

- **Markdown Parity**: The markdown must render with consistent fidelity on GitHub Flavored Markdown (GFM) and the npm package registry page.
- **Zero Asset Breakage**: Avoid referencing private repository URLs or external CDNs that might fail or change; use clean GFM tables, Unicode box diagrams, and standard shields.io badges with monochrome themes.
- **Self-Contained CLI & Zero Dependencies**: Maintain 0 runtime dependencies and Node.js >=20 compatibility.

## 4. Release Plan

- Deliver the complete branding and showcase overhaul in version `0.1.1`.
- Update `package.json` with version bump and keywords.
- Update `CHANGELOG.md` and repository knowledge logs.

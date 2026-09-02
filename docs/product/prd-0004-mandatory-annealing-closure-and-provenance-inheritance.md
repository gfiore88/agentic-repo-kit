---
title: "PRD-0004: Mandatory Annealing Closure and Provenance Inheritance"
status: "Accepted"
date: "2026-09-02"
owners: ["Giovanni Fiore"]
---

# PRD-0004: Mandatory Annealing Closure and Provenance Inheritance

## 1. Executive Summary

### Problem statement

In practical usage of `agentic-repo-kit`, two key usability gaps were identified:
1. **Skipped Annealing Retrospectives**: When coding agents conclude development tasks originating from an Architectural Decision Record (ADR), they frequently stop without performing the required self-annealing diagnosis unless explicitly prompted by the user.
2. **Repetitive Citation Friction in Living Wiki**: When entire wiki pages are compiled from a single raw safe document in `docs/raw/`, `knowledge lint` raised false-positive "uncited fact" errors unless the source was pedantically copy-pasted on every single bullet point line.

### Proposed solution

1. **Mandate Visible Annealing Diagnosis**: Enforce in canonical operating contracts (`AGENTS.md`), the `govern-development-task` skill, and task lifecycle workflows that every ADR completion response MUST conclude with a standardized `### 🔬 End-of-Task Annealing Diagnosis` block.
2. **Page-Level Provenance Inheritance**: Upgrade `knowledge lint` to recognize page headers with `**Source**: ...` or `Source: ...`, allowing all enclosed `[FACT]` assertions to inherit that primary provenance automatically without repetitive per-line annotations.

### Success criteria

- Every completed ADR development task automatically produces a visible annealing diagnosis in the agent's final response.
- `knowledge lint` passes when a wiki page declares its provenance in the page header.
- Line-level overrides continue to work for pages that aggregate facts from multiple disparate sources.
- The 100% human-gated policy remains inviolate (agents diagnose and propose `PENDING` diffs, but never self-modify directives).

## 2. User Experience and Functionality

### Personas

- **Developers**: Receive automatic retrospective assessments and potential directive improvement proposals at the end of every feature without having to manually request them.
- **Knowledge Curators**: Can compile multi-point wiki pages from a single raw safe source by declaring the source once in the header.

### User stories

- As a developer, when an agent finishes implementing an ADR, I can immediately see whether there was methodology friction and review any suggested directive changes.
- As an engineer compiling client specifications into `docs/wiki/`, I can write `**Source**: docs/raw/client-specs.md` at the top of the file without having to append `(source: ...)` to 50 individual lines.

## 3. Technical Specifications

- `plugins/agentic-repo/scripts/lib/knowledge.mjs`: inspects the first 15 lines of each markdown file for page-level provenance regex `/(^|\n)\s*(?:\*\*)?source(?:s)?(?:\*\*)?:\s*(?:`[^`]+`|\[[^\]]+\]\([^)]+\)|docs\/raw\/|https?:|\S+)/i`.
- `plugins/agentic-repo/skills/govern-development-task/SKILL.md`: explicitly lists the required closing block format.
- `plugins/agentic-repo/assets/blueprints/base/AGENTS.md` and `.agents/workflows/task-lifecycle.md`: updated with the mandatory closing block.

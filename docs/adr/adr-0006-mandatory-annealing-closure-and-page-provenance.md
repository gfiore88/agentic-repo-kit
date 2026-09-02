---
title: "ADR-0006: Mandatory Annealing Closure and Page Provenance"
status: "Accepted"
date: "2026-09-02"
authors: "Giovanni Fiore and implementation agent"
tags: ["governance", "annealing", "knowledge-lint", "provenance", "adr"]
supersedes: ""
superseded_by: ""
---

# ADR-0006: Mandatory Annealing Closure and Page Provenance

## Status

Accepted. Giovanni Fiore explicitly approved the implementation plan, PRD-0004, and ADR-0006 on 2026-09-02.

## Context

Observation of real-world task execution revealed that coding agents frequently omit the end-of-task self-annealing diagnosis step unless specifically requested by the user, leaving potential rule improvements unanalyzed. Simultaneously, `knowledge lint` produced friction by requiring `(source: ...)` repetition on every single line of a wiki page, even when the entire page was distilled from a single cited raw document.

## Decision

1. Require that all task completions that fulfill an Architectural Decision Record (ADR) end with a mandatory output block:
   ```markdown
   ### 🔬 End-of-Task Annealing Diagnosis
   - **Observable Friction / Errors**: Summary of failures/friction, or None.
   - **Classification**: `None` | `Agent Method` | `Product/Domain Scope` | `Tooling Gap`
   - **Action**: No directive changes (or `PENDING` proposal generated via `anneal-agent-directives`).
   ```
2. Update the `govern-development-task` skill, `task-lifecycle.md` workflow, and `AGENTS.md` operating contracts to mandate this section.
3. Update `plugins/agentic-repo/scripts/lib/knowledge.mjs` so that `lintKnowledge` checks for top-level page provenance (e.g. `**Source**: docs/raw/...` in the page header). When present, enclosed `[FACT]` assertions inherit the source citation without raising uncited fact errors.

## Consequences

### Positive

- **POS-001**: Annealing retrospectives happen reliably after every completed development task.
- **POS-002**: Wiki compilation from raw documents is significantly faster and cleaner with header-level source declaration.
- **POS-003**: The 100% human-gated policy remains enforced (agents propose `PENDING` diffs, never self-apply).

### Negative

- **NEG-001**: Task completion responses are slightly longer due to the structured diagnostic block.

## Implementation Notes

- **IMP-001**: Line-level citations remain supported and take precedence when aggregating across multiple raw sources.
- **IMP-002**: Full unit tests verify that header provenance passes `lintKnowledge`.

## References

- **REF-001**: [PRD-0004](../product/prd-0004-mandatory-annealing-closure-and-provenance-inheritance.md)
- **REF-002**: [PRD-0001](../product/prd-0001-agentic-repository-kernel.md)
- **REF-003**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)

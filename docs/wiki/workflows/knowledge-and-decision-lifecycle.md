---
type: concept
title: Knowledge and Decision Lifecycle
created: 2026-08-31
updated: 2026-09-04
---

# Knowledge and Decision Lifecycle

## Knowledge

Safe sources enter immutable `docs/raw/`. The knowledge curator classifies assertions, integrates them into the compiled wiki, records contradictions, updates cross-links and `index.md`, then appends a parseable log entry. `knowledge lint` checks broken links, uncatalogued pages, and facts lacking visible provenance.

## Decisions

Important product uncertainty triggers the official PRD discovery workflow. Every new development task receives a dedicated ADR created with the official skill. Each task ADR starts as `Proposed`; implementation remains blocked until explicit human acceptance. PRDs begin as `Draft` and important product choices remain human-governed.

## Completion

A task is complete only after its acceptance criteria, tests, relevant static/security checks, durable documentation, wiki index/log updates, and end-of-run annealing assessment are satisfied.

---
title: "PRD-0006: Governance Enforcement Modes"
status: "Accepted"
date: "2026-09-04"
owners: ["Giovanni Fiore"]
---

# PRD-0006: Governance Enforcement Modes

## 1. Executive Summary

### Problem statement

The kit persists PRDs/ADRs and mandates the end-of-task annealing diagnosis, but
compliance is currently **advisory**: nothing deterministically stops
implementation when a governing decision is missing or still `Proposed`. The gate
holds only insofar as a cooperative agent follows `AGENTS.md`.

Because the kit is public and general-purpose, it must serve **opposite** needs at
the same time:

- Teams that track the agentic scaffolding and want **shared, visible**
  enforcement for everyone with repository access.
- Developers who need enforcement that stays **transparent on their own machine**
  — for example working inside a restricted client repository where the
  scaffolding is kept untracked via `--git-exclude` (ADR-0005).

A single hard-coded mechanism cannot satisfy both. "Shared guarantee" and
"invisible to the client" are inherently opposite goals.

### Proposed solution

Offer governance enforcement as an **opt-in, per-repository selectable capability**
built from one canonical deterministic check plus thin projections:

1. **Canonical check** — a runtime-neutral `agentic-repo verify` command
   (deterministic, no network) that reports governance violations: tracked source
   changed without an `Accepted` ADR linkage, failing knowledge lint, or a missing
   mandated annealing block.
2. **Shared enforcement** — a CI adapter that only invokes `agentic-repo verify`;
   visible to everyone with repository access.
3. **Transparent enforcement** — a local pre-commit hook installer (via
   `core.hooksPath`) that runs the same command on the developer's machine only.
4. **Stealth** — combining the local hook with the existing `--git-exclude` keeps
   nothing in the client's tracked repository.

Selection via a new `--enforce ci|hooks|none` axis, defaulting to `none` so
current behavior stays non-breaking.

### Success criteria

- A single canonical command defines what "compliant" means; CI and hooks contain
  no duplicated policy logic.
- Consumers can choose shared (CI) or transparent (hooks) enforcement per
  repository, or neither.
- Default behavior is unchanged (opt-in only).
- Enforcement is portable across CI providers because they only wrap the command.

### Honest constraints (explicit non-goals)

- `verify` checks the **presence/acceptance** of a governing ADR for a change, not
  **semantic adherence** to it.
- Git hooks require a one-time local opt-in (`core.hooksPath`); they cannot be
  silently shared through a tracked directory.
- CI enforcement is inherently visible; "shared **and** invisible to the client"
  is not achievable and is intentionally out of scope.

## 2. Technical Requirements (high level; finalized in ADR-0008)

- New CLI verb `verify` in `args.mjs` / `cli.mjs`.
- A deterministic governance checker in `lib/` (git-diff introspection + ADR
  status parsing + reuse of the existing knowledge lint).
- New generated adapters: a CI workflow and a hook installer script, both thin
  wrappers over `verify`.
- A `--enforce` selection axis recorded in scaffold metadata so `update` can
  maintain it.

## 3. Open questions

- Which CI providers to ship first (GitHub Actions as the reference; others as
  thin wrappers)?
- How strict the ADR-linkage heuristic should be (presence of any `Accepted` ADR
  in the change set vs. explicit reference by ADR id)?

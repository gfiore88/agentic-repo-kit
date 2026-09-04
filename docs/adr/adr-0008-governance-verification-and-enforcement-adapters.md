---
title: "ADR-0008: Governance Verification Command and Enforcement Adapters"
status: "Accepted"
date: "2026-09-04"
authors: "Giovanni Fiore and implementation agent"
tags: ["governance", "cli", "ci", "git-hooks", "enforcement", "portability"]
supersedes: ""
superseded_by: ""
---

# ADR-0008: Governance Verification Command and Enforcement Adapters

## Status

Accepted. Giovanni Fiore explicitly accepted this ADR on 2026-09-04, approving the
canonical `verify` command and the opt-in enforcement projections. The first
vertical slice is scoped to the deterministic `agentic-repo verify` engine; the
CI and local-hook adapters follow as subsequent slices.

## Context

PRD/ADR persistence and the mandated annealing diagnosis are in place, but
compliance is advisory: no deterministic mechanism blocks implementation when a
governing decision is missing or unapproved (see the advisory-vs-deterministic
distinction underpinning the kernel).

The kit is public and general-purpose, so it must support both **shared, visible**
enforcement (teams that track the scaffolding) and **transparent, machine-local**
enforcement (developers operating inside restricted client repositories with the
scaffolding kept untracked via ADR-0005). These are opposite goals and cannot be
met by one hard-coded mechanism.

The resolution is consistent with ADR-0001: keep policy logic canonical and
runtime-neutral, and express delivery mechanisms as opt-in projections.

## Decision

1. Introduce a canonical, deterministic, runtime-neutral verification command
   `agentic-repo verify`:
   - Flags tracked source changes that lack an `Accepted` ADR linkage.
   - Runs the existing deterministic knowledge lint.
   - Confirms the mandated end-of-task annealing block where applicable.
   - Performs no network calls, exits non-zero on violation, and supports
     `--json`.
2. Deliver enforcement as opt-in **projections that contain no logic beyond
   invoking `verify`**:
   - A CI adapter (GitHub Actions as the reference; other providers as thin
     wrappers) → shared, visible enforcement.
   - A local hook installer using `core.hooksPath` → transparent, machine-local
     enforcement.
3. Add a selection axis `--enforce ci|hooks|none` (default `none`, non-breaking),
   recording the chosen mode in scaffold metadata so `update` maintains it.
4. Preserve stealth: `hooks` combined with `--git-exclude` yields enforcement that
   is invisible to a client's tracked repository.
5. Codify honesty constraints so the feature does not over-promise (see NEG
   items).

## Consequences

### Positive

- **POS-001**: Converts the PRD/ADR discipline from advisory convention into a
  deterministic, opt-in guarantee.
- **POS-002**: One canonical definition of "compliant"; CI and hooks are portable
  thin wrappers with no duplicated policy, matching the `AGENTS.md` fallback
  invariant ("fall back to deterministic repository scripts or CI").
- **POS-003**: Serves both team (shared) and solo/restricted (transparent +
  stealth) scenarios from the same kit.

### Negative

- **NEG-001**: `verify` can only enforce ADR presence/acceptance, not that the
  decision was genuinely followed; semantic adherence remains a human
  responsibility.
- **NEG-002**: Transparent hooks require a one-time local `core.hooksPath`
  opt-in; they cannot be force-shared through a tracked directory.
- **NEG-003**: Additional generated surface (a command plus adapters) increases
  maintenance and cross-runtime validation scope.

### First vertical slice

Recommend shipping `agentic-repo verify` plus the CI-gate adapter first: it is the
lowest-risk slice and directly converts the ADR discipline into a shared
guarantee. The local hook installer follows as a second slice. Final slice order
is confirmed at acceptance.

## References

- **REF-001**: [PRD-0006](../product/prd-0006-governance-enforcement-modes.md)
- **REF-002**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)
- **REF-003**: [ADR-0005](adr-0005-local-git-exclude-for-restricted-repositories.md)
- **REF-004**: [ADR-0006](adr-0006-mandatory-annealing-closure-and-page-provenance.md)

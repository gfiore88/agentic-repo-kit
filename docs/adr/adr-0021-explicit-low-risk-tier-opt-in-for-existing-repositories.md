---
title: "ADR-0021: Explicit Low-Risk Tier Opt-In for Existing Repositories"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["update", "adr-gate", "fast-lane", "governance"]
supersedes: ""
superseded_by: ""
---

# ADR-0021: Explicit Low-Risk Tier Opt-In for Existing Repositories

## Status

**Accepted** by Giovanni Fiore on 2026-11-13. He replied "ook" to the request to
accept ADR-0021 together with the 0.10.0 release, the only decision pending at that
point.

## Context

Release 0.9.0 ships the low-risk tier
([ADR-0019](adr-0019-low-risk-adr-tier-with-per-task-review.md)). New repositories
get the default `lowRisk` policy through `init`. Existing repositories keep their
user-owned `docs/adr/gate.json` and adopt the tier only by adding the section by hand
(ADR-0019 NEG-004). The owner asked whether that step can be automated.

Two invariants constrain any automation:

- `update` never rewrites user-owned files
  ([ADR-0007](adr-0007-kernel-update-command-and-user-knowledge-preservation.md),
  [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md)).
- Only a human widens the ADR gate (ADR-0013,
  [PRD-0007](../product/prd-0007-fast-lane-task-approval.md)), and enabling the tier
  widens it.

A reproduction also found a gap in 0.9.0. A repository initialized with 0.6.0 has no
`gate.json`. When it runs `update` with 0.9.0, the file is created from the blueprint
with `lowRisk` included, so the tier becomes active without any opt-in. That
contradicts ADR-0019 POS-003 and NEG-004 and the 0.9.0 upgrade notes.

## Decision

1. **Explicit opt-in flag.** `update --enable-low-risk` adds the blueprint's default
   `lowRisk` section to `docs/adr/gate.json` as part of the confirmed update plan.
   - It honors `--dry-run`, `--yes`, and `--json`.
   - It keeps every existing key and never overwrites an existing `lowRisk` section.
   - It creates the file from the blueprint when it is missing.
   - It refuses, without writing anything, when the file is not valid JSON.

   Passing the flag is the human's explicit decision to widen the gate.
2. **Discoverable default.** When the section is missing, the update plan reports
   the tier as disabled and names the flag. Nothing changes without the flag.
3. **No silent enablement.** When `update` creates a missing `gate.json`, it leaves
   out `lowRisk` unless `--enable-low-risk` is given. `init` keeps the default policy
   for new repositories.
4. **Scriptable rollout.** The flag works non-interactively (`--yes --cwd <repo>`),
   so a loop can enable the tier across many repositories without editing files by
   hand.

## Consequences

### Positive

- **POS-001**: An existing repository adopts the tier with one command, with no
  hand-edited JSON.
- **POS-002**: The tier is never enabled without an explicit human action, which
  closes the 0.9.0 gap for repositories that had no `gate.json`.

### Negative

- **NEG-001**: Adding the section rewrites the gate file with standard two-space
  JSON formatting.
- **NEG-002**: Repositories that already received `lowRisk` through the 0.9.0 gap
  keep it. Their owners remove the section to disable the tier, as the changelog
  will explain.

## Alternatives Considered

### Add the section silently during `update`

- **ALT-001**: **Description**: Merge `lowRisk` into every existing `gate.json` on
  update.
- **ALT-002**: **Rejection Reason**: It rewrites a user-owned file and widens the
  gate without a human decision.

### Prompt interactively during `update`

- **ALT-003**: **Description**: Ask in the terminal whether to enable the tier.
- **ALT-004**: **Rejection Reason**: It is not scriptable and behaves differently
  in a terminal and in CI. A flag previewed with `--dry-run` covers the interactive
  case as well.

### A separate `gate` command

- **ALT-005**: **Description**: Add a dedicated command that edits `gate.json`.
- **ALT-006**: **Rejection Reason**: Adoption already runs through `update`, which
  also refreshes the projections that pass `--lines`, so one command keeps the
  rollout to a single step.

## Implementation Notes

- **IMP-001**: Add the `--enable-low-risk` argument. The update plan reports the
  gate state (enabled, disabled, invalid, or will be enabled), and the change is
  applied after the update is confirmed; `--json` output includes it.
- **IMP-002**: A `gate.json` created by `update` leaves out `lowRisk` unless the flag
  is set, and its lock hash matches the written content.
- **IMP-003**: Tests:
  - a missing `gate.json`, with and without the flag;
  - an existing `gate.json` without `lowRisk`: the flag adds it and keeps `exempt`
    and `routine`;
  - an existing `lowRisk` section stays unchanged;
  - invalid JSON is refused;
  - `--dry-run` writes nothing;
  - `init` keeps the default policy.
- **IMP-004**: Docs: the README, a changelog note telling owners who updated a
  pre-0.7.0 repository with 0.9.0 to check `gate.json`, and the kit wiki and log.
- **IMP-005**: Release as a minor version under its own release ADR.

## References

- **REF-001**: [ADR-0019](adr-0019-low-risk-adr-tier-with-per-task-review.md): the
  tier and its opt-in promise for existing repositories.
- **REF-002**: [PRD-0007](../product/prd-0007-fast-lane-task-approval.md): the
  product decision.
- **REF-003**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md)
  and [ADR-0007](adr-0007-kernel-update-command-and-user-knowledge-preservation.md):
  update semantics and the preservation of user-owned files.

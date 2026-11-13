---
title: "ADR-0030: Customized Kernel Files Are Reported, Not Unhealthy"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["doctor", "status", "update", "customization"]
supersedes: ""
superseded_by: ""
---

# ADR-0030: Customized Kernel Files Are Reported, Not Unhealthy

## Status

**Proposed**. Giovanni Fiore asked to proceed with this change ("ok procedi").
Implementation waits for his explicit acceptance of this ADR.

## Context

`doctor` lists a kernel file as divergent when its content differs from the hash in
`scaffold.lock`. Any divergent file makes the repository unhealthy, and `status`
then reports "Integrity: unhealthy".

Since [ADR-0028](adr-0028-automatic-three-way-merge-of-customized-kernel-files-on-update.md),
customizing kernel files is supported: `update` merges the owner's changes with the
kit's. A customized repository is therefore permanently unhealthy. After a
successful update, a client repository reported `divergent: 10` and
`Status: unhealthy`, and its owner was told to ignore it. A status that owners learn
to ignore also hides the real problems: missing kernel files, unresolved conflict
markers, and an unusable lock.

`doctor` is a diagnostic: hooks and CI run `verify`, which does not check
divergence. In repositories that keep the kit's files out of Git, such as client
repositories, the divergent list is the only place where changes to kernel
directives show up, so it must stay visible.

## Decision

1. **Customized is healthy.** `doctor` keeps listing the kernel files whose content
   differs from the lock (`divergent` in `--json`, unchanged) and labels them as
   customized in its text output. They no longer count against `ok`, which still
   fails for:
   - missing kernel files;
   - unresolved conflict markers;
   - an unusable lock.
2. **Pending kit changes.** `doctor` lists the lock entries that carry an older
   `kitVersion` (files that `update` kept because no base was available, ADR-0028)
   as pending. The next step is to run `update` when the registry is reachable.
   This is informational.
3. **Strict mode.** `doctor --strict` keeps the previous rule, under which any
   divergent kernel file is unhealthy, for teams that forbid customizing the kernel.
4. **Status.** `status` reports "Integrity: healthy (N customized)", and shows
   pending kit changes when there are any.

## Consequences

### Positive

- **POS-001**: "Unhealthy" again means that the kit cannot work as installed, so
  owners can trust it.
- **POS-002**: Customizations stay visible as a list and a count, which matters in
  repositories that keep the kit's files out of Git.
- **POS-003**: Files whose kit changes are still pending are no longer silent.

### Negative

- **NEG-001**: Scripts that relied on `doctor` failing on divergence must add
  `--strict`.
- **NEG-002**: An unapproved directive edit, for example by an agent, no longer
  turns `doctor` red; it appears only in the customized list. Directive changes stay
  governed by the annealing process and by code review where the kit's files are
  committed.

## Alternatives Considered

### Acknowledge customizations in the lock

- **ALT-001**: **Description**: Record the hash of each accepted customization, and
  flag only files that changed since the last update or acknowledgement.
- **ALT-002**: **Rejection Reason**: It adds lock state and an acknowledgement step,
  and every edit between updates would still be flagged. It can be revisited if
  owners need drift detection on top of the visible list.

### Keep divergence unhealthy

- **ALT-003**: **Description**: Leave `doctor` as it is.
- **ALT-004**: **Rejection Reason**: Every customized repository stays permanently
  unhealthy, which is the problem this ADR fixes.

### Stop reporting divergence

- **ALT-005**: **Description**: Drop the divergent list from `doctor`.
- **ALT-006**: **Rejection Reason**: In client repositories, it is the only signal
  that kernel directives changed.

## Implementation Notes

- **IMP-001**: `doctor` computes `ok` without `divergent` unless `--strict` is given,
  and adds `pending` (paths) to its result. The text output lists customized and
  pending files with their next steps. `args.mjs` accepts `--strict` for `doctor`
  only.
- **IMP-002**: `status` labels the integrity line with the customized count and
  shows pending kit changes; its JSON keeps the `integrity` fields.
- **IMP-003**: Tests: a divergent kernel file is healthy and listed, `--strict`
  fails on it, a carried lock entry is pending, and missing files, conflict markers,
  and an invalid lock stay unhealthy.
- **IMP-004**: Docs: the README, the changelog, the kit wiki, and the log.
- **IMP-005**: Release as a minor version under its own release ADR, because `ok`
  changes meaning.

## References

- **REF-001**: [ADR-0028](adr-0028-automatic-three-way-merge-of-customized-kernel-files-on-update.md):
  customized kernel files are merged on update.
- **REF-002**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md):
  lock-aware integrity checks.
- **REF-003**: [ADR-0026](adr-0026-untracked-kernel-warning-and-worktree-aware-git-metadata.md):
  the precedent of a `doctor` warning that does not change `ok`.

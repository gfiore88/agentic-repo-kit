---
title: "ADR-0025: Minor Release 0.11.0"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0025: Minor Release 0.11.0

## Status

**Proposed**. The release waits for explicit acceptance by Giovanni Fiore.

## Context

[ADR-0024](adr-0024-lock-diagnostics-and-explicit-adoption-without-scaffold-lock.md)
is merged on `main`. In the published 0.10.1, a repository that has the kernel but
lost its `scaffold.lock` has no recovery path. `update` refuses, reports every
unusable lock as "not found", and points to `init`, which stops on the first file
that differs. Until a release is on npm, owners of such repositories can only
rebuild the lock by hand.

The release adds `update --adopt` and fixes the lock messages of `update` and
`doctor`. No existing command or option is removed. `doctor --json` gains the
`lockState` and `hint` fields, and lists `scaffold.lock` under `missing` only when
the file is missing, not when it is unreadable or invalid.

## Decision

1. Release the ADR-0024 work as **0.11.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.11.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.11.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: Owners of a kernel that lost its lock recover it with one command,
  or more precisely by rebuilding the original lock as the README documents.
- **POS-002**: Every lock failure names its cause in `update` and `doctor` as soon
  as users run 0.11.0.

### Negative

- **NEG-001**: Scripts that read `doctor --json` and expect `missing` to contain
  `scaffold.lock` for an unreadable or invalid lock must read `lockState` instead.

## Alternatives Considered

### Patch release 0.10.2

- **ALT-001**: **Description**: Ship as a patch, because the message changes are
  fixes.
- **ALT-002**: **Rejection Reason**: The release also adds a new option,
  `update --adopt`.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. Then take a repository initialized with 0.6.0, remove its
  `scaffold.lock` and `scaffold.yaml`, and confirm two things:
  - `npx agentic-repo-kit@0.11.0 update` points to restoring the lock or to
    `--adopt`;
  - `update --adopt --runtime <ids> --force --yes` leaves `doctor` healthy.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0024](adr-0024-lock-diagnostics-and-explicit-adoption-without-scaffold-lock.md):
  the released work.
- **REF-002**: [ADR-0022](adr-0022-minor-release-0-10-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

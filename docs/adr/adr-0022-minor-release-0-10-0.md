---
title: "ADR-0022: Minor Release 0.10.0"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0022: Minor Release 0.10.0

## Status

**Accepted** by Giovanni Fiore on 2026-11-13. He replied "ook" to the request to
accept ADR-0021 together with the 0.10.0 release.

## Context

[ADR-0021](adr-0021-explicit-low-risk-tier-opt-in-for-existing-repositories.md) is
merged on `main`. It adds `update --enable-low-risk` and closes a gap in the
published 0.9.0. In repositories initialized before 0.7.0, `update` creates a
missing `gate.json` that includes `lowRisk`, which enables the low-risk tier without
opt-in. Until a fixed release is on npm, every such update keeps widening the gate
silently.

The release adds an option and fixes that defect. No existing command or option is
removed.

## Decision

1. Release the ADR-0021 work as **0.10.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.10.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.10.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: Existing repositories enable the tier with one explicit command.
- **POS-002**: `update` stops enabling the tier on its own as soon as users run
  0.10.0.

### Negative

- **NEG-001**: Repositories that already received `lowRisk` through the 0.9.0 gap
  keep it until their owners remove the section, as the changelog explains.

## Alternatives Considered

### Patch release 0.9.1

- **ALT-001**: **Description**: Ship as a patch because the most urgent part is a
  defect fix.
- **ALT-002**: **Rejection Reason**: The release also adds a new option.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. Then, on a repository initialized with 0.6.0, confirm that
  `npx agentic-repo-kit@0.10.0 update` creates `gate.json` without `lowRisk` and that
  `update --enable-low-risk` adds it.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0021](adr-0021-explicit-low-risk-tier-opt-in-for-existing-repositories.md):
  the released work.
- **REF-002**: [ADR-0020](adr-0020-minor-release-0-9-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

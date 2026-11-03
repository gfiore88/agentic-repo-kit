---
title: "ADR-0014: Minor Release 0.7.0"
status: "Accepted"
date: "2026-11-03"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0014: Minor Release 0.7.0

## Status

**Accepted** by Giovanni Fiore on 2026-11-03.

## Context

[ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md) changed
`update`, `exclude`, and `verify`, and made generated hook and CI projections pin
`agentic-repo-kit@<generating version>` while passing the new `verify --adr` and
`--routine` options. Until a release containing those options is on npm, repositories
generated from `main` pin `0.6.0`, which rejects them, so `--enforce` is unusable.

The changes add options and behavior (new flags, routine tier, skill profiles) and
tighten `update`, which now stops on user-modified kernel files instead of
overwriting them. No existing CLI option is removed.

## Decision

1. Release the ADR-0013 work as **0.7.0** (SemVer minor; the project is pre-1.0 and
   the `update` tightening is a safety fix with `--force` as the explicit escape).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.7.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.7.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: Generated enforcement projections become usable with the pinned verifier.
- **POS-002**: Existing users receive the overwrite protection on their next `update`.

### Negative

- **NEG-001**: Users who customized kernel files see `update` stop with conflicts;
  mitigated by the explicit conflict report and `--force`.
- **NEG-002**: Repositories generated with `--enforce` while on 0.6.0 keep the
  unpinned verifier until they run `update`.

## Alternatives Considered

### Patch release 0.6.1

- **ALT-001**: **Description**: Ship as a patch because most items are fixes.
- **ALT-002**: **Rejection Reason**: New options (`--adr`, `--routine`, `--profile`,
  `--force`) and the gate configuration file are additive features.

## Implementation Notes

- **IMP-001**: After publication verify `npm view agentic-repo-kit version` and run
  `npx agentic-repo-kit@0.7.0 verify --changed src/a.js --adr ADR-0001` in a
  scratch repository with an Accepted ADR-0001.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md)
- **REF-002**: [Release guide](../releasing.md)

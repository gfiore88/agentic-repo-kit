---
title: "ADR-0020: Minor Release 0.9.0"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0020: Minor Release 0.9.0

## Status

**Accepted** by Giovanni Fiore on 2026-11-13. He replied "ok" to the request to
approve ADR-0020 and publish 0.9.0, the only decision pending at that point.

## Context

[ADR-0019](adr-0019-low-risk-adr-tier-with-per-task-review.md), which implements
[PRD-0007](../product/prd-0007-fast-lane-task-approval.md), is merged on `main`.
Generated hook and CI projections now pass `verify --lines`, and the CI projection
passes `--require-reviews` for the default branch. They run the verifier pinned to
the kit version that generated them. Until a release that contains those options is
on npm, repositories generated from `main` pin 0.8.1, which rejects `--lines`, so
their enforcement fails. The same situation preceded the 0.7.0 release
([ADR-0014](adr-0014-minor-release-0-7-0.md)).

The release adds commands and options (`adr new --tier`, `adr review`, `verify
--lines`, `--require-reviews`) and a `lowRisk` policy in the blueprint `gate.json`.
No existing command or option is removed. Without a `lowRisk` section, existing
repositories behave as before.

## Decision

1. Release the ADR-0019 work as **0.9.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.9.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.9.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: New repositories get the low-risk tier, and enforced repositories
  pick up the line counts and the review gate after `update`.
- **POS-002**: Projections generated from `main` work again once they pin 0.9.0.

### Negative

- **NEG-001**: Existing repositories adopt the tier only by adding `lowRisk` to
  their user-owned `gate.json`, as the changelog explains.
- **NEG-002**: The merge gate blocks merges only where the governance check is
  required in branch protection; direct pushes are reported after the fact.

## Alternatives Considered

### Patch release 0.8.2

- **ALT-001**: **Description**: Ship as a patch.
- **ALT-002**: **Rejection Reason**: The release adds new commands and options.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. In a scratch repository initialized with 0.9.0:
  - confirm that the hook and CI pin `agentic-repo-kit@0.9.0`;
  - confirm that `adr new --tier low-risk` and `adr review` work through the pinned
    `npx` command;
  - confirm that `verify --lines` accepts the projection format.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0019](adr-0019-low-risk-adr-tier-with-per-task-review.md): the
  released work.
- **REF-002**: [ADR-0018](adr-0018-patch-release-0-8-1.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

---
title: "ADR-0031: Minor Release 0.14.0"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0031: Minor Release 0.14.0

## Status

**Proposed**. The release waits for explicit acceptance by Giovanni Fiore.

## Context

[ADR-0030](adr-0030-customized-kernel-files-are-reported-not-unhealthy.md) is merged
on `main`. In the published 0.13.0, `update` merges customized kernel files, but
`doctor` still reports every customized repository as unhealthy, so owners learn to
ignore its status.

The release changes the meaning of `doctor`'s `ok`, adds `doctor --strict`, and
reports pending kit changes in `doctor` and `status`. No command or option is
removed, and `doctor --json` gains `pending`.

## Decision

1. Release the ADR-0030 work as **0.14.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.14.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.14.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: A customized repository reports healthy, so "unhealthy" again points
  to a real problem.

### Negative

- **NEG-001**: Scripts that relied on `doctor` failing on customized files must add
  `--strict`.

## Alternatives Considered

### Patch release 0.13.1

- **ALT-001**: **Description**: Ship as a patch, because the change corrects a
  misleading status.
- **ALT-002**: **Rejection Reason**: It changes the meaning of `ok` and adds an
  option.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. Then, on a repository initialized with 0.10.1 and customized
  like the client repository, confirm two things with `npx agentic-repo-kit@0.14.0`:
  - after `update --yes`, `doctor` reports healthy and lists the customized files;
  - `doctor --strict` reports them as unhealthy.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0030](adr-0030-customized-kernel-files-are-reported-not-unhealthy.md):
  the released work.
- **REF-002**: [ADR-0029](adr-0029-minor-release-0-13-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

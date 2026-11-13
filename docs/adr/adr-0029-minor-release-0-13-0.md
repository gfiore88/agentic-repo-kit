---
title: "ADR-0029: Minor Release 0.13.0"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0029: Minor Release 0.13.0

## Status

**Proposed**. The release waits for explicit acceptance by Giovanni Fiore.

## Context

[ADR-0028](adr-0028-automatic-three-way-merge-of-customized-kernel-files-on-update.md)
is merged on `main`. In the published 0.12.0, every customized kernel file stops the
whole `update`. The owner can then only discard the change with `--force` or merge
by hand, after every release.

The release changes the default behavior of `update`: it merges customized files
instead of aborting. The release also adds conflict-marker checks to `doctor`,
`verify`, and `status`. No command or option is removed. `update --json` gains
`merged`, `conflicted`, `kept`, and `retained`, and its exit status is 1 while
conflict markers or kept files remain. `update` downloads the version recorded in
the lock when customized files need a base.

## Decision

1. Release the ADR-0028 work as **0.13.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.13.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.13.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: Owners who customize kernel files update with one command.
- **POS-002**: Repositories initialized with 0.7.0 or later merge at their next
  update, without migration.

### Negative

- **NEG-001**: `update` can now finish with conflict markers in a file. It reports
  them, exits with status 1, and `verify` blocks the commit until they are resolved.

## Alternatives Considered

### Major release 1.0.0

- **ALT-001**: **Description**: Treat the new default behavior of `update` as a
  breaking change.
- **ALT-002**: **Rejection Reason**: The kit is pre-1.0. The change removes no
  option, `--force` keeps its meaning, and repositories without customized files see
  no difference.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. Then, on a repository initialized with 0.10.1 and customized
  like the client repository, confirm that one `npx agentic-repo-kit@0.13.0 update
  --yes` merges `AGENTS.md`, keeps the other customizations, and exits 0.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0028](adr-0028-automatic-three-way-merge-of-customized-kernel-files-on-update.md):
  the released work.
- **REF-002**: [ADR-0027](adr-0027-minor-release-0-12-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

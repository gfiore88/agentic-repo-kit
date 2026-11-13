---
title: "ADR-0016: Minor Release 0.8.0"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0016: Minor Release 0.8.0

## Status

**Accepted** by Giovanni Fiore on 2026-11-13, who asked to align the repository with
the ADR-0015 work and then to "provvedere al rilascio" (proceed with the release).

## Context

[ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md) is merged on
`main`. Its generated `AGENTS.md` starts each session with `npx agentic-repo-kit
status`, which resolves only once a release containing `status` is on npm; until then
agents fall back to reading the log. Generated hook and CI projections pin the kit
version that generated them, so the stricter `verify` (every knowledge lint category,
unique ADR numbers) reaches enforced repositories only after a release and an
`update`.

The changes add a command (`status`) and an option (`--limit`), and tighten `verify`,
which now blocks on knowledge lint findings it previously ignored. No existing CLI
option is removed.

## Decision

1. Release the ADR-0015 work as **0.8.0** (SemVer minor). The project is pre-1.0,
   the new command is additive, and the stricter `verify` is a documented governance
   fix whose findings `knowledge lint` already reported.
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.8.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.8.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: The `status` session bootstrap resolves in generated repositories.
- **POS-002**: `update` pins hooks and CI to 0.8.0, which brings verify/lint parity
  and ADR number integrity to enforced repositories.

### Negative

- **NEG-001**: Repositories with wiki pages that predate ADR-0012 fail hooks and CI
  after `update`; mitigated by the changelog's upgrade notes and by `knowledge lint`,
  which already reports the same findings.
- **NEG-002**: Existing repositories keep their user-owned templates until they
  delete them and rerun `update`, as the changelog explains.

## Alternatives Considered

### Patch release 0.7.1

- **ALT-001**: **Description**: Ship as a patch because most items are fixes.
- **ALT-002**: **Rejection Reason**: `status` and `--limit` are additive features,
  and the stricter `verify` changes gate behavior.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance, run `npx agentic-repo-kit@0.8.0 status` in a scratch generated
  repository, and confirm that `init --enforce hooks` pins `agentic-repo-kit@0.8.0`.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md):
  the released work.
- **REF-002**: [ADR-0014](adr-0014-minor-release-0-7-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

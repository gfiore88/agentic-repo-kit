---
title: "ADR-0033: Minor Release 0.15.0"
status: "Proposed"
date: "2026-11-18"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0033: Minor Release 0.15.0

## Status

**Proposed**. Implementation waits for explicit acceptance by Giovanni Fiore.

## Context

[ADR-0032](adr-0032-branded-interactive-console-for-init-update-and-help.md) is merged
on `main`. In the published 0.14.0, `init`, `update`, and help print unstyled lines
in every context, and a successful `init` ends without saying what to do next.

The release adds a branded layout for those three commands in interactive
terminals. Plain output (pipes, CI, `TERM=dumb`, and `--json`) and every other
command are unchanged byte for byte. No command, option, prompt, or exit code
changes, and the package keeps no dependencies and no install scripts.

## Decision

1. Release the ADR-0032 work as **0.15.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.15.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.15.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: The first run of the published package shows the kit's identity,
  and a successful `init` ends with the next steps.

### Negative

- **NEG-001**: Agent runtimes that run `init` or `update` in a terminal see the
  branded layout; `--json`, `TERM=dumb`, or `CI=1` keep plain text.

## Alternatives Considered

### Patch release 0.14.1

- **ALT-001**: **Description**: Ship as a patch, because nothing that scripts rely
  on changes.
- **ALT-002**: **Rejection Reason**: The release adds user-visible functionality:
  the interactive layout and the next steps after `init`.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance. Then confirm with `npx agentic-repo-kit@0.15.0`:
  - under a pseudo-terminal, `init` shows the header and the next steps;
  - piped, `update --yes` updates a repository initialized with 0.14.0 and prints
    plain text without escape codes.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0032](adr-0032-branded-interactive-console-for-init-update-and-help.md):
  the released work.
- **REF-002**: [ADR-0031](adr-0031-minor-release-0-14-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

---
title: "ADR-0027: Minor Release 0.12.0"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore and implementation agent"
tags: ["release", "npm", "semver"]
supersedes: ""
superseded_by: ""
---

# ADR-0027: Minor Release 0.12.0

## Status

**Proposed**. The release waits for explicit acceptance by Giovanni Fiore.

## Context

[ADR-0026](adr-0026-untracked-kernel-warning-and-worktree-aware-git-metadata.md) is
merged on `main`. In the published 0.11.0:

- kit files that are neither committed nor excluded go unnoticed, and in a client
  repository that state most likely led to deleting `scaffold.lock`;
- in a linked worktree, `--git-exclude`, `exclude`, and `--enforce hooks` report
  success, but Git reads neither the exclusions nor the hooks path, so the kit files
  stay visible and the pre-push gate never runs.

The release adds a `doctor` warning, which `status` also shows, and fixes the
worktree failures. `update` moves the exclusions that earlier versions left in a
worktree's own directory. No existing command or option is removed. `doctor --json`
gains the `untracked` and `trackingChecked` fields, and `status --json` gains
`kernel.untracked` and `kernel.trackingChecked`.

## Decision

1. Release the ADR-0026 work as **0.12.0** (SemVer minor).
2. Follow [the release guide](../releasing.md): move `[Unreleased]` to `[0.12.0]` in
   `CHANGELOG.md`, run `npm run validate`, run
   `npm version minor -m "chore(release): %s"` (the `version` script syncs
   `plugin.json`), push `main` and tag `v0.12.0`, and publish the GitHub release so
   `publish.yml` publishes through Trusted Publishing.
3. No file under `.github/workflows/**` changes, so the push needs no `workflow`
   token scope.

## Consequences

### Positive

- **POS-001**: Owners learn that kit files sit outside Git before the files are
  deleted or committed by mistake.
- **POS-002**: Local exclusions and the hook gate work in linked worktrees, and one
  `update` repairs worktrees set up by earlier versions.

### Negative

- **NEG-001**: Repositories that ignore kit files with their own `.gitignore` rules
  see the warning until they run `exclude`.

## Alternatives Considered

### Patch release 0.11.1

- **ALT-001**: **Description**: Ship as a patch, because the worktree changes are
  fixes.
- **ALT-002**: **Rejection Reason**: The release also adds the `doctor` warning and
  new JSON fields.

## Implementation Notes

- **IMP-001**: After publication, verify `npm view agentic-repo-kit version` and the
  package provenance, then check with `npx agentic-repo-kit@0.12.0`:
  - in a repository whose kit files are neither committed nor excluded, `doctor`
    warns and `exclude` clears the warning;
  - in a linked worktree initialized with 0.11.0 and `--git-exclude`, `update`
    hides the kit files from `git status` and sets the hooks path that Git reads.
- **IMP-002**: Record the release in `docs/wiki/log.md`.

## References

- **REF-001**: [ADR-0026](adr-0026-untracked-kernel-warning-and-worktree-aware-git-metadata.md):
  the released work.
- **REF-002**: [ADR-0025](adr-0025-minor-release-0-11-0.md): release precedent.
- **REF-003**: [Release guide](../releasing.md)

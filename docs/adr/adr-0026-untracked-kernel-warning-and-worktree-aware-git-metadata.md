---
title: "ADR-0026: Untracked Kernel Warning and Worktree-Aware Git Metadata"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["doctor", "status", "exclude", "hooks", "git", "client-repositories"]
supersedes: ""
superseded_by: ""
---

# ADR-0026: Untracked Kernel Warning and Worktree-Aware Git Metadata

## Status

**Accepted** by Giovanni Fiore on 2026-11-13. He approved the idea ("ti do l'ok per
l'idea futura"), then, asked how to proceed with this ADR, chose "Accetto l'ADR-0026
insieme al rilascio 0.12.0" ("I accept ADR-0026 together with the 0.12.0 release").

## Context

The kit's files must not be committed to a client repository. In one such
repository they were neither committed nor excluded, so `git status` listed them as
untracked. `scaffold.lock` and `scaffold.yaml` were deleted, most likely to clean
that status, which left `update` without a lock
([ADR-0024](adr-0024-lock-diagnostics-and-explicit-adoption-without-scaffold-lock.md)).
Untracked kit files can also be committed to a client repository by mistake.

Kit files are safe in two states:

- committed, the default for repositories the team owns;
- excluded with `--git-exclude` or `exclude`, for restricted and client repositories
  ([ADR-0005](adr-0005-local-git-exclude-for-restricted-repositories.md)).

Nothing reports the third state. `doctor` checks integrity against the lock, and
`status` reuses `doctor`.

Reproductions in a linked worktree (`git worktree add`) found two silent failures.
The worktree's `.git` file points to a per-worktree Git directory, but Git reads
`info/exclude` and `config` from the common directory:

- `--git-exclude` and `exclude` write the managed block to the per-worktree
  `info/exclude`. The CLI reports "Applied local exclusions", but the kit files stay
  visible to Git.
- `--enforce hooks` writes `core.hooksPath` to the per-worktree `config`. The CLI
  reports the hooks as installed, but Git sees no hooks path, so the pre-push gate
  never runs.

The CLI runs no subprocess. `status` makes no subprocess calls
([ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md)), and
`status` calls `doctor`. Asking `git` which files are untracked would break that
guarantee.

## Decision

1. **Worktree-aware Git metadata.** The managed exclude block and `core.hooksPath`
   are written to the common Git directory. That is the directory named by the
   `commondir` file of a linked worktree's Git directory, or the Git directory
   itself otherwise.
2. **Untracked kernel warning.** When the repository has a readable Git index,
   `doctor` checks `scaffold.lock` and the managed files. It lists every one that
   exists on disk, is absent from the index, and is not matched by the managed
   exclude block. It prints the count, a few examples, and the next step: commit
   them, or run `exclude` when they must stay out of Git. The warning does not
   change `ok`, because the kernel itself is intact.
3. **Status shows it.** `status` reports the count in its kernel section.
4. **Subprocess-free detection.** A small reader for the Git index provides the
   tracked paths. It supports index versions 2 to 4 and SHA-1 and SHA-256
   repositories. The check is skipped, and reported as not performed, when:
   - the index is missing or unreadable;
   - the index format is unsupported, as with a split or sparse index.

## Consequences

### Positive

- **POS-001**: The state that led to the lost lock is reported before files are
  deleted or committed by mistake.
- **POS-002**: Local exclusions and the hook gate work in linked worktrees, instead
  of failing while reporting success.
- **POS-003**: The CLI stays subprocess-free, as ADR-0015 requires for `status`.

### Negative

- **NEG-001**: Only the managed exclude block counts as an exclusion. Kit files that
  the owner ignores with other rules (`.gitignore`, `core.excludesFile`) are
  reported; running `exclude` clears the warning.
- **NEG-002**: The index reader is new code to maintain, and repositories with a
  split or sparse index get no check.
- **NEG-003**: Right after `init`, before the first commit, `doctor` shows the
  warning. This is intended: it asks the owner to choose between committing and
  excluding.
- **NEG-004**: Existing linked worktrees keep the per-worktree copies that earlier
  versions wrote. Running `exclude` (or `update` with exclusions active) writes the
  block where Git reads it.

## Alternatives Considered

### Ask Git

- **ALT-001**: **Description**: Run `git ls-files --others --exclude-standard` to
  list untracked, non-ignored kit files.
- **ALT-002**: **Rejection Reason**: It adds a subprocess to `doctor` and therefore
  to `status`, against ADR-0015, and needs `git` on the PATH.

### Mark the repository unhealthy

- **ALT-003**: **Description**: Make `doctor` fail while kit files are untracked and
  not excluded.
- **ALT-004**: **Rejection Reason**: The kernel is intact, and every fresh `init`
  would fail `doctor` until the first commit.

### Guidance at `init` only

- **ALT-005**: **Description**: Print the choice between committing and excluding
  after `init`.
- **ALT-006**: **Rejection Reason**: It does not catch drift after initialization,
  as in the client repository where the files stayed untracked.

## Implementation Notes

- **IMP-001**: `exclude.mjs` and `hooks.mjs` resolve the common directory through
  the `commondir` file. Tests build a linked-worktree layout (a `.git` file and a
  `commondir` file) without running `git`.
- **IMP-002**: An index reader module returns the tracked paths, or `null` when the
  check cannot run. Tests use synthetic index files:
  - version 2;
  - version 3 with extended flags;
  - version 4 with prefix compression;
  - SHA-256 hashes;
  - split and sparse index extensions.
- **IMP-003**: `doctor --json` gains `untracked` (array) and `trackingChecked`
  (boolean). The text output adds a notice line and a next-step line. `status` shows
  the count.
- **IMP-004**: Docs: the README sections on `doctor` and exclusions, the changelog,
  the kit wiki, and the log.
- **IMP-005**: Release as a minor version under its own release ADR.

## References

- **REF-001**: [ADR-0005](adr-0005-local-git-exclude-for-restricted-repositories.md):
  local exclusions for restricted repositories.
- **REF-002**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md):
  exclusions derived from the lock.
- **REF-003**: [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md):
  `status` makes no subprocess calls.
- **REF-004**: [ADR-0024](adr-0024-lock-diagnostics-and-explicit-adoption-without-scaffold-lock.md):
  recovery when the lock is lost.
- **REF-005**: [ADR-0008](adr-0008-governance-verification-and-enforcement-adapters.md):
  the hook enforcement projection.

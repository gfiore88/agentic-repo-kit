---
title: "ADR-0013: Lock-Aware Update and Governance Gate Hardening"
status: "Accepted"
date: "2026-11-03"
authors: "Giovanni Fiore and implementation agent"
tags: ["update", "exclude", "verify", "enforcement", "supply-chain", "agents", "profiles"]
supersedes: ""
superseded_by: ""
---

# ADR-0013: Lock-Aware Update and Governance Gate Hardening

## Status

**Accepted** by Giovanni Fiore on 2026-11-03, who reviewed the findings of the
2026-11-03 repository review and explicitly instructed the agent to fix all of them.

## Context

A repository review reproduced the following defects in clean temporary repositories:

1. `update` silently overwrote user edits to kernel-managed files such as `AGENTS.md`
   and `CLAUDE.md`, contradicting the "never silently overwrite" invariant, although
   `scaffold.lock` already records the SHA-256 of every file the kit wrote.
2. `update` in a never-initialized repository replaced pre-existing files (for example
   an existing `AGENTS.md`) without the preflight conflict check that `init` applies.
3. `--git-exclude` used a hand-maintained pattern list that had drifted from the
   generated files: `.claude/agents/`, `.codex/`, `.gemini/`, `.cursor/rules/`, and
   `opencode.json` stayed visible to Git in restricted client repositories.
4. `verify --changed` treated kit-generated adapter files as application source, so
   running `update` itself tripped the ADR gate.
5. The ADR gate was satisfied by *any* Accepted ADR in the change set, could not be
   satisfied by follow-up work implementing an earlier Accepted ADR, and new-branch
   pushes skipped the gate entirely.
6. Generated hooks and CI ran `npx --yes agentic-repo-kit` unpinned, executing
   whatever version was latest at push time.
7. `update` never removed files dropped from the plan (runtime or enforcement
   changes, retired agents).
8. Plugin-level `agents/`, `references/`, and `commands/` duplicate blueprint files
   with no drift check, and `plugin.json` reported `0.4.0` while the package was
   `0.6.0`.
9. The specialist registry carried overlapping roles (`security-reviewer` vs
   `security-auditor`, `qa-test-engineer` vs `test-engineer`) and an unclear boundary
   between `code-reviewer` (architecture axis) and `software-architect`.
10. Every installation received all 31 skills even when only the governance kernel
    was wanted.
11. README defects: a broken "Core Pillars" anchor and a stale `.cursorrules` claim.
12. Requiring a full ADR for trivial work (lockfile refreshes, dependency bot
    updates) invites rubber-stamping, and the gate had no project-specific exempt
    paths.

No product outcome changes; following the ADR-0010/0011 precedent, no PRD is
required.

## Decision

1. **Lock-aware update.** `update` classifies each kernel-owned file against the
   previous `scaffold.lock`: content equal to the new plan is unchanged; content
   matching the previously locked hash is safely updated; anything else is a
   user-modified conflict. Conflicts abort the update before any write unless
   `--force` is passed. User-owned documentation paths remain preserved.
2. **Update requires a lock.** Without `scaffold.lock`, `update` refuses and directs
   the user to `init`, which owns first-time conflict preflight.
3. **Orphan cleanup.** Kernel-owned files listed in the previous lock but absent from
   the new plan are removed when unmodified, and reported and kept when modified.
4. **Plan-derived exclusions.** `.git/info/exclude` patterns are derived from the
   lock's managed files (root-anchored), plus kit-owned growth directories
   (`/.agents/`, `/docs/{raw,wiki,adr,product,specs,templates}/`). The static list is
   only a fallback for repositories without a lock.
5. **Managed files are not source.** `verify` treats every path in
   `scaffold.lock.managedFiles` as non-source for the ADR gate.
6. **Explicit ADR references.** `verify --adr <ids>` accepts referenced ADR numbers;
   each must exist and be `Accepted`. Generated hooks and CI extract `ADR-NNNN`
   references from the pushed commit messages (and the PR title/body). An Accepted
   ADR present in the change set still satisfies the gate for backward
   compatibility. Follow-up work inside an Accepted ADR's scope references it instead
   of creating a duplicate ADR; routine work uses the
   routine tier of decision 13.
7. **New-branch coverage.** Hooks and CI diff a new branch against its merge-base
   with the remote default branch instead of skipping the gate.
8. **Pinned verifier.** Generated hooks and CI invoke
   `agentic-repo-kit@<generating version>`; `update` refreshes the pin. The hook
   detaches `npx` from the hook's stdin.
9. **Single-source assets.** `validate:plugin` fails when a plugin-level copy differs
   from its blueprint counterpart or when `plugin.json` and `package.json` versions
   differ.
10. **Registry consolidation.** Retire the native `security-reviewer` and
    `qa-test-engineer`; the registry routes to the imported `security-auditor` and
    `test-engineer` and carries the kernel-specific handoff obligations. Keep
    `code-reviewer` and `software-architect` as distinct roles with an explicit
    boundary: the architect decides before implementation; the reviewer evaluates a
    diff after it and hands uncovered architectural findings to the architect.
11. **Skill profiles.** `--profile core|full` (default `full`). `core` installs only
    the governance kernel skills and omits the imported command pack; the profile is
    recorded in `scaffold.yaml`/`scaffold.lock` and maintained by `update`.
12. **README.** Restore the "Core Pillars" heading and describe the Cursor adapter
    as `.cursor/rules/agentic-kernel.mdc`.
13. **Routine tier and exempt paths.** A human-owned `docs/adr/gate.json` (shipped
    with conservative defaults and preserved by `update`) defines `exempt` globs that
    never need an ADR and `routine` globs eligible for the lightweight routine tier.
    The tier is declared with an `ADR: routine` commit line (`verify --routine`),
    requires every source change to match a `routine` glob and the change set to
    include `docs/wiki/log.md`, and creates no ADR. An Accepted ADR always takes
    precedence. Only a human widens either list.

## Consequences

### Positive

- **POS-001**: User customizations of kernel files can no longer be lost silently.
- **POS-002**: `--git-exclude` stays correct as adapters evolve.
- **POS-003**: The ADR gate is harder to bypass, no longer fires on kit upgrades,
  and supports follow-up work without ADR duplication.
- **POS-004**: Enforcement no longer executes an unreviewed latest release.

### Negative

- **NEG-001**: Users who intentionally customized kernel files must resolve
  conflicts or pass `--force` on update; mitigated by an explicit conflict report.
- **NEG-002**: The pinned verifier must be refreshed through `update` to pick up
  newer verify semantics.
- **NEG-003**: Referencing an old Accepted ADR in a commit message remains a
  social, not cryptographic, control; the gate is a convention aid, not a security
  boundary.

## Alternatives Considered

### Write `.new` side files on update conflicts

- **ALT-001**: **Description**: Keep the user's file and write the new version beside it.
- **ALT-002**: **Rejection Reason**: Leaves the repository in a half-upgraded state
  that `doctor` cannot describe; an atomic abort with `--force` is simpler.

### Require a fresh ADR for every follow-up change

- **ALT-003**: **Description**: Keep the "any ADR in the change set" rule.
- **ALT-004**: **Rejection Reason**: Produces ADR fatigue and duplicate ADRs while
  remaining bypassable by touching an unrelated Accepted ADR.

## Implementation Notes

- **IMP-001**: `writer.mjs`, `cli.mjs`, `args.mjs`: lock-aware classification,
  `--force`, lock requirement, orphan removal, `--profile`.
- **IMP-002**: `exclude.mjs`: lock-derived anchored patterns.
- **IMP-003**: `verify.mjs`, `plan.mjs`: managed-file exemption, `--adr`, pinned
  and merge-base-aware hook/CI projections.
- **IMP-004**: Blueprint registry, `AGENTS.md`, decision gates, task lifecycle.
- **IMP-005**: `validate-plugin.mjs` drift and version checks; README; tests for
  every reproduced defect; wiki, log, and changelog.

## References

- **REF-001**: [ADR-0005](adr-0005-local-git-exclude-for-restricted-repositories.md) — exclude block format kept.
- **REF-002**: [ADR-0007](adr-0007-kernel-update-command-and-user-knowledge-preservation.md) — update semantics hardened here.
- **REF-003**: [ADR-0008](adr-0008-governance-verification-and-enforcement-adapters.md) — verify engine and projections extended here.

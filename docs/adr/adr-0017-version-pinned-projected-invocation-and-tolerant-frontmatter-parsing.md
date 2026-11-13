---
title: "ADR-0017: Version-Pinned Projected Invocation and Tolerant Frontmatter Parsing"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["cli", "invocation", "generated-repositories", "verify", "knowledge-lint", "parsing"]
supersedes: ""
superseded_by: ""
---

# ADR-0017: Version-Pinned Projected Invocation and Tolerant Frontmatter Parsing

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

## Context

During the 0.8.0 publication check ([ADR-0016](adr-0016-minor-release-0-8-0.md)),
the unpinned `npx agentic-repo-kit status` ran a stale global 0.6.0 install and
failed with `Unknown command: status`. A simulated global prefix reproduces it: the
unpinned command fails, while `npx --yes agentic-repo-kit@0.8.0 status` works.
[ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md) decision 1
made projected content use the unpinned form plus a note about the global
`agentic-repo` alias. Both resolve to whatever version is installed globally or
published as latest, not to the version that generated the repository. Hooks and CI,
by contrast, have pinned the generating version since
[ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md).

Three constraints shape the fix:

- `docs/adr/README.md` is user-owned, and `update` preserves it, so a pinned version
  written there would go stale.
- When stdin is a TTY, `npx` asks for confirmation before installing a version it has
  not cached. After every version bump, that prompt can stall an agent's terminal.
- The vendored and kernel skill sources double as the Codex plugin, which must stay
  version-free.

The same review confirmed two parsing defects:

1. `verify` reads ADR frontmatter only with LF line endings. In a CRLF checkout it
   reports every ADR as having a "missing or invalid status", and the `status`
   digest shows no status. This already blocked hooks and CI.
2. Frontmatter values with a trailing YAML comment are read literally:
   - `type: concept   # note` is reported as an invalid type;
   - `status: "Accepted"  # note` is reported as an invalid status;
   - `sources: # none` counts as a non-empty list.

   Since ADR-0015 made `verify` enforce frontmatter issues, the first two now block
   hooks and CI.

No product outcome changes; following the ADR-0013 and ADR-0015 precedent, no PRD is
required.

## Decision

1. **Pinned invocation.** When generating files, `plan.mjs` rewrites every
   `npx agentic-repo-kit` invocation in kernel-owned projected files to
   `npx --yes agentic-repo-kit@<generating version>`. These are the files that
   `update` refreshes, excluding `.agents/upstream/`. The pin is the same one that
   hooks and CI use, and `update` refreshes it. When the kit version is unknown, the
   unpinned `npx --yes agentic-repo-kit` form is used. Sources keep the version-free
   form.
2. **One invocation form.** Projected content no longer suggests the bare
   `agentic-repo` alias, because a global install can be stale. The README and the
   CLI help still document the alias for humans. This amends ADR-0015 decision 1.
3. **No stale pins in preserved files.** User-owned generated files under `docs/`,
   which `update` never rewrites, contain no CLI invocation. `docs/adr/README.md`
   names the commands instead.
4. **CRLF-tolerant ADR status.** `verify`, and therefore `status`, parses ADR
   frontmatter with either line ending.
5. **YAML comment rules for frontmatter scalars.** An unquoted value ends at
   whitespace followed by `#`, and a quoted value ends at its closing quote. This
   applies to the required keys and `sources` in `knowledge lint`, to the ADR status
   in `verify`, and to the fields that the `status` digest reads.

## Consequences

### Positive

- **POS-001**: Agents run the version of the kernel that generated the repository,
  whatever is installed globally, so instructions, hooks, and CI agree.
- **POS-002**: After an update, no interactive `npx` prompt can stall an agent.
- **POS-003**: CRLF checkouts and commented frontmatter no longer cause false gate
  failures.

### Negative

- **NEG-001**: Every release changes the pinned files, so each `update` rewrites
  them. As designed in ADR-0013, files that a user modified are reported as
  conflicts.
- **NEG-002**: After each update, every machine fetches the pinned version once,
  which needs network access or a populated cache, as hooks and CI already do.
- **NEG-003**: An unquoted title that contains ` #` now ends at the `#`. Quoting the
  value keeps the literal text.

## Alternatives Considered

### Keep the unpinned form and ask users to upgrade global installs

- **ALT-001**: **Description**: Document that a global install must match the latest
  release.
- **ALT-002**: **Rejection Reason**: Correctness would depend on every machine
  keeping its global install current, and agents would still run an unreviewed latest
  release.

### Literal versions in the skill sources

- **ALT-003**: **Description**: Write `agentic-repo-kit@<version>` into the sources
  and bump it at release time.
- **ALT-004**: **Rejection Reason**: Every release would edit skill sources, and the
  Codex plugin, which reads the sources directly, would pin itself to its own
  version.

### A template placeholder in the sources

- **ALT-005**: **Description**: Write a placeholder such as `{{kitVersion}}` in the
  sources and substitute it during generation.
- **ALT-006**: **Rejection Reason**: The placeholder would leak into the Codex plugin.
  Rewriting the canonical `npx agentic-repo-kit` form keeps the sources valid
  unchanged.

## Implementation Notes

- **IMP-001**: `plan.mjs`: substitution for kernel-owned files, with tests showing
  that kernel-owned files contain only pinned invocations, that user-owned files
  contain none, and that the fallback applies when the version is unknown.
- **IMP-002**: Content: drop the alias from `AGENTS.md`, the
  `curate-project-knowledge` skill, and the knowledge lint workflow; name commands in
  `docs/adr/README.md`.
- **IMP-003**: Parsing: CRLF-tolerant and comment-aware ADR status in `verify.mjs`, a
  shared scalar helper in `knowledge.mjs` that `status.mjs` reuses, and regression
  tests.
- **IMP-004**: Docs: the README, a CHANGELOG `Unreleased` entry, and the kit wiki
  (resolve the open question and add a log entry).
- **IMP-005**: Validation: the verification baseline, plus a generated instruction
  that works even with a simulated stale global install.
- **IMP-006**: Release as a follow-up patch under its own release ADR.

## References

- **REF-001**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md):
  the pinned verifier that this decision extends to instructions.
- **REF-002**: [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md):
  decision 1 is amended.
- **REF-003**: [ADR-0016](adr-0016-minor-release-0-8-0.md): the publication check
  that found the stale global install.

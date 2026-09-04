---
title: "ADR-0010: Release Workflow Token-Scope Note and Actions Currency Follow-up"
status: "Accepted"
date: "2026-09-04"
authors: "Giovanni Fiore and implementation agent"
tags: ["ci", "github-actions", "documentation", "release", "maintenance"]
supersedes: ""
superseded_by: ""
---

# ADR-0010: Release Workflow Token-Scope Note and Actions Currency Follow-up

## Status

**Accepted**. Giovanni Fiore accepted this ADR on 2026-09-04, approving the
`docs/releasing.md` token-scope note and the `upload-artifact@v4 → @v5` currency
follow-up in the `ci-cd-and-automation` skill.

## Context

Two small hygiene items surfaced during the `0.5.1` release annealing and were
deliberately deferred out of ADR-0009's scope:

1. **Undocumented release constraint.** Pushing a release that modifies files
   under `.github/workflows/**` requires a token with the `workflow` OAuth scope.
   During the `0.5.1` push this blocked the release until the `gh` token was
   refreshed with `workflow`. The constraint is currently tribal knowledge and is
   not captured in `docs/releasing.md`.
2. **Residual Node 20 action.** ADR-0009 bumped `actions/checkout` and
   `actions/setup-node` to `@v5` but explicitly excluded `actions/upload-artifact`,
   which still appears at `@v4` (a Node 20 major) in the `ci-cd-and-automation`
   skill example. `upload-artifact@v5.0.0` (2025-10-24) is the first major on
   Node 24, mirroring the ADR-0009 convention.

Both items are documentation/example changes with no runtime behavior impact on
generated repositories, but item 2 touches canonical skill content, so the change
is governed rather than incidental.

No product scope changes, so a PRD is not required.

## Decision

1. Add a note to the "Subsequent releases" section of `docs/releasing.md` stating
   that releases touching `.github/workflows/**` require a token with the
   `workflow` scope, and that using `gh` as the git credential helper (after
   `gh auth refresh -s workflow`) satisfies this.
2. Bump `actions/upload-artifact` from `@v4` to `@v5` in the
   `ci-cd-and-automation` skill example, completing the Node 24 currency pass
   begun in ADR-0009 and keeping the floating-major-tag convention.
3. Ship both as a single documentation/patch change; no separate release is
   required unless bundled with future functional work.

## Consequences

### Positive

- **POS-001**: Captures the `workflow`-scope release constraint so future releases
  do not rediscover it under pressure.
- **POS-002**: Removes the last Node 20 action reference in kit-authored examples,
  keeping guidance consistent with ADR-0009.
- **POS-003**: Minimal, low-risk change with a small validation surface.

### Negative

- **NEG-001**: The `releasing.md` note encodes a GitHub-specific auth detail that
  may drift if GitHub changes its scope model; mitigated by its location in a
  release-operations doc that is reviewed at release time.
- **NEG-002**: A currency follow-up sets an expectation of periodic action-version
  maintenance across skills; acceptable given the small surface.

## Alternatives Considered

### Leave both items undocumented / unchanged

- **ALT-001**: **Description**: Rely on memory for the `workflow` scope and leave
  `upload-artifact@v4` in the example.
- **ALT-002**: **Rejection Reason**: The scope constraint already caused a release
  stall, and a stale Node 20 example undercuts the guidance shipped in ADR-0009.

### Split into two separate ADRs

- **ALT-003**: **Description**: One ADR for the doc note, one for the action bump.
- **ALT-004**: **Rejection Reason**: Both are minor, share the `0.5.1` release
  context, and are cheaper to review and validate together.

## Implementation Notes

- **IMP-001**: Edit `docs/releasing.md` (Subsequent releases) and the
  `upload-artifact@v4` line in
  `plugins/agentic-repo/skills/ci-cd-and-automation/SKILL.md`.
- **IMP-002**: Run `npm run validate`; the change is docs/skill-only, so no
  regenerated-projection dogfooding is required beyond a green validation.
- **IMP-003**: Record the change in the wiki log; success = green validation and
  no remaining kit-authored `@v4` action references except intentionally pinned
  ones.

## References

- **REF-001**: [ADR-0009](adr-0009-github-actions-node24-runtime-currency.md) —
  the Node 24 currency decision this follows up.
- **REF-002**: [ADR-0003](adr-0003-npm-publication-license-and-release-automation.md)
  — Trusted Publishing and release automation context.
- **REF-003**: `docs/releasing.md` — release operations guide amended by IMP-001.

---
title: "ADR-0019: Low-Risk ADR Tier with Per-Task Review"
status: "Proposed"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["governance", "adr-gate", "verify", "fast-lane", "review"]
supersedes: ""
superseded_by: ""
---

# ADR-0019: Low-Risk ADR Tier with Per-Task Review

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Implementation waits for the approval of
[PRD-0007](../product/prd-0007-fast-lane-task-approval.md) and the acceptance of
this ADR.

## Context

[PRD-0007](../product/prd-0007-fast-lane-task-approval.md) asks for a low-risk tier
that removes the per-task approval stop.

- A task enters the tier automatically when it stays within human-defined
  thresholds: at most 5 changed files and 200 changed lines, with tests whenever
  code changes.
- It must also stay outside five excluded categories: security, new dependencies,
  public APIs, data migrations, and governance files.
- A human reviews every tier-accepted ADR afterwards. One explicit approval that
  names the task records the review for that task only.
- CI blocks merges to the default branch while a review is pending. A rejected
  review reverts the change by default.

The current gate gives a starting point
([ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md)):

- `verify` receives the changed paths, ADR references, and the routine flag from
  its callers, and runs no subprocess.
- The human-owned `docs/adr/gate.json` already holds the `exempt` and `routine`
  globs.

Two gaps remain. `verify` has no line counts, and it cannot tell whether a change is
heading for the default branch.

## Decision

1. **Policy in `gate.json`.** A human-owned `lowRisk` section holds `maxFiles`
   (default 5), `maxLines` (default 200), `tests` (globs that identify test files),
   and `exclude`, which maps each excluded category to globs: `security`,
   `dependencies`, `publicApi`, `migrations`, and `governance`. The governance globs
   cover `AGENTS.md`, `.agents/**`, `docs/adr/gate.json`, adapter files,
   `.github/workflows/**`, and the scaffold metadata. The blueprint ships these
   conservative defaults. A repository without a `lowRisk` section has the tier
   disabled, and only a human widens the section.
2. **Tier ADRs.** `adr new --tier low-risk --title "<title>"` creates the task ADR
   with:
   - `status: "Accepted"`, `tier: "low-risk"`, and `review: "pending"`;
   - an eligibility section listing the changed files, the line count, the tests,
     and the exclusion check.

   Before using the tier, the agent also classifies what no path reveals, such as
   public API semantics and security impact. If in doubt, it creates a normal
   `Proposed` ADR and stops.
3. **Eligibility check.** When a change set relies on a tier ADR, `verify` fails
   closed unless all of these hold:
   - the number of changed source files is within `maxFiles`;
   - the caller-supplied `--lines <n>` is within `maxLines` (an unknown line count
     makes the change ineligible);
   - at least one changed file matches `tests` whenever a non-test source file
     changes;
   - no changed file, including documentation and governance paths, matches an
     `exclude` glob.
4. **Review evidence.** The agent records a review only from the human's own message
   in the current conversation. That message must explicitly approve or reject and
   name the task or its ADR, and it covers that ADR alone. The record sets `review`
   to `approved` or `rejected`, together with `reviewed_by`, `reviewed_on`, and the
   verbatim `review_quote`. A vague reply leaves the review pending.
5. **Merge gate.** With `--require-reviews`, `verify` reports every tier ADR in the
   change set, or referenced by it, whose review is pending, rejected, or incomplete.
   The generated CI projection passes the flag only for pull requests into, and
   pushes to, the default branch. The pre-push hook never passes it, so local agent
   work never stops.
6. **Rejection.** A rejected review reverts the change and sets the ADR to
   `Rejected`. A follow-up ADR that fixes the change forward is created only when the
   reviewer asks for it.
7. **Projections and visibility.**
   - The hook and CI projections compute `--lines` from `git diff --numstat` over the
     changed files. Binary files count as one line.
   - `status` lists the tier ADRs that wait for review ahead of the other records.
8. **Governance text.** `AGENTS.md`, `govern-development-task`, `decision-gates.md`,
   the task lifecycle, and the ADR README describe the tier, its exclusions, and the
   review rules. The canonical text stays authoritative.

## Consequences

### Positive

- **POS-001**: Small, low-risk tasks run without an approval stop. The review is
  batched with the merge instead of blocking the start of the work.
- **POS-002**: Nothing reaches the default branch without a human review, and every
  tier ADR records why it qualified and who reviewed it.
- **POS-003**: The policy stays human-owned and opt-in for existing repositories,
  and the riskiest categories are excluded.

### Negative

- **NEG-001**: The governance promise changes: a human-defined policy, not a
  per-task decision, accepts a tier ADR. PRD-0007 records this product decision.
- **NEG-002**: Path globs cannot detect every security or public API change. Agent
  classification and the review are the backstop, so misclassification remains
  possible.
- **NEG-003**: Callers must supply line counts, so the projections and any manual
  `verify` run grow an extra option.
- **NEG-004**: Existing repositories keep their `gate.json` (it is user-owned) and
  adopt the tier only by adding the section.

## Alternatives Considered

### Upfront approval in the request

- **ALT-001**: **Description**: The human pre-approves the named task, and the ADR is
  created `Accepted` with the quote.
- **ALT-002**: **Rejection Reason**: The owner chose automatic entry within
  thresholds in PRD-0007 discovery.

### Agent self-classification without deterministic checks

- **ALT-003**: **Description**: Let the agent decide eligibility alone.
- **ALT-004**: **Rejection Reason**: Eligibility would not be verifiable, and
  `verify` could not hold the gate.

### Block locally while a review is pending

- **ALT-005**: **Description**: Have the pre-push hook require reviews.
- **ALT-006**: **Rejection Reason**: It reintroduces the stop that the tier removes;
  the owner chose a merge gate in CI.

## Implementation Notes

- **IMP-001**: Engine slice:
  - `gate.json` `lowRisk` parsing with validation;
  - `verify --lines`, `--require-reviews`, and the eligibility and review checks;
  - regression tests for every acceptance criterion in PRD-0007.
- **IMP-002**: Record slice:
  - `adr new --tier low-risk` and the ADR fields;
  - review recording guidance;
  - a pending-review section in `status`.
- **IMP-003**: Projection slice: numstat line counts in the hook and CI, and the
  default-branch detection that turns on `--require-reviews`.
- **IMP-004**: Governance text, blueprint `gate.json` defaults, README, changelog,
  and the kit wiki.
- **IMP-005**: Validation:
  - the PRD-0007 scenario suite, passing 100%;
  - the verification baseline;
  - an end-to-end check in a generated repository: a tier task merges only after its
    review, and an excluded change stops.
- **IMP-006**: Release as a minor version under its own release ADR.

## References

- **REF-001**: [PRD-0007](../product/prd-0007-fast-lane-task-approval.md): the
  product decision.
- **REF-002**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md):
  the ADR gate, routine tier, and `gate.json`.
- **REF-003**: [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md):
  the `status` digest.
- **REF-004**: [ADR-0017](adr-0017-version-pinned-projected-invocation-and-tolerant-frontmatter-parsing.md):
  pinned projections and frontmatter parsing.

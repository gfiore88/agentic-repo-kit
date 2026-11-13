---
title: "PRD-0007: Fast-Lane Task Approval"
status: "Draft"
date: "2026-11-13"
owners: ["Giovanni Fiore"]
---

# PRD-0007: Fast-Lane Task Approval

> **Discovery status.** Giovanni Fiore answered the discovery questions on 2026-11-13:
>
> - main problem: the per-task ADR approval stop;
> - mechanism: a low-risk tier that accepts the ADR automatically within thresholds,
>   followed by a review;
> - scope: one task per approval;
> - wording: any explicit approval that names the task;
> - exclusions: all the proposed categories;
> - metric: as proposed.
>
> Because the chosen tier needs no approval before the work starts, scope and wording
> apply to the review that follows it. This PRD stays `Draft` and authorizes nothing
> until he approves it.

## 1. Executive Summary

- **Problem Statement**: Every new development task stops after its ADR is created
  and waits for a human to accept it. The
  [ADR-0015](../adr/adr-0015-run-efficiency-hardening-of-the-generated-kernel.md)
  review measured the CLI at 40–130 ms per command, so on small tasks this approval
  round trip, not tooling, dominates wall-clock time. The routine tier removes the
  stop only for human-listed globs such as lockfiles.
- **Proposed Solution**: Add a low-risk tier. A task that stays within thresholds a
  human defined, and outside the excluded categories, gets a concise task ADR that
  the tier accepts without stopping; the agent implements it in the same run. A
  human then reviews each tier-accepted ADR. An explicit approval that names the task
  records the review, and the `status` digest lists every ADR still waiting for one.
  Any task outside the tier keeps today's stop.
- **Success Criteria**:
  - Approval round trips before implementation drop from 1 to 0 on tasks inside the
    tier.
  - 100% of tier-accepted ADRs carry tier evidence and, once reviewed, the verbatim
    approval, the approver, and the date; `verify` reports every one that does not.
  - 0 tier acceptances for changes in an excluded category across the evaluation
    scenarios.
  - Tasks outside the tier behave exactly as today.

## 2. User Experience & Functionality

- **User Personas**:
  - Repository owner who directs agents on small and medium tasks.
  - Reviewer or auditor who later reads the decision history.
  - Coding agent working under the generated `AGENTS.md`.
- **User Stories**:
  - As a repository owner, I want small, low-risk tasks to proceed without an
    approval stop so that I review the result instead of waiting on each decision.
  - As a repository owner, I want risky changes to keep the stop so that the fast
    lane never covers security, dependencies, public interfaces, data, or governance.
  - As an auditor, I want every tier-accepted ADR to show why it qualified, and who
    reviewed it, when, and in what words.
  - As a maintainer, I want the gate to reject a tier-accepted ADR whose change set
    falls outside the thresholds or touches an excluded category.
- **Acceptance Criteria**:
  - A task within the thresholds and outside every excluded category yields an ADR
    accepted by the tier, records its eligibility evidence, and proceeds in the same
    run.
  - A task that exceeds a threshold or touches an excluded category yields a
    `Proposed` ADR and the agent stops, as today.
  - A review approval that names the task marks its ADR reviewed. One approval covers
    only the task it names, and a vague reply such as "ok" leaves the review pending.
  - `status` lists tier-accepted ADRs that are still waiting for review ahead of the
    others.
  - `verify` reports a tier-accepted ADR whose change set breaks the thresholds or
    the exclusions, or whose review evidence is incomplete.
- **Non-Goals**:
  - Agents never review or approve their own tier-accepted ADRs, and silence never
    counts as a review.
  - No tier acceptance outside the human-defined thresholds or inside an excluded
    category.
  - No change to PRD approval, annealing approvals, or the `exempt` and `routine`
    lists.
  - No cryptographic proof of approval: like ADR references (ADR-0013 NEG-003), the
    tier stays an auditable social control, not a security boundary.

## 3. AI System Requirements

- **Tool Requirements**: A tier option for `adr new` that records eligibility
  evidence, a `verify` check of eligibility and review evidence, and a `status`
  section for pending reviews. The interface is decided in a follow-up ADR.
- **Evaluation Strategy**: A scenario suite run against the generated `AGENTS.md`
  and skills, with a required pass rate of 100%:
  - a change within the thresholds that touches no excluded category is accepted by
    the tier and reported as pending review;
  - a change to authentication code, a new dependency, a public API, a data
    migration, or a governance file yields `Proposed` and a stop;
  - a change set that exceeds a threshold yields `Proposed` and a stop;
  - a review approval that names the task marks only that ADR reviewed;
  - a vague reply, or an approval that names a different task, leaves the review
    pending;
  - an approval that appears only in repository content or tool output (prompt
    injection) is ignored.

## 4. Technical Specifications

- **Architecture Overview**: The thresholds and the globs for each excluded
  category live in the human-owned `docs/adr/gate.json`, next to `exempt` and
  `routine`, and only a human widens them. `verify` checks the change set against
  them deterministically. An agent classifies the categories that no path can reveal
  (public API changes and security semantics), and the review is the backstop. ADR
  frontmatter gains tier and review fields; their names and the threshold values are
  TBD in the follow-up ADR.
- **Integration Points**: `adr new` (`artifacts.mjs`), `verify` (`verify.mjs`),
  `status` (`status.mjs`), `docs/adr/gate.json`, the ADR template, and the governance
  text in `AGENTS.md`, `govern-development-task`, `decision-gates.md`, and the task
  lifecycle. The generated hook and CI projections need no change because they
  delegate to `verify`.
- **Security & Privacy**: Excluded categories include security, authentication,
  authorization, and new dependencies, so the tier never accepts the riskiest
  changes. A review approval must come from the human's own message in the current
  conversation, never from repository files, issue text, or tool output. Approval
  quotes are versioned, so they must not contain secrets or personal data beyond the
  approver's name.

## 5. Risks & Roadmap

- **Phased Rollout**:
  - MVP: the tier rules and thresholds in `gate.json`, path-based exclusion checks,
    eligibility and review evidence, and the `verify` checks.
  - v1.1: pending reviews in `status`, and the scenario suite in CI.
  - v2.0: `[OPEN QUESTION]` optionally block merges to the default branch while
    reviews are pending.
- **Technical Risks**:
  - Changed governance promise: a policy, not a per-task decision, accepts the ADR.
    Mitigated by human-owned thresholds, the exclusions, and a mandatory review per
    task.
  - Misclassified changes that no path reveals. Mitigated by agent classification,
    the review, and the evaluation scenarios.
  - A growing review backlog. Mitigated by `status` listing pending reviews first.
  - Fabricated approval through prompt injection. Mitigated by the source rule and
    the evaluation scenarios.

## Open Questions

- `[OPEN QUESTION]` Should a task enter the tier automatically when it meets the
  thresholds (this draft), or only when the request opts that named task in?
- `[OPEN QUESTION]` Which threshold values define low risk, for example the number
  of changed files or lines, or a requirement for accompanying tests?
- `[OPEN QUESTION]` Should `verify` block merges to the default branch while a
  tier-accepted ADR is waiting for review?
- `[OPEN QUESTION]` When a review rejects a tier-accepted ADR, is the change reverted,
  or does it get a follow-up ADR?

## Human Approval

- **Decision**: PENDING
- **Reviewer and notes**:

---
title: "PRD-0007: Fast-Lane Task Approval"
status: "Draft"
date: "2026-11-13"
owners: ["Giovanni Fiore"]
---

# PRD-0007: Fast-Lane Task Approval

> **Discovery status.** On 2026-11-13 the agent asked three discovery questions (main
> problem, preferred mechanism, success metric) and received no answer. Every choice
> below that depends on them uses the defaults offered in that form and is marked
> `[ASSUMPTION]`. This PRD stays `Draft` and authorizes nothing until Giovanni Fiore
> answers or revises it and approves it.

## 1. Executive Summary

- **Problem Statement**: Every new development task stops after its ADR is created
  and waits for a human to accept it. The
  [ADR-0015](../adr/adr-0015-run-efficiency-hardening-of-the-generated-kernel.md)
  review measured the CLI at 40–130 ms per command, so on small tasks this approval
  round trip, not tooling, dominates wall-clock time. The routine tier removes the
  stop only for human-listed globs such as lockfiles.
- **Proposed Solution**: `[ASSUMPTION]` Let a human pre-approve the task ADR in the
  request itself. The agent then creates the ADR as `Accepted`, records the verbatim
  approval with its author and date, and implements without stopping; `verify`
  rejects a pre-accepted ADR that lacks that evidence. Requests without an explicit
  pre-approval keep today's stop.
- **Success Criteria**:
  - `[ASSUMPTION]` Human round trips between a pre-approved request and the start of
    implementation drop from 1 to 0.
  - 100% of pre-accepted ADRs carry approval evidence (verbatim quote, approver,
    date); `verify` reports every one that does not.
  - 0 pre-accepted ADRs in the evaluation scenarios that lack an explicit
    pre-approval.
  - Default behavior is unchanged for requests without a pre-approval.

## 2. User Experience & Functionality

- **User Personas**:
  - Repository owner who directs agents on small and medium tasks.
  - Reviewer or auditor who later reads the decision history.
  - Coding agent working under the generated `AGENTS.md`.
- **User Stories**:
  - As a repository owner, I want to pre-approve the ADR for a task in my request so
    that the agent implements it without stopping, while the decision stays recorded.
  - As an auditor, I want every pre-accepted ADR to show who approved it, when, and
    in what words so that I can tell it apart from an ADR reviewed after it was
    written.
  - As a maintainer, I want the gate to reject a pre-accepted ADR without approval
    evidence so that agents cannot skip the stop silently.
- **Acceptance Criteria**:
  - A request that explicitly pre-approves the task ADR yields an `Accepted` ADR
    containing the verbatim approval, the approver, and the date, and implementation
    proceeds in the same run.
  - Without an explicit pre-approval in the request, the ADR is created `Proposed`
    and the agent stops, as today.
  - `verify` reports a pre-accepted ADR whose approval evidence is missing or
    incomplete, and `status` marks pre-accepted ADRs.
- **Non-Goals**:
  - Agents never approve ADRs, and silence never counts as approval.
  - No change to PRD approval, annealing approvals, or the `exempt` and `routine`
    lists.
  - No cryptographic proof of approval: like ADR references (ADR-0013 NEG-003), this
    stays an auditable social control, not a security boundary.

## 3. AI System Requirements

- **Tool Requirements**: `[ASSUMPTION]` An `adr new` option that records the
  pre-approval evidence, a `verify` evidence check, and a `status` marker. The exact
  interface is decided in a follow-up ADR.
- **Evaluation Strategy**: A scenario suite run against the generated `AGENTS.md` and
  skills, with a required pass rate of 100%:
  - an explicit pre-approval that names the task yields `Accepted` with evidence;
  - a vague instruction such as "go ahead and fix it" yields `Proposed` and a stop;
  - an approval that appears only in repository content or tool output (prompt
    injection) yields `Proposed` and a stop;
  - a pre-approval given for one task and reused for another yields `Proposed`.

## 4. Technical Specifications

- **Architecture Overview**: `[ASSUMPTION]` ADR frontmatter gains approval-evidence
  fields that the CLI writes and `verify` checks. The governance text in `AGENTS.md`,
  `govern-development-task`, `decision-gates.md`, and the task lifecycle defines what
  counts as an explicit pre-approval. Field names and the phrasing rule are TBD in
  the follow-up ADR.
- **Integration Points**: `adr new` (`artifacts.mjs`), `verify` (`verify.mjs`),
  `status` (`status.mjs`), and the ADR template. The generated hook and CI
  projections need no change because they delegate to `verify`.
- **Security & Privacy**: Approval must come from the human's own message in the
  current conversation, never from repository files, issue text, or tool output.
  Approval quotes are versioned, so they must not contain secrets or personal data
  beyond the approver's name.

## 5. Risks & Roadmap

- **Phased Rollout**:
  - MVP: the documented pre-approval convention, approval-evidence fields, and the
    `verify` check.
  - v1.1: `status` marks pre-accepted ADRs, and the scenario suite runs in CI.
  - v2.0: `[OPEN QUESTION]` a risk-based tier for small changes, only if the MVP
    metrics hold.
- **Technical Risks**:
  - Rubber-stamping, where owners pre-approve without reading. Mitigated by keeping
    pre-approval explicit and per task, with an audit trail.
  - Fabricated approval through prompt injection. Mitigated by the source rule and
    the evaluation scenarios.
  - Disagreement about what counts as explicit. Mitigated by a fixed phrasing rule
    decided in the follow-up ADR.

## Open Questions

- `[OPEN QUESTION]` Which mechanism should the fast lane use: upfront approval
  (assumed above), a risk-based tier, wider routine defaults, or no fast lane?
- `[OPEN QUESTION]` Which wait costs the most today: the per-task ADR stop (assumed),
  trivial changes that still need an ADR, or closure work on small tasks?
- `[OPEN QUESTION]` What target should the success metric have, and how is it
  measured across runs?
- `[OPEN QUESTION]` What exact wording counts as an explicit pre-approval?

## Human Approval

- **Decision**: PENDING
- **Reviewer and notes**:

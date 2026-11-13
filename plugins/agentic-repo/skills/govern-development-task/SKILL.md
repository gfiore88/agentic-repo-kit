---
name: govern-development-task
description: Apply PRD, ADR, specification, verification, documentation, and approval gates to a development task. Use before implementing a material feature, change, or technical decision in a governed repository.
---

# Govern Development Task

Before implementation:

1. Read `AGENTS.md`, `docs/wiki/index.md`, and only the relevant linked knowledge.
2. Classify the request using [references/decision-gates.md](references/decision-gates.md).
3. Draft a PRD when material product scope, user outcomes, or success measures remain undecided.
4. For every new development task, create a dedicated task ADR: run `npx agentic-repo-kit adr new --title "<title>"` to create the next-numbered file in `docs/adr/`, then complete every section with the official `create-architectural-decision-record` skill. Derive the context, decision, alternatives, and stakeholders from the conversation and the repository, and ask the human only for what you cannot derive. Existing ADRs may govern or constrain it but do not replace it. Follow-up work inside the scope of an already `Accepted` ADR cites it as `ADR-NNNN` instead of creating a duplicate (see `references/decision-gates.md`).
5. Keep the task ADR `Proposed` and stop before implementation until the human explicitly approves it. Cite approval from the current conversation only when it unambiguously names or covers that exact task ADR.
6. Low-risk tier: if `docs/adr/gate.json` defines `lowRisk`, check the task against it before you create the ADR:
   - at most `maxFiles` changed source files and `maxLines` changed lines, documentation excluded;
   - tests changed with any code;
   - no path in an excluded category (security, dependencies, public APIs, migrations, governance);
   - nothing that paths cannot reveal, such as a public-interface or security impact. If you find one, or are unsure, use the normal stop.

   When the task qualifies, create the ADR with `npx agentic-repo-kit adr new --tier low-risk --title "<title>"`, implement without stopping, and fill in its eligibility section. Confirm with `npx agentic-repo-kit verify --changed <paths> --lines <count:path,...>`.

Load lifecycle skills proportionally: load a skill only when its trigger matches the task, and treat the `using-agent-skills` Lifecycle Sequence as a menu, not a checklist. Typical sets when the full skill profile is installed:

- Bug fix: `debugging-and-error-recovery`, then `test-driven-development` for the regression test.
- Small change: `incremental-implementation` and `test-driven-development`.
- New feature: `spec-driven-development` and `planning-and-task-breakdown` first, then `incremental-implementation`, `test-driven-development`, and `code-review-and-quality`.

Add a skill when the task needs it, for example `security-and-hardening` for authentication or untrusted input. Acceptance criteria, tests, verification, and the Definition of Done (`.agents/references/definition-of-done.md`) are never skipped.

After implementation:

1. Run proportionate tests and static checks.
2. Update durable knowledge in `docs/wiki/`, `docs/wiki/index.md`, and `docs/wiki/log.md`.
3. For a low-risk tier ADR, ask the human to review it.
   - Record the review only when the human's own message explicitly approves or rejects and names the task or ADR, using `npx agentic-repo-kit adr review --adr ADR-NNNN --decision approved|rejected --by "<name>" --quote "<their words>"`. A vague reply leaves the review pending.
   - One review covers one ADR. With CI enforcement, the governance check blocks merges to the default branch until it is approved.
   - On rejection, revert the change. Fix it forward with a follow-up ADR only when the reviewer asks for that.
4. Conclude every completed ADR task with the mandatory **End-of-Task Annealing Diagnosis** block:
   ```markdown
   ### 🔬 End-of-Task Annealing Diagnosis
   - **Observable Friction / Errors**: Summary of any friction/redundant steps, or None.
   - **Classification**: `None` | `Agent Method` | `Product/Domain Scope` | `Tooling Gap`
   - **Action**: No directive changes required (or: `PENDING` proposal created in `.agents/annealing/proposals/`).
   ```
   If an Agent Method failure occurred, author a `PENDING` proposal via `anneal-agent-directives` without directly mutating directives. Keep routine task ADRs concise, but include approach, boundaries, alternatives, consequences, and references.


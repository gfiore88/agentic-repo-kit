# Decision Gates

## PRD gate

Create or update a PRD when the task changes or leaves unresolved a material product problem, user outcome, scope boundary, success metric, or rollout policy.

## ADR gate

Every new development task receives a dedicated task ADR created through the official `create-architectural-decision-record` skill.

- Significant decisions receive the full architectural treatment and alternatives analysis.
- Routine work receives a concise ADR recording the implementation approach, boundaries, alternatives, consequences, and related accepted ADRs.
- Every task ADR starts as `Proposed` and blocks implementation until explicit human acceptance.
- An existing ADR can constrain or inform a new task's ADR but cannot replace it.
- Follow-up work that stays inside the scope of an already `Accepted` ADR is not a new task: cite that ADR as `ADR-NNNN` in commit messages or the pull request instead of creating a duplicate. `npx agentic-repo-kit verify --adr` (and the generated hook/CI projections) accept such references only when the ADR is `Accepted` and its number belongs to exactly one file.
- ADR numbers are unique. When parallel branches each create the same next number, whoever merges renumbers the later ADR (file name, title, and `ADR-NNNN` references) before merging; `verify` reports every number used by more than one file.
- Routine tier: changes confined to the human-defined `routine` globs in `docs/adr/gate.json` (for example lockfile refreshes) need no ADR. Declare `ADR: routine` in the commit message and record the work as a `routine` entry in `docs/wiki/log.md`; `verify --routine` checks both. Anything outside those globs is a new task.
- Low-risk tier: a task that stays within the human-defined `lowRisk` thresholds in `docs/adr/gate.json` and touches none of its excluded categories (security, dependencies, public APIs, migrations, governance) gets an ADR that the tier accepts (`adr new --tier low-risk`), with its review pending. The task proceeds without stopping, and `verify --lines` checks the eligibility.
  - The human reviews every tier ADR afterwards (`adr review`). One explicit approval naming the task covers only that ADR.
  - `verify --require-reviews`, which the generated CI passes for the default branch when the repository uses `--enforce ci`, blocks merges until the review is approved. A rejected review reverts the change.
- Paths listed under `exempt` in `docs/adr/gate.json` never need an ADR. Agents never widen `exempt`, `routine`, or `lowRisk` without explicit human approval.

The ADR records why and how the task will be approached. A PRD defines product intent; a specification defines observable behavior; neither removes the mandatory task ADR gate.

---
name: govern-development-task
description: Apply PRD, ADR, specification, verification, documentation, and approval gates to a development task. Use before implementing a material feature, change, or technical decision in a governed repository.
---

# Govern Development Task

Before implementation:

1. Read `AGENTS.md`, `docs/wiki/index.md`, and only the relevant linked knowledge.
2. Classify the request using [references/decision-gates.md](references/decision-gates.md).
3. Draft a PRD when material product scope, user outcomes, or success measures remain undecided.
4. For every new development task, execute the official `create-architectural-decision-record` skill and create a dedicated task ADR. Existing ADRs may govern or constrain it but do not replace it.
5. Keep the task ADR `Proposed` and stop before implementation until the human explicitly approves it. Cite approval from the current conversation only when it unambiguously names or covers that exact task ADR.

After implementation:

1. Run proportionate tests and static checks.
2. Update durable knowledge in `docs/wiki/`, `docs/wiki/index.md`, and `docs/wiki/log.md`.
3. Conclude every completed ADR task with the mandatory **End-of-Task Annealing Diagnosis** block:
   ```markdown
   ### 🔬 End-of-Task Annealing Diagnosis
   - **Observable Friction / Errors**: Summary of any friction/redundant steps, or None.
   - **Classification**: `None` | `Agent Method` | `Product/Domain Scope` | `Tooling Gap`
   - **Action**: No directive changes required (or: `PENDING` proposal created in `.agents/annealing/proposals/`).
   ```
   If an Agent Method failure occurred, author a `PENDING` proposal via `anneal-agent-directives` without directly mutating directives. Keep routine task ADRs concise, but include approach, boundaries, alternatives, consequences, and references.


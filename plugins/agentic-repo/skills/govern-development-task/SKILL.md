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

After implementation, run proportionate tests, update durable knowledge, and record unresolved questions. Keep routine task ADRs concise, but include approach, boundaries, alternatives, consequences, and references.

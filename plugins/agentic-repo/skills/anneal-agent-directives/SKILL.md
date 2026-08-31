---
name: anneal-agent-directives
description: Turn evidence from a completed agent run into a classified diagnosis and, only for a durable method problem, a human-gated minimal directive diff. Use after validated tasks that experienced reusable execution friction.
---

# Anneal Agent Directives

Run this only after the current task outcome has been validated.

1. Diagnose observable evidence using Stage 1 in [references/annealing-process.md](references/annealing-process.md).
2. Route facts to the wiki, decisions to ADRs, capability gaps to tooling, product defects to code and regression tests, and transient incidents to the run log.
3. Continue to Stage 2 only when the selected class is `Agent Method`.
4. Propose the smallest evidence-backed, generalizable, scoped, non-duplicative, testable, and reversible diff.
5. Target canonical sources, never generated runtime adapters.
6. Do not apply or approve the proposal. Await an explicit human decision.

Do not require hidden chain-of-thought. Use logs, actions, diffs, errors, tests, elapsed time, tool counts, and concise run summaries.

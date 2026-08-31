# Governed Self-Annealing

The workflow separates authority across stages:

1. `run-evidence-analyst` inspects observable evidence after the task is validated.
2. It routes the lesson to knowledge, an ADR, tooling, product code, the run log, or `Agent Method`.
3. Only `Agent Method` reaches `directive-diff-author`.
4. The diff author creates a `PENDING` proposal with evidence, a minimal diff, validation, generalization, and risks. It cannot edit the target.
5. A human approves, revises, or rejects the proposal.
6. Only an approved exact diff may be applied and tested on a comparable future task.

This boundary prevents silent self-modification, knowledge laundering, instruction bloat, permission escalation, and test weakening.


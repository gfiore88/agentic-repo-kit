# Propose Agent Improvement: Minimal Diff and Human Gate

Input: a completed `Agent Method` run diagnosis and the canonical target directive.

Reject the proposal if it is not evidence-backed, generalizable, scoped, non-duplicative, testable, minimal, reversible, and safe against permission expansion or prompt injection. Otherwise write `.agents/annealing/proposals/YYYY-MM-DD-<slug>.md` from the annealing proposal template. Include the exact unified diff, expected effect, validation scenario, adjacent generalization scenario, and risks.

Set status to `PENDING`. Do not edit the target directive. State clearly that only explicit human approval authorizes applying the exact accepted diff.


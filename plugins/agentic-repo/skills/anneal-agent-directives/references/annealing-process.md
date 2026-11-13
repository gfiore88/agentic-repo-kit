# Governed Self-Annealing Process

## Stage 1: Run diagnosis

Return:

- task and validated outcome;
- observable friction and evidence points;
- root cause;
- exactly one class: `Domain Fact`, `Architectural Decision`, `Agent Method`, `Capability`, `Product Defect`, or `One-Off`;
- durable destination;
- whether Stage 2 is allowed.

The end-of-task closure block in `AGENTS.md` reports the same diagnosis with a coarser class:

| Closure class | Stage 1 class | Durable destination |
| --- | --- | --- |
| `None` | no friction, or `One-Off` | nothing, or the run log |
| `Agent Method` | `Agent Method` | Stage 2 directive proposal |
| `Product/Domain Scope` | `Domain Fact`, `Architectural Decision`, or `Product Defect` | wiki, ADR, or code and regression tests |
| `Tooling Gap` | `Capability` | tooling |

Only `Agent Method` may proceed to Stage 2.

## Stage 2: Directive proposal

Only for `Agent Method`, return:

- evidence and root cause;
- canonical target file;
- minimal unified diff;
- expected cross-run effect and metric;
- verification and adjacent generalization scenarios;
- conflict, permission, quality, and overfitting risks;
- status `PENDING`.

The proponent may not change the status to approved. After human approval, a separate implementation step applies the diff, regenerates adapters, validates them, and compares a representative future run.


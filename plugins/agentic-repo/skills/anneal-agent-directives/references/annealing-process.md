# Governed Self-Annealing Process

## Stage 1: Run diagnosis

Return:

- task and validated outcome;
- observable friction and evidence points;
- root cause;
- exactly one class: `Domain Fact`, `Architectural Decision`, `Agent Method`, `Capability`, `Product Defect`, or `One-Off`;
- durable destination;
- whether Stage 2 is allowed.

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


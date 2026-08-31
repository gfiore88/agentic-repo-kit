# Decision Gates

## PRD gate

Create or update a PRD when the task changes or leaves unresolved a material product problem, user outcome, scope boundary, success metric, or rollout policy.

## ADR gate

Every new development task receives a dedicated task ADR created through the official `create-architectural-decision-record` skill.

- Significant decisions receive the full architectural treatment and alternatives analysis.
- Routine work receives a concise ADR recording the implementation approach, boundaries, alternatives, consequences, and related accepted ADRs.
- Every task ADR starts as `Proposed` and blocks implementation until explicit human acceptance.
- An existing ADR can constrain or inform the task ADR but cannot replace it.

The ADR records why and how the task will be approached. A PRD defines product intent; a specification defines observable behavior; neither removes the mandatory task ADR gate.

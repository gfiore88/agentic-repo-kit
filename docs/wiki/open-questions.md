---
type: questions
title: Open Questions
created: 2026-08-31
updated: 2026-11-13
---

# Open Questions

- `[OPEN QUESTION]` Which package scope and public product name should be used before npm publication?
- `[OPEN QUESTION]` Which secondary runtimes enter the first certified compatibility matrix after the P0 group?
- `[OPEN QUESTION]` Should generated adapter files be committed, regenerated in CI, or support both policies?
- `[OPEN QUESTION]` What public license should govern the project itself?
- `[OPEN QUESTION]` Should a tracked upfront approval or a wider routine tier let a task ADR be accepted when it is created, removing the per-task stop that dominates wall-clock time? It would change the governance promise, so it needs a PRD ([ADR-0015](../adr/adr-0015-run-efficiency-hardening-of-the-generated-kernel.md)); drafted as [PRD-0007](../product/prd-0007-fast-lane-task-approval.md), with discovery pending.
- `[OPEN QUESTION]` Should projected instructions pin the generating version (`npx agentic-repo-kit@<version> <command>`), as hooks and CI already do? Unpinned `npx` runs a globally installed copy when one exists: during the 0.8.0 publication check, a stale global 0.6.0 answered `Unknown command: status` until it was upgraded ([ADR-0016](../adr/adr-0016-minor-release-0-8-0.md)).

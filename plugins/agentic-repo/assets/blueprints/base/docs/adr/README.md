# Architectural Decision Records

Every new development task requires its own ADR created with the official ADR skill. Keep it `Proposed` and do not begin implementation until explicit human approval changes or accepts it as `Accepted`.

## ADR gate configuration

[`gate.json`](gate.json) is human-owned (`update` never overwrites it) and tunes `agentic-repo verify`:

- `exempt`: path globs that never need an ADR, for example generated assets or editor configuration.
- `routine`: path globs eligible for the lightweight **routine tier**. Declare it with an `ADR: routine` line in the commit message (or `verify --routine`); the change must stay inside these globs and must add an entry to `docs/wiki/log.md`. No ADR is created.

Globs use `**` across directories and `*`/`?` within one segment; a pattern without `/` matches the file name at any depth. Widening either list is a governance decision: change it only with explicit human approval.

Follow-up work inside an already `Accepted` ADR's scope cites it as `ADR-NNNN` in commit messages instead of creating a new ADR.

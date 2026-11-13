# Architectural Decision Records

Every new development task requires its own ADR created with the official ADR skill. Keep it `Proposed` and do not begin implementation until explicit human approval changes or accepts it as `Accepted`.

## ADR gate configuration

[`gate.json`](gate.json) is human-owned (`update` never overwrites it) and tunes the ADR gate of the kit's `verify` command (`AGENTS.md` shows how to invoke the CLI):

- `exempt`: path globs that never need an ADR, for example generated assets or editor configuration.
- `routine`: path globs eligible for the lightweight **routine tier**. Declare it with an `ADR: routine` line in the commit message (or `verify --routine`); the change must stay inside these globs and must add a `routine` entry to `docs/wiki/log.md`. No ADR is created.
- `lowRisk`: the **low-risk ADR tier**. It sets `maxFiles` and `maxLines` (documentation excluded), `tests` globs, which must match a changed file whenever code changes, and `exclude` globs for the `security`, `dependencies`, `publicApi`, `migrations`, and `governance` categories.
  - A qualifying task's ADR is accepted by the tier (`adr new --tier low-risk`) with its review pending, and the work proceeds.
  - The human reviews it afterwards (`adr review`), and, with `--enforce ci`, CI blocks merges to the default branch until the review is approved. Make the governance check required in branch protection so that merges actually wait for it; without CI enforcement the review is a convention.
  - A rejected review reverts the change.
  - Remove the section to disable the tier. Repositories initialized before the tier existed enable it explicitly with `update --enable-low-risk`, which adds the default section.

Globs use `**` across directories and `*`/`?` within one segment; a pattern without `/` matches the file name at any depth. Widening either list is a governance decision: change it only with explicit human approval.

Follow-up work inside an already `Accepted` ADR's scope cites it as `ADR-NNNN` in commit messages instead of creating a new ADR.

## Numbering parallel work

The kit's `adr new` command takes the next free number on the current branch, so two branches can create the same number. Before merging, whoever merges renumbers the later ADR (file name, title, and `ADR-NNNN` references) to the next free number. `verify` reports every number used by more than one file, and a reference to a duplicated number never satisfies the gate.

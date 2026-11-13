# Repository Agentic Operating Contract

This repository is both a software workspace and a persistent, Git-versioned knowledge base. These rules are canonical for every supported coding agent. Runtime-specific files are adapters only.

## Session bootstrap

1. Run `npx agentic-repo-kit status` (or `agentic-repo status` with a global install). This read-only digest reports kernel and knowledge health, every ADR and PRD with its status (open records first), pending annealing proposals, ADR number collisions, and the latest log entries. If the command cannot run, read the latest entries in `docs/wiki/log.md` instead.
2. Read `docs/wiki/index.md` to locate relevant knowledge.
3. Open only the PRD/specification, ADRs, and topic pages that the digest and the index show are relevant to the task.
4. Consult `.agents/registry.md` and select the smallest suitable specialist role.
5. Route work to the appropriate lifecycle skills in `.agents/skills/` (start from `using-agent-skills` when the full skill profile is installed). Load a lifecycle skill only when its trigger matches the task: the `using-agent-skills` Lifecycle Sequence is a menu, not a checklist, and `govern-development-task` lists typical skill sets. Acceptance criteria, tests, verification, and the Definition of Done are never skipped.

Never load the whole repository into context when the digest and the index can route the task.

## Information taxonomy

Durable assertions must be marked as `[FACT]`, `[ASSUMPTION]`, `[DECISION]`, `[OPEN QUESTION]`, or `[PROPOSAL]`. A fact cites its source. Never promote an assumption or proposal to fact without evidence, and never promote a proposal to decision without human approval.

## Knowledge protocol

- `docs/raw/` contains immutable, safe source material. Never silently rewrite an ingested source.
- Never commit credentials, tokens, `.env` contents, personal data, regulated data, or confidential production exports. Store a safe reference instead.
- The LLM-owned compiled layer is `docs/wiki/`; keep it synthesized, cross-linked, and current.
- Every ingest updates affected pages, `docs/wiki/index.md`, and the append-only `docs/wiki/log.md`.
- Contradictions are recorded explicitly with provenance; newer material does not silently erase older evidence.
- Run `.agents/workflows/knowledge-lint.md` periodically and before claiming the knowledge base is healthy.

## Development governance

Before material implementation:

1. If scope, user outcome, constraints, or success metrics require an important decision, execute the official `prd` skill and keep the PRD `Draft` until human approval.
2. For every new development task, create a task ADR with the official `create-architectural-decision-record` skill, starting from the next-numbered file that `npx agentic-repo-kit adr new --title "<title>"` creates. Even a small new task receives a concise ADR that records the intended approach, boundaries, alternatives, and links to earlier governing decisions. Follow-up work that stays inside the scope of an already `Accepted` ADR does not need a new ADR: it cites that ADR as `ADR-NNNN` in its commit messages or pull request, and `npx agentic-repo-kit verify --adr` checks the reference. Routine work whose paths a human listed under `routine` in `docs/adr/gate.json` (for example lockfile refreshes) uses the lightweight routine tier instead: declare `ADR: routine` in the commit message and record it as a `routine` entry in `docs/wiki/log.md`. Paths under `exempt` never need an ADR. Only a human widens either list.
3. Create the ADR as `Proposed` and stop before implementation until a human explicitly approves it as `Accepted`. For a new task, an earlier ADR may be referenced but never replaces the task ADR.
4. Define verifiable acceptance criteria and a proportionate test strategy.
5. Implement incrementally using the relevant skills in `.agents/skills/`.

Completion requires acceptance criteria, tests, static checks, security review proportional to risk, documentation updates, wiki/index/log maintenance, and concluding with a visible annealing assessment block:
```markdown
### 🔬 End-of-Task Annealing Diagnosis
- **Observable Friction / Errors**: Summary of friction/failures, or None.
- **Classification**: `None` | `Agent Method` | `Product/Domain Scope` | `Tooling Gap`
- **Action**: No directive changes required (or: `PENDING` proposal created in `.agents/annealing/proposals/`).
```

## Governed self-annealing

- Finish and validate the current task before retrospective optimization.
- The `run-evidence-analyst` diagnoses observable evidence and chooses the durable destination.
- Only an `Agent Method` diagnosis may proceed to `directive-diff-author`.
- The diff author proposes a minimal patch but never edits the target directive.
- A human must mark the proposal `APPROVED`; only then may an agent apply the exact accepted diff and validate it.
- Facts go to the wiki, decisions to ADRs, capability gaps to tooling, defects to code and regression tests, and one-off incidents to the run log.
- Never weaken tests, policy, permissions, or acceptance criteria to make an annealing proposal look successful.

## Canonical and generated files

- Canonical policy: `AGENTS.md`, `.agents/agents/`, `.agents/rules/`, `.agents/skills/`, `.agents/workflows/`.
- Generated runtime adapters may reference canonical files but must not become an independent policy source.
- When a generated adapter conflicts with a canonical file, canonical policy wins and the adapter must be regenerated.
- Prefer relative repository paths and inherit the active runtime's model unless the project explicitly pins a compatible model.

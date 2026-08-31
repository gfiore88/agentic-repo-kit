# Repository Agentic Operating Contract

This repository is both a software workspace and a persistent, Git-versioned knowledge base. These rules are canonical for every supported coding agent. Runtime-specific files are adapters only.

## Session bootstrap

1. Read `docs/wiki/index.md` to locate relevant knowledge.
2. Read the latest entries in `docs/wiki/log.md`.
3. Read the active PRD/specification, related ADRs, and only the topic pages needed for the task.
4. Consult `.agents/registry.md` and select the smallest suitable specialist role.
5. Use `.agents/skills/using-agent-skills/SKILL.md` to route work to the appropriate lifecycle skills.

Never load the whole repository into context when the index can route the task.

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
2. For every new development task, execute the official `create-architectural-decision-record` skill and create a task ADR. Even routine work receives a concise ADR that records the intended approach, boundaries, alternatives, and links to earlier governing decisions.
3. Create the ADR as `Proposed` and stop before implementation until a human explicitly approves it as `Accepted`. An earlier ADR may be referenced but never replaces the task ADR.
4. Define verifiable acceptance criteria and a proportionate test strategy.
5. Implement incrementally using the relevant skills in `.agents/skills/`.

Completion requires acceptance criteria, tests, static checks, security review proportional to risk, documentation updates, wiki/index/log maintenance, and an end-of-run annealing assessment.

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

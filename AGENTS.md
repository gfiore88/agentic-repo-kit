# Agentic Repository Kernel — Development Contract

This repository develops a model-agnostic, multi-runtime operating kernel for AI-native software repositories. Files under `plugins/agentic-repo/assets/blueprints/base/` are the canonical generated-project blueprint; runtime adapters are projections of that kernel.

## Source hierarchy

- Product decisions live in `docs/product/`.
- Architectural decisions live in `docs/adr/`.
- Compounded project knowledge lives in `docs/wiki/`; read `docs/wiki/index.md` first.
- Plugin skills live in `plugins/agentic-repo/skills/`.
- Runtime-neutral behavior is canonical. Runtime adapters are projections and must not become independent sources of policy.
- Pinned upstream content and its provenance live in the generated `.agents/sources.lock.json`; treat updates as reviewed supply-chain changes.

## Development lifecycle

1. Classify product uncertainty and architectural significance before implementation.
2. Use a PRD for material product scope or outcome decisions.
3. Create an ADR with the official skill for every new development task. It starts as `Proposed`, and implementation waits for explicit human acceptance.
4. Implement the smallest vertical slice that proves the decision.
5. Run tests and plugin/skill validation.
6. Update the wiki and chronological log when durable knowledge changes.
7. Run the separated end-of-task annealing diagnosis (concluding with the mandatory diagnosis block) and never let an agent approve its own directive change.

## Portability invariants

- Keep the shared skill source compatible with the open `SKILL.md` format.
- Do not hardcode model IDs in canonical agents; default to runtime inheritance.
- Do not create runtime-specific files unless that adapter is enabled.
- Never silently overwrite existing repository files during initialization.
- Use relative paths in generated repositories.
- When a runtime lacks a governance hook, fall back to deterministic repository scripts or CI and disclose the downgrade.

## Governed self-annealing

- Finish and validate the current task before retrospective optimization.
- Separate run diagnosis from directive-change proposal.
- Agents may propose a minimal directive diff but may not approve or silently apply it.
- Apply approved changes to canonical sources, regenerate adapters, and rerun cross-runtime validation.

## Verification baseline

- Run `npm test`, `npm run validate:skills`, and `npm run validate:plugin`.
- Initialize a clean temporary repository with every adapter.
- Run `doctor` and `knowledge lint` in the generated repository.
- Verify generated relative Markdown links resolve.

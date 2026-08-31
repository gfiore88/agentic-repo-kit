# Upstream Content and Provenance

- `[FACT]` The official `create-architectural-decision-record` and `prd` skills come from `github/awesome-copilot`. Source: the generated `.agents/sources.lock.json`.
- `[FACT]` The complete lifecycle skill pack, four specialist personas, nine commands, and shared checklists come from `addyosmani/agent-skills`. Source: the generated `.agents/sources.lock.json`.
- `[FACT]` Both imported repositories use the MIT License; their texts ship in `.agents/licenses/`. Source: imported `LICENSE` files.
- `[DECISION]` Upstream revisions are pinned rather than downloaded during initialization, making generation deterministic and usable offline. Source: PRD-0001.
- `[DECISION]` Refreshing upstream content is a reviewed dependency update, not an implicit network action during `init`. Source: PRD-0001.

The Karpathy LLM Wiki and Governed Agent Self-Annealing gists provide architectural patterns. Their ideas are instantiated as repository policy, workflows, prompts, and templates with provenance recorded in the source lock and notices.


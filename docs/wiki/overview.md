# System Overview

- `[DECISION]` The product is a repository kernel, plugin, and CLI rather than a single package format.
- `[DECISION]` The kernel is model-agnostic and adapters target coding-agent runtimes.
- `[DECISION]` `agentic-repo init` defaults to assisted auto-detection.
- `[DECISION]` Only selected runtime adapters are generated.
- `[FACT]` Runtime-specific agent and permission formats are not interchangeable. Source: generated adapters under `plugins/agentic-repo/assets/adapters/`.
- `[DECISION]` Canonical Markdown agent definitions are compiled into runtime-native wrappers where supported, while shared policy remains in `AGENTS.md`. Source: `plugins/agentic-repo/scripts/lib/plan.mjs` and ADR-0001.

---
name: bootstrap-agentic-repository
description: Initialize or inspect a repository using the Agentic Repository Kernel, including runtime detection, selective adapters, and the knowledge/governance core. Use when starting a project or adding this scaffold to an existing repository.
---

# Bootstrap Agentic Repository

Use the bundled CLI rather than recreating the scaffold manually.

1. Inspect the target repository without modifying it.
2. Run `npx agentic-repo-kit init --dry-run --cwd <target>` and report detected runtimes and planned files. Inside this plugin, `node <plugin-root>/scripts/agentic-repo.mjs` is the equivalent of `npx agentic-repo-kit`.
3. If the user has already authorized initialization, rerun with `--yes`. Otherwise obtain confirmation immediately before writes.
4. Preserve existing files. The initializer must report divergent content as a conflict instead of overwriting it.
5. Run `npx agentic-repo-kit doctor --cwd <target>` after initialization and report enabled adapters, conflicts, and missing managed files.

`init` defaults to assisted auto-detection. Use `--runtime` only to override it; use `--runtime none` for the universal kernel alone.

For supported IDs and detection boundaries, read [references/runtime-compatibility.md](references/runtime-compatibility.md).

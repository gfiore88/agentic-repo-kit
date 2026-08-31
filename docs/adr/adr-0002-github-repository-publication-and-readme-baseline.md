---
title: "ADR-0002: GitHub Repository Publication and README Baseline"
status: "Accepted"
date: "2026-08-31"
authors: "Giovanni Fiore and implementation agent"
tags: ["repository", "github", "documentation", "release"]
supersedes: ""
superseded_by: ""
---

# ADR-0002: GitHub Repository Publication and README Baseline

## Status

Accepted. Giovanni Fiore explicitly approved ADR-0002 on 2026-08-31 before repository initialization, README implementation, or GitHub creation.

## Context

The Agentic Repository Kernel currently exists only in a local, non-Git directory. It needs a durable Git history, a GitHub origin, and a README that accurately distinguishes conversational agent workflows from deterministic CLI support. Creating a public repository without an explicit visibility decision could expose unfinished material prematurely.

## Decision

After explicit human acceptance:

- initialize the current directory as a Git repository with default branch `main`;
- create `gfiore88/agentic-repo-kit` on GitHub as a private repository;
- make one reviewed initial commit containing the current kernel, plugin, skills, agents, tests, documentation, licenses, and provenance locks;
- configure the GitHub repository as `origin` and push `main`;
- rewrite the README around installation, conversational workflows, deterministic commands, supported runtimes, governance guarantees, architecture, development verification, and current release status;
- document that knowledge ingest/query and self-annealing analysis are initiated in the chatbot, while `doctor` and `knowledge lint` remain deterministic CLI operations;
- do not publish the npm package or create a public release as part of this task.

## Consequences

### Positive

- **POS-001**: The project gains durable, remote, reviewable history.
- **POS-002**: Private-by-default publication prevents accidental exposure while documentation and compatibility are still evolving.
- **POS-003**: The README will no longer imply that conversational knowledge operations belong in the CLI.
- **POS-004**: GitHub becomes the canonical collaboration and future release surface.

### Negative

- **NEG-001**: A private repository is not immediately discoverable or reusable by the public.
- **NEG-002**: Changing repository name or ownership later requires updating package and documentation metadata.
- **NEG-003**: The first commit will be large because it includes pinned third-party skill content.

## Alternatives Considered

### Create a public repository immediately

- **ALT-001**: **Description**: Publish the full project openly in the first push.
- **ALT-002**: **Rejection rationale**: Public visibility is a consequential disclosure and was not specified explicitly.

### Use the local folder name `scaffolding-ai`

- **ALT-003**: **Description**: Create `gfiore88/scaffolding-ai`.
- **ALT-004**: **Rejection rationale**: `agentic-repo-kit` matches the package name and communicates the reusable product more clearly.

### Publish npm in the same task

- **ALT-005**: **Description**: Remove `private`, publish the package, and create a GitHub release.
- **ALT-006**: **Rejection rationale**: Distribution requires its own release-readiness and compatibility decision.

## Implementation Notes

- **IMP-001**: Confirm `.gitignore` excludes local/editor artifacts and generated package archives before the initial commit.
- **IMP-002**: Add repository metadata to `package.json` and the plugin manifest only after the GitHub URL exists.
- **IMP-003**: Run tests, skill/plugin validation, knowledge lint, and package dry-run before committing.
- **IMP-004**: Verify the remote URL and pushed default branch after creation.

## References

- **REF-001**: [PRD-0001](../product/prd-0001-agentic-repository-kernel.md)
- **REF-002**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)
- **REF-003**: [Project README](../../README.md)

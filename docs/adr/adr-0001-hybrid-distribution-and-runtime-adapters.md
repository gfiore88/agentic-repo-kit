---
title: "ADR-0001: Hybrid Distribution and Generated Runtime Adapters"
status: "Accepted"
date: "2026-08-31"
authors: "Project owner and implementation agent"
tags: ["architecture", "distribution", "multi-runtime"]
supersedes: ""
superseded_by: ""
---

# ADR-0001: Hybrid Distribution and Generated Runtime Adapters

## Status

Accepted. The project owner explicitly approved the hybrid, model-agnostic, multi-runtime architecture in the design conversation preceding implementation.

## Context

A template repository alone is easy to create but difficult to upgrade. An npm package alone cannot provide persistent repository knowledge to every coding agent. A plugin alone is not available or equivalent across every runtime and surface. Runtime-specific agent, hook, and permission formats are incompatible.

## Decision

Use a hybrid architecture:

- a repository is the canonical development and knowledge source;
- a plugin distributes reusable skills where supported;
- a Node.js CLI initializes, validates, and later upgrades target repositories;
- generated repositories contain a universal kernel plus selected adapters;
- `agentic-repo init` defaults to assisted runtime auto-detection;
- explicit runtime selection overrides detection;
- canonical policy is never independently edited in generated adapters;
- model selection defaults to runtime inheritance.

## Consequences

### Positive

- **POS-001**: Repositories retain durable knowledge without requiring a plugin installation.
- **POS-002**: Runtime-specific configuration is generated only when needed.
- **POS-003**: Canonical policy can be tested against several adapter projections.
- **POS-004**: CLI distribution can begin through npm without coupling the architecture to Node.js projects.

### Negative

- **NEG-001**: Adapter maintenance grows with the number of supported runtimes.
- **NEG-002**: Some capabilities require explicit degradation to CI rather than native hooks.
- **NEG-003**: Compatibility claims require fixtures and behavioral evaluation, not only file generation.

## Alternatives Considered

### Template repository only

- **ALT-001**: Simple initial cloning.
- **ALT-002**: Rejected because upgrades and adoption in existing repositories are unsafe and difficult.

### npm package only

- **ALT-003**: Familiar installation and versioning.
- **ALT-004**: Rejected as the sole architecture because persistent repository instructions and non-Node projects remain first-class requirements.

### Generate every adapter unconditionally

- **ALT-005**: Maximizes apparent compatibility.
- **ALT-006**: Rejected because it creates noise, drift, duplicate prompts, and misleading configuration for unused runtimes.

## Implementation Notes

- **IMP-001**: Detection examines executable availability and existing repository markers without executing detected runtimes.
- **IMP-002**: Initialization skips identical files and reports divergent files as conflicts.
- **IMP-003**: `scaffold.lock` records selected adapters and generated paths.
- **IMP-004**: Runtime adapters will receive capability states such as native, emulated, CI fallback, or unsupported.

## References

- **REF-001**: `docs/product/prd-0001-agentic-repository-kernel.md`
- **REF-002**: Karpathy LLM Wiki pattern.
- **REF-003**: Governed Agent Self-Annealing pattern.
- **REF-004**: Open Agent Skills specification and runtime-specific official documentation.


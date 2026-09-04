# Knowledge Index

Read this page first and open only the documents relevant to the active task.

## Product

- [Agentic Repository Kernel PRD](../product/prd-0001-agentic-repository-kernel.md): product outcomes, requirements, and rollout.
- [Developer Branding and Showcase PRD](../product/prd-0002-developer-branding-and-showcase.md): developer showcase, visual standards, and npm discovery.
- [Local Git Exclude Governance PRD](../product/prd-0003-local-git-exclude-governance.md): zero-footprint local exclusions via `.git/info/exclude` for enterprise and client repositories.
- [Mandatory Annealing Closure and Provenance Inheritance PRD](../product/prd-0004-mandatory-annealing-closure-and-provenance-inheritance.md): closing annealing blocks and page-level source inheritance.
- [Kernel Update and Upgrade Command PRD](../product/prd-0005-kernel-update-and-upgrade-command.md): non-destructive upgrades preserving project documentation.
- [Governance Enforcement Modes PRD](../product/prd-0006-governance-enforcement-modes.md): turning advisory PRD/ADR discipline into an opt-in deterministic guarantee.

## Architecture

- [Hybrid distribution and runtime adapters](../adr/adr-0001-hybrid-distribution-and-runtime-adapters.md): accepted packaging and adapter decision.
- [GitHub publication and README baseline](../adr/adr-0002-github-repository-publication-and-readme-baseline.md): accepted repository visibility, first push, and documentation decision.
- [npm publication, license, and automation](../adr/adr-0003-npm-publication-license-and-release-automation.md): accepted package name, MIT license, first publication, and Trusted Publishing decision.
- [README redesign, showcase assets, and patch release](../adr/adr-0004-readme-redesign-visual-assets-and-patch-release.md): accepted developer showcase layout, metadata keywords, and 0.1.1 release plan.
- [Local Git exclude for restricted repositories](../adr/adr-0005-local-git-exclude-for-restricted-repositories.md): accepted `.git/info/exclude` management, CLI flags, and delimiter block format.
- [Mandatory annealing closure and page provenance](../adr/adr-0006-mandatory-annealing-closure-and-page-provenance.md): accepted mandatory ADR completion diagnosis and page-level provenance.
- [Kernel update command and user knowledge preservation](../adr/adr-0007-kernel-update-command-and-user-knowledge-preservation.md): accepted update mechanics, knowledge preservation, and lockfile syncing.
- [Governance verification command and enforcement adapters](../adr/adr-0008-governance-verification-and-enforcement-adapters.md): accepted canonical `verify` engine with opt-in CI and local-hook projections.
- [Overview](overview.md): concise system model and terminology.
- [Kernel and adapters](architecture/kernel-and-adapters.md): canonical kernel, generated projections, selection, and integrity.
- [Upstream content and provenance](architecture/upstream-content-and-provenance.md): imported sources, pins, licenses, and refresh policy.

## Workflows

- [Knowledge and decision lifecycle](workflows/knowledge-and-decision-lifecycle.md): wiki ingest/lint and PRD/ADR gates.
- [Governed self-annealing](workflows/governed-self-annealing.md): diagnosis, proposal, approval, application, and validation stages.

## Operations

- [Open questions](open-questions.md): unresolved design and delivery questions.
- [Knowledge log](log.md): chronological knowledge changes.
- [Release guide](../releasing.md): first npm publication and subsequent OIDC release procedure.

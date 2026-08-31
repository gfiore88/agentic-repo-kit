---
title: "ADR-0003: npm Publication, License, and Release Automation"
status: "Accepted"
date: "2026-08-31"
authors: "Giovanni Fiore and implementation agent"
tags: ["npm", "release", "license", "supply-chain"]
supersedes: ""
superseded_by: ""
---

# ADR-0003: npm Publication, License, and Release Automation

## Status

Accepted. Giovanni Fiore explicitly approved the proposed MIT licensing, npm preparation, first manual publication, and subsequent GitHub Trusted Publishing workflow on 2026-08-31.

## Context

The package is structurally valid but was marked private, had no project-level license, and had no lock file or release automation. The name `agentic-repo-kit` currently returns `404` from the public npm registry, but remains unreserved until the first successful publication. The current machine is not authenticated to npm.

## Decision

- License original project material under MIT while retaining all third-party notices.
- Publish the unscoped public package as `agentic-repo-kit` at version `0.1.0`.
- Keep the CLI binary name `agentic-repo`.
- Add a package lock, pre-publication validation, changelog, CI, and release documentation.
- Perform the first npm publication manually after Giovanni creates or authenticates an npm account and confirms identity/2FA.
- Configure npm Trusted Publishing for `gfiore88/agentic-repo-kit` and the repository workflow after the package exists.
- Publish later versions from GitHub releases through OIDC, without a long-lived npm token.

## Consequences

### Positive

- **POS-001**: Users can initialize repositories through `npx agentic-repo-kit init`.
- **POS-002**: MIT provides a clear permissive license compatible with bundled MIT dependencies.
- **POS-003**: Trusted Publishing reduces long-lived credential exposure and provides build provenance.
- **POS-004**: Pre-publication validation prevents shipping a known failing package.

### Negative

- **NEG-001**: A published version cannot be overwritten; corrections require a new SemVer version.
- **NEG-002**: The first publication requires an authenticated human npm account and potentially 2FA.
- **NEG-003**: Trusted Publishing can only be configured after the package exists on npm.

## Alternatives Considered

### Scoped package

- **ALT-001**: **Description**: Publish as `@gfiore88/agentic-repo-kit`.
- **ALT-002**: **Rejection rationale**: The unscoped product name is currently available and produces a simpler `npx` command.

### Permanent npm automation token

- **ALT-003**: **Description**: Store a granular npm token in GitHub Secrets.
- **ALT-004**: **Rejection rationale**: OIDC Trusted Publishing avoids a persistent publishing secret.

### Publish without a license

- **ALT-005**: **Description**: Reserve the name before deciding usage rights.
- **ALT-006**: **Rejection rationale**: Public distribution without clear rights creates unnecessary legal ambiguity.

## Implementation Notes

- **IMP-001**: The release workflow validates that the Git tag matches `package.json` before publishing.
- **IMP-002**: `publishConfig.access` remains `public`; the Trusted Publishing workflow explicitly requests provenance while the first manual publication does not.
- **IMP-003**: The initial GitHub release and npm publication occur only after the manual npm account step.
- **IMP-004**: Change `0.1.0` from Unreleased to its publication date only after npm confirms success.

## References

- **REF-001**: [ADR-0002](adr-0002-github-repository-publication-and-readme-baseline.md)
- **REF-002**: [Release guide](../releasing.md)
- **REF-003**: [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)

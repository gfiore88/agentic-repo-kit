---
title: "ADR-0004: README Redesign, Showcase Assets, and 0.1.1 Patch Release"
status: "Accepted"
date: "2026-08-31"
authors: "Giovanni Fiore and implementation agent"
tags: ["readme", "branding", "showcase", "npm", "release"]
supersedes: ""
superseded_by: ""
---

# ADR-0004: README Redesign, Showcase Assets, and 0.1.1 Patch Release

## Status

Accepted. Giovanni Fiore explicitly approved the implementation plan, PRD-0002, and ADR-0004 for the developer branding showcase and 0.1.1 patch release on 2026-08-31.

## Context

`agentic-repo-kit@0.1.0` was successfully published to npm with automated OIDC release workflows in place. However, the root `README.md` was formatted as a functional technical specification rather than an engaging developer-tooling showcase. In addition, `package.json` lacked package keywords essential for discovery on the npm registry.

Because npm renders the package README at the time of publication and does not update retroactively without a new release, updating the public npm showcase requires a patch release (`0.1.1`).

## Decision

- Redesign `README.md` into a high-polish developer showcase with a dark minimalist aesthetic, cohesive monochrome badges, quickstart hero section, Unicode visual architecture diagram, core value pillars, comparison matrix, conversational workflow prompt cards, and CLI references.
- Maintain full markdown rendering parity between GitHub Flavored Markdown (GFM) and the npm package registry page without depending on fragile external image hosting.
- Add targeted search keywords and refined package descriptions to `package.json`.
- Increment the package version to `0.1.1` and record the release in `CHANGELOG.md` and `docs/wiki/log.md`.
- Validate all automated tests, skills, and plugin structure before release.

## Consequences

### Positive

- **POS-001**: Developers landing on GitHub and npm immediately understand the product value in seconds.
- **POS-002**: Package searchability on npm is significantly improved with relevant keywords.
- **POS-003**: The visual architecture diagram clearly separates the universal kernel from runtime-specific adapter projections.
- **POS-004**: Chatbot workflow prompt cards provide copy-pasteable examples for immediate user onboarding.

### Negative

- **NEG-001**: Requires a SemVer patch release (`0.1.1`) to propagate the updated README and metadata to npm.

## Alternatives Considered

### Keep the README strictly minimal without visual diagrams

- **ALT-001**: **Description**: Maintain plain text documentation without ASCII/Unicode maps or structured comparison tables.
- **ALT-002**: **Rejection rationale**: Does not meet the developer-tooling showcase standard and fails to quickly communicate multi-runtime architecture.

### Host external PNG/WebP banners on a third-party CDN

- **ALT-003**: **Description**: Link external raster images hosted on third-party image services.
- **ALT-004**: **Rejection rationale**: External hosts can break, suffer latency, or fail in private environments; self-contained GFM and standard badges provide durable rendering.

## Implementation Notes

- **IMP-001**: Update `package.json` with version `0.1.1` and new `keywords` array.
- **IMP-002**: Update `CHANGELOG.md` with version `0.1.1` changes.
- **IMP-003**: Verify all relative markdown links and run `npm run validate`.

## References

- **REF-001**: [PRD-0002](../product/prd-0002-developer-branding-and-showcase.md)
- **REF-002**: [ADR-0002](adr-0002-github-repository-publication-and-readme-baseline.md)
- **REF-003**: [ADR-0003](adr-0003-npm-publication-license-and-release-automation.md)
- **REF-004**: [Project README](../../README.md)

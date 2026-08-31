# Release Guide

## First public release

The first release creates and reserves the npm package. It requires a human-authenticated npm account.

1. Create or authenticate the npm account and enable two-factor authentication.
2. Run `npm login --auth-type=web` locally.
3. Confirm the expected identity with `npm whoami`.
4. Recheck availability with `npm view agentic-repo-kit`.
5. Run `npm run validate` and `npm pack --dry-run`.
6. Publish with `npm publish --access public`.
7. Verify `npm view agentic-repo-kit version dist.integrity` and execute a clean `npx agentic-repo-kit --help` smoke test.
8. Mark `0.1.0` released in `CHANGELOG.md`, commit, tag `v0.1.0`, push the tag, and create the GitHub release.

Do not create the GitHub release before the first npm publication: the release workflow is reserved for Trusted Publishing after npm has been configured.

## Configure Trusted Publishing

In the npm package settings, add a GitHub Actions trusted publisher with:

- organization or user: `gfiore88`;
- repository: `agentic-repo-kit`;
- workflow: `publish.yml`;
- environment: leave empty unless the workflow is later configured with one.

The workflow uses GitHub OIDC through `id-token: write`; do not add a long-lived `NPM_TOKEN`.

## Subsequent releases

1. Create and approve the release task ADR.
2. Update `CHANGELOG.md` and choose the SemVer increment.
3. Run the full validation suite.
4. Run `npm version patch`, `minor`, or `major`.
5. Push the commit and tag.
6. Publish the matching GitHub release.
7. Confirm the Trusted Publishing workflow and npm package provenance.

Never reuse or overwrite an npm version.

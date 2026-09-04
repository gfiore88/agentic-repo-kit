# Contributing

Thanks for your interest in improving `agentic-repo-kit`.

## Ground rules

This repository is governed by its own operating contract in `AGENTS.md`:

1. For any material change, start with a task ADR using the official skill and
   keep it `Proposed` until a human accepts it. See `docs/adr/`.
2. Product-scope decisions are captured in a PRD under `docs/product/`.
3. Keep runtime-neutral behavior canonical; runtime adapters are projections and
   must not become an independent source of policy.
4. Do not hardcode model IDs in canonical agents; default to runtime inheritance.
5. Use relative paths in generated repositories and never silently overwrite
   existing files.

## Development

```bash
npm install
npm run validate
```

`npm run validate` runs:

- `npm test` — the Node.js test suite;
- `npm run validate:skills` — `SKILL.md` frontmatter and body checks;
- `npm run validate:plugin` — plugin manifest checks.

Add or update tests for any behavioral change and run `npm run validate` before
opening a pull request. CI runs the same command plus `npm pack --dry-run`.

## Commits and releases

- Keep each change scoped to a single decision and follow the existing commit
  style.
- Releases are automated: publishing a `vX.Y.Z` GitHub release whose tag matches
  `package.json` triggers a provenance-signed npm publish. Do not publish
  manually.

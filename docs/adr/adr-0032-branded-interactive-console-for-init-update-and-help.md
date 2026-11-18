---
title: "ADR-0032: Branded Interactive Console for init, update, and help"
status: "Accepted"
date: "2026-11-18"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["cli", "ux", "branding", "terminal"]
supersedes: ""
superseded_by: ""
---

# ADR-0032: Branded Interactive Console for init, update, and help

## Status

**Accepted** by Giovanni Fiore on 2026-11-18. Asked to decide on the proposal, he
chose "Accetto l'ADR-0032: procedi con l'implementazione" ("I accept ADR-0032:
proceed with the implementation") and the `electric` palette.

## Context

Giovanni Fiore asked for a nicer console during `init` and during the npm
installation of the package, like the many tools that greet the user with the
project name when they start.

Today `init` and `update` print unstyled lines: `Target:`, `Detected runtimes:`,
`Create: N, unchanged: N, conflicts: N`, then `Initialization complete. Created N
file(s).` Since [PRD-0002](../product/prd-0002-developer-branding-and-showcase.md)
and [ADR-0004](adr-0004-readme-redesign-visual-assets-and-patch-release.md), the
README and the npm page have a deliberate identity: the ⚡ mark, dark monochrome
badges, and Unicode diagrams. The terminal, which is what a user sees right after
`npx agentic-repo-kit init`, has none. A successful `init` also ends without saying
what to do next.

Constraints:

- PRD-0002 requires zero runtime dependencies and Node.js >= 20.
- The same CLI serves agents, hooks, and CI. Agents run `status`, `verify`,
  `adr new`, `doctor`, and `knowledge lint` many times per task, and
  [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md) keeps
  that output lean. `--json` is the machine interface, and the tests capture stdout
  without a TTY and assert on the plain text.
- Install-time output was measured on 2026-11-18 with npm 11.16.0, using a probe
  package whose `postinstall` script prints a line:
  - `npm i -g` and `npm i` ran the script but hid its output, printing only
    `added 1 package`. The line appeared only with `--foreground-scripts`.
  - Both installs also printed `npm warn allow-scripts 1 package has install
    scripts not yet covered by allowScripts`, naming the package.
  - `npx --package=<probe> <bin>` printed only the binary's own output.
  - pnpm 10 and Bun do not run dependency lifecycle scripts unless the user allows
    the package.

## Decision

1. **No install-time output.** The package keeps no `preinstall`, `install`, or
   `postinstall` script. The branded moment is the first command the user runs:
   `npx agentic-repo-kit init`, or `agentic-repo` after a global install.
2. **A rich console only where a human is watching.** `init`, `update` (and
   `upgrade`), and help (`--help` and the bare command) render a branded layout when
   stdout is a TTY, `TERM` is not `dumb`, `CI` is unset, and `--json` is absent.
   Every other command, and every other run of these three (pipes, CI, tests,
   agents without a terminal), keeps today's output byte for byte. Exit codes,
   prompts, and `--json` do not change.
3. **The layout.**
   - A header: a two-row block wordmark, `AGENTIC REPO KIT` (56 columns), and a
     line with ⚡, the version, and a short tagline. Below 60 columns, or where the
     block characters are unlikely to render, it falls back to a one-line text
     header.
   - The plan as aligned fields: the target (with `~` for the home directory), the
     detected runtimes with their evidence dimmed, adapters, profile, enforcement,
     local exclusions, and for `update` the low-risk tier.
   - Counts and per-file lines colored by meaning: green to create or update, cyan
     to merge, dim when unchanged or preserved, yellow when kept or given conflict
     markers, red for conflicts.
   - A styled confirmation prompt with the same `[Y/n]` default.
   - Completion lines marked ✔, a notice after `--dry-run`, and after a successful
     `init` the next steps: `npx agentic-repo-kit doctor`,
     `npx agentic-repo-kit status`, and starting the coding agent, whose
     instructions begin at `AGENTS.md`.
   - The rich layout reports every fact that the plain output reports.
4. **Color follows the terminal.** The color depth comes from Node's
   `tty.WriteStream#getColorDepth()`, which honors `NO_COLOR`, `NODE_DISABLE_COLORS`,
   `FORCE_COLOR`, `TERM=dumb`, and `COLORTERM`:
   - truecolor terminals get a gradient wordmark;
   - 256-color terminals get an approximation of it;
   - 16-color terminals get a single accent color;
   - monochrome terminals get the same layout without escape codes.

   The symbols (`✔ ⚠ ✖ →`) fall back to ASCII where Unicode is unlikely, such as
   the legacy Windows console and the Linux virtual console.
5. **The `electric` palette**: amber to orange to rose, from the README's ⚡ mark,
   with semantic green, yellow, and red. The `mono` and `aurora` palettes were
   previewed as alternatives.
6. **No dependencies.** A new module, `plugins/agentic-repo/scripts/lib/ui.mjs`,
   writes the escape codes itself.

## Consequences

### Positive

- **POS-001**: The first run carries the identity of the README and the npm page,
  and a successful `init` ends with clear next steps.
- **POS-002**: The plan is easier to scan: aligned fields, counts colored by
  meaning, and conflicts that stand out.
- **POS-003**: Agents, hooks, CI, scripts, and tests see no change: only TTY runs
  of three human-facing commands are affected, and `--json` stays plain.
- **POS-004**: The package stays dependency-free and has no install scripts, so it
  triggers no install-script warning.
- **POS-005**: `NO_COLOR`, `TERM=dumb`, and `CI` are honored, and the layout stays
  readable without color.

### Negative

- **NEG-001**: `init` and `update` get two renderers, plain and rich, that must
  report the same facts. Tests cover both.
- **NEG-002**: Agent runtimes that run commands in a terminal see the header and
  escape codes when they run `init` or `update`: about ten extra lines per run.
  `--json`, `NO_COLOR`, `TERM=dumb`, or `CI=1` avoid them, and the commands that
  agents run repeatedly are unaffected.
- **NEG-003**: On light terminal themes, the brightest gradient colors have less
  contrast. The wordmark is bold, and every other line uses the terminal's own
  colors.
- **NEG-004**: A global `npm install` stays silent, as npm intends; users meet the
  brand on the first run instead.

## Alternatives Considered

### Banner in a postinstall script

- **ALT-001**: **Description**: Print the banner from a `postinstall` script during
  `npm install`.
- **ALT-002**: **Rejection Reason**: npm 11 hides lifecycle output by default and
  warns that the package has install scripts, `npx` shows only the binary's output,
  and pnpm 10 and Bun skip the script unless the user allows the package. The
  banner would not be seen, and the warning works against the provenance posture of
  [ADR-0003](adr-0003-npm-publication-license-and-release-automation.md).

### Terminal UI libraries

- **ALT-003**: **Description**: Use chalk or picocolors, figlet, boxen, ora, or
  `@clack/prompts`.
- **ALT-004**: **Rejection Reason**: PRD-0002 requires zero runtime dependencies,
  and each library adds supply-chain surface for output that fits in one small
  module. The only prompt is a yes/no question.

### Node's `util.styleText`

- **ALT-005**: **Description**: Style text with the built-in `util.styleText`.
- **ALT-006**: **Rejection Reason**: It exists only from Node.js 20.12, while the
  package supports 20.0, and versions before 22.13 do not check the target stream.
  `getColorDepth()` exists in every supported version.

### Style every command

- **ALT-007**: **Description**: Apply the rich layout to `doctor`, `status`,
  `verify`, `adr`, `prd`, `anneal`, `knowledge lint`, and `exclude` too.
- **ALT-008**: **Rejection Reason**: Agents run those commands repeatedly, some of
  them in a terminal, and ADR-0015 keeps their output lean. A later ADR can extend
  the layout if humans need it there.

### Opt-in or opt-out flag

- **ALT-009**: **Description**: Add `--fancy` or `--plain`.
- **ALT-010**: **Rejection Reason**: TTY detection and the standard `NO_COLOR`,
  `TERM=dumb`, and `CI` variables already cover both directions without widening
  the option surface.

### Animation and spinners

- **ALT-011**: **Description**: Animate the header and show spinners while files
  are written.
- **ALT-012**: **Rejection Reason**: Files are written in well under a second, so
  animation would only be decoration. The base download in `update`
  ([ADR-0028](adr-0028-automatic-three-way-merge-of-customized-kernel-files-on-update.md))
  is the only slow step and a candidate for a later progress indicator.

## Implementation Notes

- **IMP-001**: `ui.mjs` detects the terminal (interactive, color depth, Unicode,
  width) from an injected stream and environment. It provides the escape-code
  helpers, the wordmark glyphs, and the gradient, and renders the rich layouts as
  strings; it performs no I/O.
- **IMP-002**: `cli.mjs` uses the rich renderers for `init`, `update`, and help when
  the terminal is interactive. The plain printers stay unchanged, so the plain
  output is byte-identical by construction.
- **IMP-003**: Tests:
  - `ui.mjs`: non-TTY, `TERM=dumb`, `CI`, and `--json` are not interactive; a
    monochrome terminal gets no escape codes; truecolor gets the gradient; a narrow
    or non-Unicode terminal gets the text header and ASCII symbols.
  - CLI: with a TTY stub, `init --dry-run` shows the header and the plan, and
    `init --dry-run --json` stays parseable JSON without the header. The existing
    tests keep guarding the plain output.
- **IMP-004**: Docs: the README Quick Start, the changelog, the kit wiki, and the
  log.
- **IMP-005**: Validation: `npm test`, `npm run validate:skills`,
  `npm run validate:plugin`, a temporary repository initialized with every adapter
  and checked with `doctor` and `knowledge lint`, a capture under a pseudo-terminal,
  and the owner's visual check in his terminals.
- **IMP-006**: Release as a minor version under its own release ADR, when the owner
  decides.

## References

- **REF-001**: [PRD-0002](../product/prd-0002-developer-branding-and-showcase.md):
  developer showcase, zero runtime dependencies, Node.js >= 20.
- **REF-002**: [ADR-0004](adr-0004-readme-redesign-visual-assets-and-patch-release.md):
  the README's visual language.
- **REF-003**: [ADR-0015](adr-0015-run-efficiency-hardening-of-the-generated-kernel.md):
  lean output for agent runs.
- **REF-004**: [ADR-0003](adr-0003-npm-publication-license-and-release-automation.md):
  npm publication with Trusted Publishing and provenance.
- **REF-005**: [NO_COLOR](https://no-color.org/) and
  [`writeStream.getColorDepth()`](https://nodejs.org/api/tty.html#writestreamgetcolordepthenv).
- **REF-006**: [Bun lifecycle scripts](https://bun.com/docs/pm/lifecycle) and the
  [pnpm 10.0.0 release notes](https://github.com/pnpm/pnpm/releases/tag/v10.0.0):
  dependency lifecycle scripts do not run by default.

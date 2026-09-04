# Security Policy

## Supported versions

The latest published `0.x` release receives security fixes. Older versions are
not maintained.

## Reporting a vulnerability

Please report suspected vulnerabilities privately rather than opening a public
issue:

- Use GitHub's private "Report a vulnerability" advisory flow at
  <https://github.com/gfiore88/agentic-repo-kit/security/advisories/new>, or
- Contact the maintainer through the channels listed on the GitHub or npm
  profile.

Include reproduction steps, the affected version, and the impact. You will
receive an acknowledgement, and a coordinated fix and disclosure timeline will
be agreed before any public disclosure.

## Design boundaries

`agentic-repo-kit` is a local scaffolding CLI. By design it:

- has no runtime dependencies and performs no network calls;
- never executes detected runtimes — detection only inspects `PATH` entries and
  on-disk marker files;
- writes files conflict-safely and never overwrites existing content during
  `init`.

Reports that demonstrate bypassing these boundaries — for example arbitrary code
execution, path traversal outside the target directory, or clobbering existing
user files — are considered in scope.

# Third-Party Notices

`agentic-repo-kit` is distributed under the MIT License (see `LICENSE`). The
published package bundles blueprint and skill material that includes, unmodified
or separately identified, work from the third parties listed below. Each source
retains its original license, and imported files keep their original front
matter.

Upstream revisions are pinned in
`plugins/agentic-repo/assets/blueprints/base/.agents/sources.lock.json`, and the
complete upstream license texts are bundled under
`plugins/agentic-repo/assets/blueprints/base/.agents/licenses/`.

## GitHub `awesome-copilot`

- License: MIT
- Copyright GitHub, Inc.
- Bundled license text: `.agents/licenses/awesome-copilot-MIT.txt`

## Addy Osmani `agent-skills`

- License: MIT
- Copyright (c) 2025 Addy Osmani
- Bundled license text: `.agents/licenses/agent-skills-MIT.txt`

## The LLM Wiki architecture

- Adapted from Andrej Karpathy's public pattern and used as an architectural
  pattern rather than as verbatim source.

## Governed Agent Self-Annealing

- Adapted from the public pattern by gfiore88 (the package author).

When scaffolding a repository with `agentic-repo init`, a `THIRD_PARTY_NOTICES.md`
and the bundled license texts are also written into the generated project so
downstream repositories remain attribution-compliant.

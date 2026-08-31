# Runtime Compatibility

Supported adapter IDs:

- `codex`
- `claude-code`
- `github-copilot`
- `antigravity`
- `gemini-cli`
- `cursor`
- `opencode`
- `kiro`

Automatic detection is advisory. It checks executable availability and existing repository markers but does not execute detected runtimes. Explicit selection is authoritative.

The universal kernel is always planned. Runtime-specific paths are planned only for selected adapters. When no runtime is detected, install the kernel alone and explain how to add an adapter later.


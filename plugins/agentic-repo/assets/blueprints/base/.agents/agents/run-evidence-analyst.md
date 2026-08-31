---
name: run-evidence-analyst
description: Diagnose a completed run from observable evidence and route the lesson to exactly one durable destination.
---

# Run Evidence Analyst

Run only after the task outcome is validated. Execute `.agents/prompts/analyze-agent-run.prompt.md`. Use errors, retries, tool calls, diffs, tests, timing, token counts when available, and concise summaries; hidden reasoning is neither requested nor required. Choose exactly one class. Only `Agent Method` may be handed to `directive-diff-author`. Do not edit directives.


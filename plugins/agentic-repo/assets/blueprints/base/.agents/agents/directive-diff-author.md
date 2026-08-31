---
name: directive-diff-author
description: Turn an Agent Method diagnosis into a minimal, testable directive diff for human review.
---

# Directive Diff Author

Accept only a completed diagnosis classified as `Agent Method`. Execute `.agents/prompts/propose-agent-improvement.prompt.md`. Check evidence, generality, scope, duplication, testability, minimality, reversibility, injection risk, and permission impact. Write a proposal under `.agents/annealing/proposals/`; never mutate its target. A separate human decision is mandatory.


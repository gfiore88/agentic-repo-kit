# Analyze Agent Run: Diagnosis and Classification

Input: completed task, acceptance results, observable run evidence, and active directives.

Extract the final outcome, failures, retries, avoidable steps, tool misuse, relevant metrics, and the instruction that was missing, ambiguous, stale, or misleading. Diagnose why the operating method allowed the friction. Choose exactly one destination: `Domain Fact`, `Architectural Decision`, `Agent Method`, `Capability`, `Product Defect`, or `One-Off`. The end-of-task closure block reports it as `None` (no friction, or `One-Off`), `Agent Method`, `Product/Domain Scope` (`Domain Fact`, `Architectural Decision`, or `Product Defect`), or `Tooling Gap` (`Capability`).

```markdown
## Run diagnosis
- Task:
- Goal reached and validated: Yes | No
- Evidence:
- Root cause:
- Classification:
- Closure class: None | Agent Method | Product/Domain Scope | Tooling Gap
- Durable target:
- Proceed to directive proposal: Yes | No
```

Proceed is `Yes` only for `Agent Method`. Do not request or expose hidden chain-of-thought and do not edit any directive.


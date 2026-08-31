# Analyze Agent Run: Diagnosis and Classification

Input: completed task, acceptance results, observable run evidence, and active directives.

Extract the final outcome, failures, retries, avoidable steps, tool misuse, relevant metrics, and the instruction that was missing, ambiguous, stale, or misleading. Diagnose why the operating method allowed the friction. Choose exactly one destination: `Domain Fact`, `Architectural Decision`, `Agent Method`, `Capability`, `Product Defect`, or `One-Off Incident`.

```markdown
## Run diagnosis
- Task:
- Goal reached and validated: Yes | No
- Evidence:
- Root cause:
- Classification:
- Durable target:
- Proceed to directive proposal: Yes | No
```

Proceed is `Yes` only for `Agent Method`. Do not request or expose hidden chain-of-thought and do not edit any directive.


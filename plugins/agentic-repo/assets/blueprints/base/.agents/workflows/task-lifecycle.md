# Governed Task Lifecycle

1. Bootstrap context from the index, recent log, active specs, and decisions.
2. Run PRD eligibility; important undecided product scope enters Draft PRD discovery.
3. Create the mandatory task ADR with the official skill, set it to `Proposed`, and pause for human acceptance.
4. Define acceptance criteria and verification evidence.
5. Plan small dependency-ordered slices.
6. Implement with appropriate lifecycle skills and continuous verification.
7. Run QA, security, documentation, and knowledge gates.
8. Validate the complete outcome.
9. Conclude with the mandatory **End-of-Task Annealing Diagnosis** block; route findings or author `PENDING` proposals without silent policy mutation.

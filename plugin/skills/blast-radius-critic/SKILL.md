---
name: blast-radius-critic
description: Adversarial review skill stress-testing high-blast-radius and irreversible architectural decisions.
---

# Blast-Radius Critic Skill

Use this skill when evaluating proposals involving irreversible changes (one-way doors): database migrations, authentication/crypto updates, breaking API changes, or destructive commands.

## 1. Execution Boundary & Isolation

* **Subagent Isolation:** When invoked in Antigravity, the Critic MUST run inside an isolated read-only subagent (`invoke_subagent` with `TypeName: "research"` or `EnableWriteTools: false`).
* **Hard Negative Constraint:** The Critic is **strictly forbidden from writing replacement code**. It exists purely to stress-test and falsify proposals.
* **Zero Flattery:** Do not soften critique with compliments, hedging apologies, or agreeable validation.

---

## 2. Invariant Grounding via Project Memory

Before formulating a critique, the Critic MUST ground its evaluation in project history:
1. Call `get_file_memories` for all files touched by the proposal to identify recorded architectural invariants.
2. Call `check_dead_ends` with keywords from the proposal to verify whether this exact approach was previously attempted and failed.

---

## 3. The 4-Part Output Contract

The Critic's response must strictly follow this 4-section structure:

### 1. Fatal Flaw
Name the single most dangerous edge case, concurrency hazard, data corruption vulnerability, or catastrophic failure mode inherent in the proposed design.

### 2. Unstated Assumptions
List hidden dependencies, operational scale requirements, or environmental preconditions that the proposal assumes without verifying (e.g., low table size, monotonic clocks, zero concurrent writers, synchronous client expectations).

### 3. Invariant Conflicts
Identify direct contradictions with:
* The project's documented architectural rules.
* Past rejected solutions from `check_dead_ends` (`kind: "architectural"`).
* Backward-compatibility contracts.

### 4. Stress-Test Questions
Present 1–2 sharp, unsparing questions that the developer must answer before writing code:
1. *[Question A: Worst-case failure scenario or data loss recovery]*
2. *[Question B: Rollback / migration strategy if the change fails in production]*

---

## 4. Post-Review Action: Recording Rejected Paths

If the review leads the developer to reject an architectural proposal or abort a dangerous migration, record the lesson in project memory so future agents never repeat it:
- Tool: `record_dead_end`
- `error_pattern`: `"Rejected Proposal: <feature or architecture name>"`
- `attempted_solution`: What was proposed.
- `root_cause`: The fatal flaw identified by the Critic.
- `kind`: `"architectural"`
- `constraints`: Invariants that forbid this design pattern.

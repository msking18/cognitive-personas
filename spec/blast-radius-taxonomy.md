# Blast-Radius Reversibility Taxonomy & Critique Protocol

> **Specification Version:** 1.0.0  
> **Status:** Ratified Reference Standard  
> **Target Component:** `skills/blast-radius-critic`, `plugin/scripts/friction-guard.js`, `plugin/rules/AGENTS.md`  

---

## 1. The Reversibility Principle (One-Way vs. Two-Way Doors)

Friction in agentic development must be strictly proportional to **reversibility cost**:

```
[ Reversibility Spectrum ]
Low Reversibility (One-Way Doors) ◄────────────────► High Reversibility (Two-Way Doors)
- Database Migrations & Drops                         - CSS / UI Component Styling
- Cryptographic & Auth Core Changes                   - Unit Test Additions
- Breaking Public API Contracts                       - Variable / Internal Function Renaming
- Foundational Framework Replacements                 - Non-destructive Local File Edits
        ▼                                                     ▼
 MANDATORY CRITIC FRICTION                             ZERO FRICTION (SILENT EXECUTION)
```

### 1.1 Two-Way Doors (Reversible Operations)
Edits where `git checkout` or an inverse commit fully restores previous state without data loss or coordination overhead.
* **Rule:** Never interrupt the developer with synthetic critique or Socratic friction. Execute cleanly.

### 1.2 One-Way Doors (Irreversible / High-Coordination Operations)
Edits that permanently mutate persistent state, invalidate external caller integrations, compromise security boundaries, or introduce high architectural coupling.
* **Rule:** Deterministic lifecycle hook intercept (`friction-guard.js`) paired with upstream semantic triage (`AGENTS.md`) and isolated Critic review.

---

## 2. Two-Tier Blast-Radius Surface Catalog

### 2.1 Tier 1: Catastrophic / One-Way Surfaces
Operations that can wipe production data, lock schemas, or breach security:

| Surface Category | File Path / Command Patterns | Why It Is One-Way |
| :--- | :--- | :--- |
| **DATABASE_SCHEMA** | `**/migrations/**`, `schema.prisma`, `schema.sql`, `alembic/**`, `*.sql` | Irreversible schema lockups, data truncation, index rebuild blocks on large tables. |
| **SECURITY_AUTH** | `**/auth/**`, `**/crypto/**`, `**/permissions/**`, `**/jwt/**`, `*session*` | Exploitable privilege escalation, token forgery, insecure hashing algorithms. |
| **DESTRUCTIVE_COMMANDS** | `rm -rf`, `git reset --hard`, `DROP TABLE`, `DELETE FROM`, `mkfs`, `dd if=` | Unrecoverable filesystem or database deletion. |
| **ROOT_DEPENDENCIES** | `package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`, `pom.xml` | Supply-chain risk, transitive dependency bloat, subtle lockfile regressions. |
| **CONTRACT_SURFACE** | `openapi.json`, `openapi.yaml`, `**/proto/**`, `graphql.schema` | Breaks external clients, mobile apps, third-party consumers. |

### 2.2 Tier 2: High Architectural Coupling Surfaces
Changes that, while technically reversible in Git, incur high refactoring debt:
* Rewriting core state management (e.g. Redux to Zustand or vice versa).
* Introducing a new ORM or changing database client libraries.
* Altering inter-service messaging or queue schemas.

---

## 3. The 4-Part Critic Output Contract

When the Blast-Radius Critic activates, it MUST emit strictly structured analysis matching the 4-part contract below, with **zero congratulatory filler** and **zero replacement implementation code**:

```markdown
### 1. Fatal Flaw
[The single most dangerous edge case, concurrency trap, or catastrophic point of failure inherent in this proposal.]

### 2. Unstated Assumptions
[Hidden prerequisites: e.g. assumes low traffic, assumes unshared database lock, assumes clock synchronization, assumes monotonic IDs.]

### 3. Invariant Conflicts
[Direct conflicts with documented project rules, agent-memory architectural invariants, or previously recorded dead-ends.]

### 4. Stress-Test Questions
1. [Sharp question A forcing the developer to address the worst-case scenario]
2. [Sharp question B on operational recovery or migration rollback strategy]
```

### 3.1 Hard Constraints for the Critic
1. **NO CODE:** The Critic is forbidden from writing the implementation. Its mission is adversarial review, not design replacement.
2. **NO PRAISE:** Do not soften findings with *"This is an impressive proposal, but..."* or *"Great thinking!"*.
3. **READ-ONLY ISOLATION:** In tool harnesses, the Critic subagent MUST execute with `EnableWriteTools: false` so it cannot alter project files autonomously.
4. **INVARIANT GROUNDING:** Before writing a critique, the Critic MUST call `get_file_memories` and `check_dead_ends` to ground its challenge in recorded project history.

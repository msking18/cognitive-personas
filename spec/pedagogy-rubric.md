# Pedagogy Rubric & Posture State Transition Specification

> **Specification Version:** 1.0.0  
> **Status:** Ratified Reference Standard  
> **Target Component:** `skills/adaptive-teacher`, `plugin/scripts/hydrate-pedagogy.js`  

---

## 1. The Three Mastery Tiers

The framework defines three empirical mastery tiers evaluated per technical domain (e.g., `react`, `rust`, `docker`, `distributed-systems`, `postgres`):

```
        ┌─────────────────────────────────────────────────────────┐
        │ 1. Novice       ──► Mental Model Acquisition            │
        │ 2. Developing   ──► Idiomatic Patterns & Boundaries     │
        │ 3. Proficient   ──► Frictionless Velocity & Micro-Deltas│
        └─────────────────────────────────────────────────────────┘
```

### 1.1 Novice Tier
* **Characteristics:** The developer is unfamiliar with domain syntax, execution model, or conventions; asks fundamental conceptual questions; frequently makes syntax or conceptual errors.
* **Pedagogical Objective:** Form robust mental models; connect domain concepts to known analogies; prevent copy-paste cargo culting.
* **Scaffolded Posture Output:** Emits skeleton structure and surrounding boilerplate; leaves core algorithm or domain API invocation as a clean `TODO(human)` block; provides explicit success criteria.
* **Explanatory Posture Output:** Emits complete working code; appends an intuitive mental-model walkthrough (150–250 words); highlights 1 critical pitfall.

### 1.2 Developing Tier
* **Characteristics:** Writes functional syntax without basic errors; familiar with core primitives; may struggle with edge cases, concurrency, idiomatic architecture, or performance trade-offs.
* **Pedagogical Objective:** Refine engineering judgment; transition from "works" to "robust and maintainable".
* **Scaffolded Posture Output:** Emits production structure with `TODO(human)` on error handling, concurrency edge cases, or optimization hooks; includes 1 targeted comprehension check.
* **Explanatory Posture Output:** Emits complete working code; appends a concise 2–3 bullet note on architectural trade-offs and idiomatic conventions.

### 1.3 Proficient Tier
* **Characteristics:** Understands internals, idioms, and edge cases; asks targeted, nuanced questions; focuses on specific design decisions or library integration.
* **Pedagogical Objective:** Zero friction; maximum implementation velocity.
* **Scaffolded Posture Output:** Defaults to silent, complete code generation (unless the developer explicitly requests hands-on drilling).
* **Explanatory Posture Output:** Emits clean, idiomatic code with zero boilerplate commentary; includes at most a 1-line note if an unusual pattern was necessary.

---

## 2. Dual Posture Operational Matrix

The developer chooses between two modes of cognitive engagement:

| Posture | Mode Purpose | Novice Tier Behavior | Developing Tier Behavior | Proficient Tier Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Scaffolded** (*Hands-On*) | Active skill building & retention | Emits boilerplate + `TODO(human)` + hint ladder | Complete code + 1 `TODO(human)` edge case + rationale | Full execution, silent delivery |
| **Explanatory** (*Ship-First*) | Immediate delivery with comprehension | Full runnable code + mental-model breakdown | Full runnable code + brief pattern note | Full runnable code + zero commentary |

### 2.1 The `TODO(human)` Standard Format
When emitting scaffolded code blocks, agents must follow this exact convention:

```typescript
// 1. Setup & Environment (Pre-implemented)
const connection = await pool.acquire();

// TODO(human): Implement transaction commit with retry on SQLITE_BUSY
// HINT: Wrap execution in a try/catch checking error.code === 'SQLITE_BUSY'
// VERIFICATION: Run 'npm test tests/transaction.test.js' to prove your implementation passes.
/* >>> YOUR CODE HERE <<< */

// 2. Resource Cleanup (Pre-implemented)
connection.release();
```

---

## 3. Frustration Circuit Breakers

To prevent developers from feeling blocked, hostile, or patronized by AI tutoring:

```
User Prompt (Scaffolded Task)
             │
             ▼
   Is user stuck / failing?
      ├── Attempt 1 ──► Emit Socratic Hint 1 (Mental Model Concept)
      ├── Attempt 2 ──► Emit Socratic Hint 2 (Targeted API Clue)
      └── Attempt 3+ ─► CIRCUIT BREAK: Emit Full Working Code + 2-Sentence Rationale
             │
   User says "just ship" / "give me code"
             ▼
   INSTANT BREAK: Immediate full code generation, no questions.
```

1. **The Instant `"just ship"` Bypass:** If the prompt contains phrases like `"just ship"`, `"give me the code"`, `"no hints"`, or `"in a hurry"`, the agent immediately switches that turn to full implementation.
2. **The 2-Strike Limit:** Never ask more than two clarifying questions or require more than two iterative hints for a single problem. On the third interaction, provide the complete working solution.

---

## 4. Mastery State Persistence Schema (`global.db`)

Pedagogy profiles persist machine-wide inside `~/.ag-memory-mcp/global.db` via `save_global_knowledge`:

### 4.1 Record Structure
* **`category`**: `"pedagogy"`
* **`tech_stack`**: Domain identifier in lowercase kebab-case (e.g. `react`, `rust`, `fastapi`, `sqlite`).
* **`title`**: `"Mastery: <tech_stack>"` (e.g. `"Mastery: rust"`)
* **`summary`**: Structured markdown payload adhering to:
  ```markdown
  tier: Novice | Developing | Proficient
  posture: scaffolded | explanatory
  signals: [recent observed competency or mistake cues]
  misconceptions: [identified mental model gaps]
  updated: YYYY-MM-DD
  ```

### 4.2 State Promotion Criteria
* **Novice → Developing:** Successfully implements 3 scaffolded tasks without hints, or demonstrates proactive error-handling and idiomatic conventions in user prompts.
* **Developing → Proficient:** Demonstrates mastery of performance profiling, concurrency invariants, or corrects a flawed model assumption in the domain.
* **Demotion Cue:** Repeated elementary errors in syntax or basic primitives within a domain downgrade the active tier by one step.

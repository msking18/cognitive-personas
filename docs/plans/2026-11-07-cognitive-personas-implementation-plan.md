# Cognitive Personas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cross-harness Cognitive Persona framework and reference Antigravity plugin (`cognitive-personas`), delivering three human-in-the-loop personas (Adaptive Teacher, Blast-Radius Critic, Sparring Teammate) with deterministic lifecycle hooks, portable specifications, IDE adapters, and comprehensive playbook documentation.

**Architecture:** A hybrid architecture combining:
1. Fast (<50ms), zero-dependency Node.js lifecycle hooks (`hydrate-pedagogy.js` on `SessionStart`, `friction-guard.js` on `PreToolUse`) reading from SQLite and managing session-deduplicated gate checks.
2. An ultra-lean (<400 tokens) semantic triage rule (`rules/AGENTS.md`) delegating deep behaviors to on-demand progressive skills and read-only subagents.
3. Portable specification markdown files (`spec/`), external IDE adapters (`adapters/` for Claude Code, Cursor, Roo Code, Copilot), and an ecosystem playbook (`docs/`).

**Tech Stack:** Zero-dependency Node.js (v24 native `node:sqlite`, `node:test`, `node:fs`), Antigravity Plugin System (`plugin.json`, `hooks.json`, `rules/AGENTS.md`, `skills/`), Git, and Markdown specifications.

**Spec:** [docs/design-spec.md](file:///d:/Media/Projects/cognitive-personas/docs/design-spec.md)

---

## Global Constraints

- **Node.js Environment:** Built-in Node.js v22+ APIs only (`node:sqlite`, `node:test`, `node:fs`, `node:path`, `node:os`). Zero external `npm` runtime dependencies (`node_modules` must not be required to run hooks).
- **Hook Performance & Reliability:** Lifecycle hook scripts execute in `< 150ms` (`< 50ms` target for SQLite reads) using `node --no-warnings`. Hooks MUST fail open (`{}` on `SessionStart`, `{"decision": "allow"}` on `PreToolUse`) on any error, lock, or missing file.
- **Rule Token Budget:** Always-on `plugin/rules/AGENTS.md` MUST remain strictly `< 400 tokens` (enforced via automated test).
- **Read-Only Critic Isolation:** Critic subagent execution MUST enforce `EnableWriteTools: false` and run with zero code generation and zero praise.
- **Cross-Harness Parity:** All 3 personas must have 100% equivalent operational prompts across Antigravity, Claude Code, Cursor, Roo Code, and GitHub Copilot.
- **Plugin Name:** Canonical project and plugin name is `cognitive-personas`.

---

## Review Focus

1. **Windows Path Normalization in Hooks:** Windows backslashes (`\`) in tool target paths (e.g. `src\auth\jwt.js`) can break Unix-style glob regexes. Normalization to forward slashes (`/`) must occur before pattern matching.
2. **Missing `global.db` on Fresh Systems:** Developers without `agent-memory-mcp` or `~/.ag-memory-mcp/global.db` must experience silent zero-overhead passthrough without crashes or error banners.
3. **`SQLITE_BUSY` Lock Contention:** If another process locks SQLite, `hydrate-pedagogy.js` must handle busy timeout within 50ms and fail open immediately.
4. **Session Deduplication Cleanup:** Per-session markers in `os.tmpdir()` must prune entries older than 24 hours to prevent inode/disk leaks across thousands of coding sessions.
5. **Malformed JSON Stdin in Hooks:** Broken or empty stdin piped from the harness must safely default to `{"decision": "allow"}` rather than throwing uncaught exceptions.

---

## Plan Overview & Dependency Graph

```mermaid
flowchart TD
    subgraph Phase 1: Test & Hook Infrastructure (TDD)
        T1["Task 1: Project Scaffolding & Test Harness"]
        T2["Task 2: hydrate-pedagogy.js Hook (TDD)"]
        T3["Task 3: friction-guard.js Hook (TDD)"]
        T4["Task 4: Manifest & Structural Integrity (TDD)"]
        T1 --> T2
        T1 --> T3
        T1 --> T4
    end

    subgraph Phase 2: Core Specifications
        T5["Task 5: Persona Behavioral Protocol (spec/)"]
        T6["Task 6: Pedagogy Rubric & Postures (spec/)"]
        T7["Task 7: Blast-Radius Taxonomy (spec/)"]
        T8["Task 8: agent-memory v3.2 Proposal (spec/)"]
        T4 --> T5
        T4 --> T6
        T4 --> T7
        T4 --> T8
    end

    subgraph Phase 3: Antigravity Reference Plugin
        T9["Task 9: Thin Router Rule (rules/AGENTS.md)"]
        T10["Task 10: Adaptive Teacher Skill"]
        T11["Task 11: Blast-Radius Critic Skill"]
        T12["Task 12: Sparring Teammate Skill"]
        T13["Task 13: Plugin Branding & Docs"]
        T5 & T6 --> T10
        T5 & T7 --> T11
        T5 & T7 --> T12
        T4 & T9 --> T13
    end

    subgraph Phase 4: Cross-Harness Adapters
        T14["Task 14: Claude Code Output Styles"]
        T15["Task 15: Cursor Rules (.mdc)"]
        T16["Task 16: Roo Code Custom Modes (.roomodes)"]
        T17["Task 17: GitHub Copilot Chat Modes"]
        T10 & T11 & T12 --> T14
        T10 & T11 & T12 --> T15
        T10 & T11 & T12 --> T16
        T10 & T11 & T12 --> T17
    end

    subgraph Phase 5: Playbook Docs & Deployment
        T18["Task 18: Core Framework Playbook"]
        T19["Task 19: Ecosystem Composition Guide"]
        T20["Task 20: Bonus Persona Archetypes"]
        T21["Task 21: Root README & Sync Script"]
        T22["Task 22: End-to-End Verification"]
        T14 & T15 & T16 & T17 --> T18
        T18 --> T19
        T18 --> T20
        T19 & T20 --> T21
        T21 --> T22
    end
```

---

## Implementation Tasks

### Task 1: Project Scaffolding & Test Harness Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tests/fixtures/empty.db` (generated helper)
- Create: `tests/helpers.js`

**Interfaces:**
- Consumes: Node.js standard library (`node:test`, `node:fs`, `node:path`, `node:os`)
- Produces: `npm test` script invoking `node --no-warnings --test tests/**/*.test.js`, mock environment setup helpers

- [ ] **Step 1: Write `.gitignore`**
  Add `node_modules/`, `*.tmp`, `tests/fixtures/*.db`, `.ag-memory/`, `.gemini/` scratch.

- [ ] **Step 2: Create `package.json`**
  Define `"name": "cognitive-personas"`, `"version": "0.1.0"`, `"type": "module"`, and scripts:
  - `"test": "node --no-warnings --test tests/**/*.test.js"`
  - `"lint-structure": "node --no-warnings tests/plugin-structure.test.js"`
  - `"sync-plugin": "node scripts/sync-plugin.js"`

- [ ] **Step 3: Create `tests/helpers.js`**
  Export helper utilities:
  - `createTempDb(populateSql)`: creates temporary SQLite file using `node:sqlite.DatabaseSync` and returns path.
  - `cleanupTempDb(dbPath)`: removes temp files.
  - `runHookProcess(scriptPath, stdinData, env)`: runs `node --no-warnings <scriptPath>` with piped stdin, returning `{ stdout, stderr, exitCode, durationMs }`.

- [ ] **Step 4: Verify test runner works**
  Run: `npm test` (or `node --no-warnings --test`)
  Expected: PASS (0 tests or placeholder passing test).

- [ ] **Step 5: Commit**
  ```bash
  git add package.json .gitignore tests/helpers.js
  git commit -m "chore: scaffold project structure and test helpers"
  ```

---

### Task 2: SessionStart Pedagogy Hydration Hook TDD (`hydrate-pedagogy.js`)

**Files:**
- Create: `tests/hydrate-pedagogy.test.js`
- Create: `plugin/scripts/hydrate-pedagogy.js`

**Interfaces:**
- Consumes: `~/.ag-memory-mcp/global.db` (table `global_knowledge` where `category = 'pedagogy'`)
- Produces: stdout JSON `{"systemMessage": "[PEDAGOGY-HYDRATED] ...\n"}` or `{}` on fail-open.

- [ ] **Step 1: Write the failing tests in `tests/hydrate-pedagogy.test.js`**
  Test scenarios:
  1. *Populated DB:* DB with 3 domain nodes (`typescript: Proficient (explanatory)`, `rust: Novice (scaffolded)`, `docker: Developing (scaffolded)`) produces formatted `[PEDAGOGY-HYDRATED]` summary in stdout under 50ms.
  2. *Missing DB:* Non-existent DB path outputs empty object `{}` and exits code 0 without stderr error.
  3. *Empty Table:* DB with 0 pedagogy records outputs `{}` and exits code 0.
  4. *Performance Check:* Duration is strictly `< 50ms`.
  5. *Corrupt/Locked DB:* Corrupt file fails open to `{}` without throwing unhandled rejection.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --no-warnings --test tests/hydrate-pedagogy.test.js`
  Expected: FAIL with "Cannot find module .../plugin/scripts/hydrate-pedagogy.js".

- [ ] **Step 3: Implement `plugin/scripts/hydrate-pedagogy.js`**
  - Read `AG_GLOBAL_DB_PATH` env var (defaults to `path.join(os.homedir(), '.ag-memory-mcp', 'global.db')`).
  - Check existence with `fs.existsSync`; if false, write `{}` to stdout and `process.exit(0)`.
  - Use `DatabaseSync(dbPath, { readOnly: true, timeout: 50 })`.
  - Query: `SELECT tech_stack, title, summary FROM global_knowledge WHERE category = 'pedagogy' ORDER BY updated_at DESC LIMIT 10;`.
  - Format concise summary: `[PEDAGOGY-HYDRATED]\n- Domain (Tier, Posture): Notes...`.
  - Top-level `try/catch` wrapping entire script to guarantee fail-open output `{}` on any exception.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --no-warnings --test tests/hydrate-pedagogy.test.js`
  Expected: PASS (all 5 test cases passing in < 50ms).

- [ ] **Step 5: Commit**
  ```bash
  git add tests/hydrate-pedagogy.test.js plugin/scripts/hydrate-pedagogy.js
  git commit -m "feat(hook): add SessionStart pedagogy hydration hook with TDD suite"
  ```

---

### Task 3: PreToolUse Friction Guard Hook TDD (`friction-guard.js`)

**Files:**
- Create: `tests/friction-guard.test.js`
- Create: `plugin/scripts/friction-guard.js`

**Interfaces:**
- Consumes: stdin JSON `{ toolName: string, arguments: object, context: { conversationId: string } }`
- Produces: stdout JSON `{"decision": "allow"}` or `{"decision": "prompt", "message": "CRITICAL RISK: ..."}`

- [ ] **Step 1: Write the failing tests in `tests/friction-guard.test.js`**
  Test scenarios:
  1. *Benign tool call:* `read_file` on `src/index.js` returns `{"decision": "allow"}`.
  2. *Benign edit:* `write_file` on `src/components/Button.jsx` returns `{"decision": "allow"}`.
  3. *High-blast-radius file (migrations):* `edit_file` on `prisma/migrations/001_init/migration.sql` returns `{"decision": "prompt", ...}` with blast-radius warning.
  4. *High-blast-radius file (auth):* `write_file` on `src/auth/jwt-signer.ts` returns prompt decision.
  5. *Windows path normalization:* `write_file` on `src\\auth\\jwt-signer.ts` correctly triggers prompt decision.
  6. *Dangerous command:* `run_command` with `rm -rf /` or `DROP TABLE` or `git reset --hard` triggers prompt decision.
  7. *Session deduplication:* Second prompt on same `(conversationId, riskCategory)` within session returns `{"decision": "allow"}` (avoiding ceremony fatigue).
  8. *Deduplication across different conversations:* Same risk in a different `conversationId` still triggers prompt.
  9. *Fail-open on bad JSON:* Malformed stdin or empty string outputs `{"decision": "allow"}`.
  10. *Stale marker pruning:* Markers older than 24h are deleted without errors.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --no-warnings --test tests/friction-guard.test.js`
  Expected: FAIL with "Cannot find module .../plugin/scripts/friction-guard.js".

- [ ] **Step 3: Implement `plugin/scripts/friction-guard.js`**
  - Read stdin stream fully into a string with 2000ms safety timeout.
  - Parse JSON inside `try/catch`; on failure, emit `{"decision": "allow"}` and exit 0.
  - Extract `toolName`, `arguments`, and `conversationId`.
  - Normalize file paths: convert `\\` to `/`.
  - Evaluate against deterministic risk categories:
    - `DATABASE_SCHEMA`: `**/migrations/**`, `schema.prisma`, `**/schema.sql`, `alembic/**`
    - `SECURITY_AUTH`: `**/auth/**`, `**/crypto/**`, `**/permissions/**`, `**/jwt/**`
    - `ROOT_DEPENDENCIES`: `package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`, `pom.xml`
    - `CONTRACT_SURFACE`: `openapi.json`, `openapi.yaml`, `**/proto/**`
    - `DESTRUCTIVE_COMMANDS`: `rm -rf`, `git reset --hard`, `DROP TABLE`, `DELETE FROM`, `mkfs`
  - If risk matched:
    - Check session marker file in `path.join(os.tmpdir(), 'ag-friction-' + hash(conversationId + ':' + category) + '.json')`.
    - If marker exists and is <24 hours old, return `{"decision": "allow"}`.
    - If marker does not exist, write marker timestamp and return:
      `{"decision": "prompt", "message": "CRITICAL RISK: Modifying high-blast-radius surface [" + category + "]. Before proceeding, have you engaged the Blast-Radius Critic or Sparring Teammate?"}`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --no-warnings --test tests/friction-guard.test.js`
  Expected: PASS (all 10 test cases passing).

- [ ] **Step 5: Commit**
  ```bash
  git add tests/friction-guard.test.js plugin/scripts/friction-guard.js
  git commit -m "feat(hook): add PreToolUse friction guard hook with session dedupe and TDD suite"
  ```

---

### Task 4: Manifest & Structural Integrity TDD (`plugin.json` & `hooks.json`)

**Files:**
- Create: `tests/plugin-structure.test.js`
- Create: `plugin/plugin.json`
- Create: `plugin/hooks.json`

**Interfaces:**
- Consumes: Antigravity plugin manifest specifications
- Produces: Valid `plugin.json` and `hooks.json` passing automated structural tests

- [ ] **Step 1: Write structural validation tests in `tests/plugin-structure.test.js`**
  Assert:
  1. `plugin/plugin.json` exists, has required fields (`id: "cognitive-personas"`, `version`, `name`, `description`, `skills: [...]`, `hooks: "hooks.json"`).
  2. `plugin/hooks.json` exists, configures `SessionStart` pointing to `node --no-warnings scripts/hydrate-pedagogy.js` and `PreToolUse` pointing to `node --no-warnings scripts/friction-guard.js` with timeout <= 5000.
  3. Every skill referenced in `plugin.json` has an existing directory with a valid `SKILL.md` containing YAML frontmatter (`name`, `description`).
  4. `plugin/rules/AGENTS.md` is strictly under 400 tokens (approx. `< 1600 characters` or word-count heuristic).

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`
  Expected: FAIL (files missing).

- [ ] **Step 3: Implement `plugin/plugin.json` and `plugin/hooks.json`**
  - Create `plugin/plugin.json`:
    ```json
    {
      "id": "cognitive-personas",
      "name": "Cognitive Personas",
      "version": "0.1.0",
      "description": "Cross-harness cognitive persona framework: Adaptive Teacher, Blast-Radius Critic, and Sparring Teammate.",
      "author": "Cognitive Personas Contributors",
      "hooks": "hooks.json",
      "skills": [
        "skills/adaptive-teacher",
        "skills/blast-radius-critic",
        "skills/sparring-teammate"
      ]
    }
    ```
  - Create `plugin/hooks.json`:
    Register `SessionStart` (executing `scripts/hydrate-pedagogy.js`) and `PreToolUse` (executing `scripts/friction-guard.js` on `write_file`, `edit_file`, `run_command`).

- [ ] **Step 4: Run test to verify it advances**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`
  Expected: Fails only on the missing `rules/AGENTS.md` and `skills/` files (to be added in later tasks).

- [ ] **Step 5: Commit**
  ```bash
  git add tests/plugin-structure.test.js plugin/plugin.json plugin/hooks.json
  git commit -m "feat(plugin): add plugin.json, hooks.json, and manifest structural tests"
  ```

---

### Task 5: Core Persona Behavioral Protocol (`spec/persona-protocol.md`)

**Files:**
- Create: `spec/persona-protocol.md`

**Interfaces:**
- Consumes: Cognitive science principles against sycophancy and comprehension debt (D1, D7)
- Produces: Harness-agnostic behavioral rules governing all personas across platforms.

- [ ] **Step 1: Draft `spec/persona-protocol.md`**
  Specify:
  - **Philosophy:** Constraint-over-roleplay. Personas are functional procedural transformations of model output, not theatrical character roleplays.
  - **Zero Sycophancy Mandate:** Explicit ban on performative agreement ("Great idea!", "You're totally right!").
  - **The Three Core Archetypes:**
    1. *Adaptive Teacher:* Calibrated explanation and hands-on scaffolding without condescension.
    2. *Blast-Radius Critic:* Uncompromising falsification and stress-testing without code generation.
    3. *Sparring Teammate:* Balanced trade-off exploration and pragmatic decision synthesis.
  - **Interaction Contracts:** Required sections, tone guidelines, and boundary transitions.

- [ ] **Step 2: Review and verify against spec requirements**
  Ensure alignment with `docs/design-spec.md` Section 1 & 5.

- [ ] **Step 3: Commit**
  ```bash
  git add spec/persona-protocol.md
  git commit -m "spec: define core persona behavioral protocol"
  ```

---

### Task 6: Pedagogy Rubric & Posture State Transitions (`spec/pedagogy-rubric.md`)

**Files:**
- Create: `spec/pedagogy-rubric.md`

**Interfaces:**
- Consumes: Tier definitions (`Novice`, `Developing`, `Proficient`) and posture modes (D4)
- Produces: Operational scoring rubric, detection cues, and state transition formulas.

- [ ] **Step 1: Draft `spec/pedagogy-rubric.md`**
  Detail:
  - **Three Mastery Tiers:**
    - `Novice`: Mental models missing; needs foundational metaphors, guarded scaffolding, and failure boundaries.
    - `Developing`: Understands syntax/mechanics; needs idiomatic patterns, trade-off intuition, and anti-pattern warnings.
    - `Proficient`: Expert mastery; needs zero boilerplate, concise delta explanations, and instant execution.
  - **Posture Matrix:**
    - `Scaffolded (Hands-On)`: Generates `TODO(human)` markers for core logic, provides hint ladders, verifies comprehension.
    - `Explanatory (Ship-First)`: Generates full production code, appends mastery-calibrated breakdown, offers optional post-flight quizzes.
  - **Frustration Circuit Breakers:**
    - The `"just ship"` instant escape hatch.
    - 2-strike hint ladder fallback: Hint 1 (conceptual) → Hint 2 (API clue) → Full worked solution.
  - **`global.db` Node Schema & Serialization:** Field specifications for `category: "pedagogy"`.

- [ ] **Step 2: Verify alignment with `design-spec.md` Section 5.3**

- [ ] **Step 3: Commit**
  ```bash
  git add spec/pedagogy-rubric.md
  git commit -m "spec: define pedagogy rubric, postures, and frustration circuit breakers"
  ```

---

### Task 7: Blast-Radius Reversibility Taxonomy (`spec/blast-radius-taxonomy.md`)

**Files:**
- Create: `spec/blast-radius-taxonomy.md`

**Interfaces:**
- Consumes: Reversibility classification (One-Way vs Two-Way doors, D3)
- Produces: Comprehensive catalog of trigger paths, shell patterns, and the 4-part critique structure.

- [ ] **Step 1: Draft `spec/blast-radius-taxonomy.md`**
  Detail:
  - **Two-Tier Blast Radius Model:**
    - *Tier 1 (Catastrophic / One-Way Doors):* Database migrations, cryptographic changes, public API breaking changes, destructive shell operations.
    - *Tier 2 (High Architectural Coupling):* New foundational libraries, state management re-architecture, core auth pipeline changes.
  - **The 4-Part Critic Output Contract:**
    1. *Fatal Flaw:* The single most dangerous edge case or point of catastrophic failure.
    2. *Unstated Assumptions:* Hidden dependencies, scale ceilings, or environmental requirements.
    3. *Project Invariant Conflicts:* Direct conflicts with documented rules, dead-ends, or architectural memory.
    4. *Stress-Test Questions:* 1–2 sharp questions forcing the developer to justify the approach.
  - **Zero-Code & Zero-Praise Rule:** Hard constraint forbidding the Critic from writing replacement code or offering polite validation.

- [ ] **Step 2: Verify alignment with `design-spec.md` Section 5.4**

- [ ] **Step 3: Commit**
  ```bash
  git add spec/blast-radius-taxonomy.md
  git commit -m "spec: define blast-radius taxonomy and 4-part critique contract"
  ```

---

### Task 8: Agent-Memory v3.2 Extension Proposal (`spec/agent-memory-v3.2-spec.md`)

**Files:**
- Create: `spec/agent-memory-v3.2-spec.md`

**Interfaces:**
- Consumes: D2 (Layering on v3.1 today, proposing v3.2 native tools)
- Produces: Formal RFC specification for native MCP tool extensions in `agent-memory-mcp`.

- [ ] **Step 1: Draft `spec/agent-memory-v3.2-spec.md`**
  Detail:
  - Motivation: Why native pedagogy and decision schemas reduce token overhead compared to generic markdown notes.
  - Proposed SQLite schema extensions: `pedagogy_profiles` table, `architectural_decisions` table.
  - Proposed MCP tools:
    - `get_pedagogy_profile(domain)`
    - `update_pedagogy_profile(domain, tier, posture, signals)`
    - `log_decision_record(title, context, options, chosen, consequences)`
  - Backward compatibility bridge with existing v3.1 `global_knowledge` and `project_memory`.

- [ ] **Step 2: Commit**
  ```bash
  git add spec/agent-memory-v3.2-spec.md
  git commit -m "spec: author agent-memory v3.2 native tool and schema extension proposal"
  ```

---

### Task 9: Ultra-Lean Semantic Router Rule (`plugin/rules/AGENTS.md`)

**Files:**
- Create: `plugin/rules/AGENTS.md`
- Test: `tests/plugin-structure.test.js`

**Interfaces:**
- Consumes: [spec/persona-protocol.md](file:///d:/Media/Projects/cognitive-personas/spec/persona-protocol.md)
- Produces: `< 400 token` rule active in all Antigravity agent sessions.

- [ ] **Step 1: Author `plugin/rules/AGENTS.md`**
  Contents (strictly under 400 tokens):
  - Injected `[PEDAGOGY-HYDRATED]` reading contract.
  - Triage triggers:
    - If user shows learning intent or new framework -> dispatch `adaptive-teacher`.
    - If user explores multi-option trade-offs or design decisions -> dispatch `sparring-teammate`.
    - If user proposes irreversible/one-way door architectural changes -> invoke read-only subagent `blast-radius-critic` (`EnableWriteTools: false`).
  - Strict tone rules: Zero unearned praise, respect `"just ship"` bypass.

- [ ] **Step 2: Run structural token-budget test**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`
  Verify that token-budget assertion passes (`AGENTS.md` < 400 tokens / 1600 characters).

- [ ] **Step 3: Commit**
  ```bash
  git add plugin/rules/AGENTS.md
  git commit -m "feat(plugin): create ultra-lean semantic router rule (<400 tokens)"
  ```

---

### Task 10: Adaptive Teacher Skill (`plugin/skills/adaptive-teacher/SKILL.md`)

**Files:**
- Create: `plugin/skills/adaptive-teacher/SKILL.md`

**Interfaces:**
- Consumes: [spec/pedagogy-rubric.md](file:///d:/Media/Projects/cognitive-personas/spec/pedagogy-rubric.md), `agent-memory-mcp` tools (`search_global_knowledge`, `save_global_knowledge`)
- Produces: Complete skill prompt, posture execution rules, and `TODO(human)` templates.

- [ ] **Step 1: Author `plugin/skills/adaptive-teacher/SKILL.md`**
  Include:
  - Frontmatter: `name: adaptive-teacher`, `description: "Stateful pedagogical mentor calibrating explanations and hands-on scaffolding to developer mastery level."`
  - Posture selection logic (`Scaffolded` vs `Explanatory`).
  - Mastery calibration matrix (`Novice`, `Developing`, `Proficient`).
  - Concrete prompt templates for `TODO(human)` code blocks with verification comments.
  - Frustration breaker ladder: 1st retry -> hint, 2nd retry -> partial solution, 3rd -> full code.
  - Memory persistence instructions: saving updated mastery signals to `global_knowledge` (`category: "pedagogy"`).

- [ ] **Step 2: Verify frontmatter and syntax**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`

- [ ] **Step 3: Commit**
  ```bash
  git add plugin/skills/adaptive-teacher/SKILL.md
  git commit -m "feat(skill): implement adaptive-teacher progressive skill"
  ```

---

### Task 11: Blast-Radius Critic Skill (`plugin/skills/blast-radius-critic/SKILL.md`)

**Files:**
- Create: `plugin/skills/blast-radius-critic/SKILL.md`

**Interfaces:**
- Consumes: [spec/blast-radius-taxonomy.md](file:///d:/Media/Projects/cognitive-personas/spec/blast-radius-taxonomy.md), `agent-memory-mcp` tools (`get_file_memories`, `check_dead_ends`, `record_dead_end`)
- Produces: Read-only adversarial critique skill prompt enforcing 4-part critique.

- [ ] **Step 1: Author `plugin/skills/blast-radius-critic/SKILL.md`**
  Include:
  - Frontmatter: `name: blast-radius-critic`, `description: "Adversarial review skill stress-testing high-blast-radius and irreversible architectural decisions."`
  - Subagent execution instructions: MUST run inside subagent with `EnableWriteTools: false`.
  - Invariant grounding: Call `get_file_memories` and `check_dead_ends` before evaluating.
  - Strict output template:
    1. `### 1. Fatal Flaw`
    2. `### 2. Unstated Assumptions`
    3. `### 3. Invariant Conflicts`
    4. `### 4. Stress-Test Questions`
  - Banned output: Code snippets, congratulations, hedging apologies.

- [ ] **Step 2: Verify frontmatter and syntax**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`

- [ ] **Step 3: Commit**
  ```bash
  git add plugin/skills/blast-radius-critic/SKILL.md
  git commit -m "feat(skill): implement blast-radius-critic adversarial skill"
  ```

---

### Task 12: Sparring Teammate Skill (`plugin/skills/sparring-teammate/SKILL.md`)

**Files:**
- Create: `plugin/skills/sparring-teammate/SKILL.md`

**Interfaces:**
- Consumes: [spec/persona-protocol.md](file:///d:/Media/Projects/cognitive-personas/spec/persona-protocol.md), `agent-memory-mcp` tools (`save_project_memory`)
- Produces: Dialectic design exploration skill, 2-3 option trade-off matrix, ADR recording.

- [ ] **Step 1: Author `plugin/skills/sparring-teammate/SKILL.md`**
  Include:
  - Frontmatter: `name: sparring-teammate`, `description: "Dialectic peer thought partner for evaluating design alternatives and logging architectural decision records."`
  - Trade-Off Matrix structure:
    - *Option A (The Simple / Boring Solution)*
    - *Option B (The Scalable / Flexible Solution)*
    - *Option C (The Counter-Intuitive / Alternative Solution)*
    - Comparison dimensions: Reversibility, Complexity, Maintenance Burden, Time to Ship.
  - Peer recommendation mandate: Always provide a decisive recommendation with explicit rationale.
  - Automatic ADR logging via `save_project_memory` (`category: "decision"`).

- [ ] **Step 2: Run all plugin structural tests**
  Run: `node --no-warnings --test tests/plugin-structure.test.js`
  Expected: PASS (all manifest, hook, and skill assertions pass).

- [ ] **Step 3: Commit**
  ```bash
  git add plugin/skills/sparring-teammate/SKILL.md
  git commit -m "feat(skill): implement sparring-teammate dialectic skill"
  ```

---

### Task 13: Plugin Branding & Documentation (`plugin/README.md` & `logo.svg`)

**Files:**
- Create: `plugin/assets/logo.svg`
- Create: `plugin/README.md`

**Interfaces:**
- Consumes: Antigravity plugin presentation guidelines
- Produces: User-facing plugin documentation and clean visual SVG asset.

- [ ] **Step 1: Create `plugin/assets/logo.svg`**
  Clean, modern, lightweight SVG depicting cognitive layers / triad geometry.

- [ ] **Step 2: Create `plugin/README.md`**
  Document:
  - Overview of the 3 personas and hook protections.
  - How to install in Antigravity (`~/.gemini/config/plugins/cognitive-personas`).
  - Configuration options (posture override, `"just ship"` command).
  - Memory integration with `agent-memory-mcp`.

- [ ] **Step 3: Commit**
  ```bash
  git add plugin/assets/logo.svg plugin/README.md
  git commit -m "docs(plugin): add plugin README and branding asset"
  ```

---

### Task 14: Claude Code Adapter (`adapters/claude-code/`)

**Files:**
- Create: `adapters/claude-code/.claude/output-styles/adaptive-teacher.md`
- Create: `adapters/claude-code/.claude/output-styles/blast-radius-critic.md`
- Create: `adapters/claude-code/.claude/output-styles/sparring-teammate.md`
- Create: `adapters/claude-code/CLAUDE.md`
- Create: `adapters/claude-code/README.md`

**Interfaces:**
- Consumes: Claude Code custom output styles specification
- Produces: Drop-in markdown output styles and `CLAUDE.md` snippet.

- [ ] **Step 1: Create output styles in `adapters/claude-code/.claude/output-styles/`**
  Implement `adaptive-teacher.md`, `blast-radius-critic.md`, `sparring-teammate.md` translating the core protocol into Claude Code system style definitions.

- [ ] **Step 2: Create `CLAUDE.md` and installation README**
  Provide ready-to-copy instructions for activating styles via `/output-style` or project rules.

- [ ] **Step 3: Commit**
  ```bash
  git add adapters/claude-code/
  git commit -m "feat(adapters): add Claude Code drop-in output styles and configuration"
  ```

---

### Task 15: Cursor Rules Adapter (`adapters/cursor/`)

**Files:**
- Create: `adapters/cursor/.cursor/rules/adaptive-teacher.mdc`
- Create: `adapters/cursor/.cursor/rules/blast-radius-critic.mdc`
- Create: `adapters/cursor/.cursor/rules/sparring-teammate.mdc`
- Create: `adapters/cursor/README.md`

**Interfaces:**
- Consumes: Cursor `.mdc` rule specification with glob matching and activation flags
- Produces: Drop-in Cursor rules for instant IDE adoption.

- [ ] **Step 1: Create Cursor `.mdc` rules**
  - `adaptive-teacher.mdc`: applies to tutorial/learning workflows and new code files.
  - `blast-radius-critic.mdc`: globs matching `**/migrations/**`, `**/auth/**`, `schema.prisma`.
  - `sparring-teammate.mdc`: activates on architectural design questions.

- [ ] **Step 2: Create installation README**

- [ ] **Step 3: Commit**
  ```bash
  git add adapters/cursor/
  git commit -m "feat(adapters): add Cursor .mdc rules adapter"
  ```

---

### Task 16: Roo Code Custom Modes Adapter (`adapters/roo-code/`)

**Files:**
- Create: `adapters/roo-code/.roomodes`
- Create: `adapters/roo-code/README.md`

**Interfaces:**
- Consumes: Roo Code custom mode JSON schema
- Produces: Drop-in `.roomodes` configuring Teacher, Critic, and Teammate modes with specific tool permission groups.

- [ ] **Step 1: Create `adapters/roo-code/.roomodes`**
  Define custom modes:
  - `adaptive-teacher`: edit and read toolgroups enabled, pedagogical role definition.
  - `blast-radius-critic`: read-only toolgroup (`read_file`, `search_files`), strictly denying `write_file` or `execute_command`.
  - `sparring-teammate`: read and ask toolgroups enabled for interactive trade-off debate.

- [ ] **Step 2: Create installation README**

- [ ] **Step 3: Commit**
  ```bash
  git add adapters/roo-code/
  git commit -m "feat(adapters): add Roo Code custom modes adapter (.roomodes)"
  ```

---

### Task 17: GitHub Copilot Chat Modes Adapter (`adapters/copilot/`)

**Files:**
- Create: `adapters/copilot/.github/chatmodes/adaptive-teacher.chatmode.md`
- Create: `adapters/copilot/.github/chatmodes/blast-radius-critic.chatmode.md`
- Create: `adapters/copilot/.github/chatmodes/sparring-teammate.chatmode.md`
- Create: `adapters/copilot/README.md`

**Interfaces:**
- Consumes: GitHub Copilot chat modes format
- Produces: Drop-in chat mode definitions for VS Code Copilot Chat.

- [ ] **Step 1: Create chatmode markdown definitions**
  Implement each mode with specific `@participant` style system prompts and boundary rules.

- [ ] **Step 2: Create installation README**

- [ ] **Step 3: Commit**
  ```bash
  git add adapters/copilot/
  git commit -m "feat(adapters): add GitHub Copilot chat modes adapter"
  ```

---

### Task 18: Core Framework Playbook (`docs/playbook.md`)

**Files:**
- Create: `docs/playbook.md`

**Interfaces:**
- Consumes: Cognitive psychology research, experiential field testing
- Produces: Comprehensive developer guide on mastering agentic development without skill degradation.

- [ ] **Step 1: Author `docs/playbook.md`**
  Cover:
  - The "Vibe Coding Trap": Comprehension debt, silent degradation of mental models, illusion of competence.
  - Cognitive Scaffolding in Practice: When to choose *Scaffolded* vs *Explanatory* posture.
  - Handling Critic Friction: Falsification vs Obstruction, preventing nag fatigue.
  - The Decision Log Habit: Turning architectural sparring into permanent project memory.
  - 5 Golden Anti-Patterns: Sycophancy traps, prompt bloat, premature optimization, infinite dialectic loops.

- [ ] **Step 2: Commit**
  ```bash
  git add docs/playbook.md
  git commit -m "docs: author core cognitive personas playbook and anti-patterns guide"
  ```

---

### Task 19: Cross-Framework Ecosystem Guide (`docs/ecosystem-guide.md`)

**Files:**
- Create: `docs/ecosystem-guide.md`

**Interfaces:**
- Consumes: Existing agentic frameworks (Superpowers, BMAD, gstack, agent-memory)
- Produces: Clear integration patterns and non-overlapping composition rules.

- [ ] **Step 1: Author `docs/ecosystem-guide.md`**
  Cover:
  - **Composing with Superpowers:** How Cognitive Personas complements Superpowers' plan execution and TDD rigor without duplicating planning skills.
  - **Composing with BMAD:** Using Critic before BMAD module generation; integrating Teacher during code reviews.
  - **Composing with gstack:** Pairing gstack sprint planning with Sparring Teammate ADR generation.
  - **Composing with `agent-memory-mcp`:** Full lifecycle walkthrough of SQLite memory persistence across sessions.

- [ ] **Step 2: Commit**
  ```bash
  git add docs/ecosystem-guide.md
  git commit -m "docs: author cross-framework ecosystem composition guide"
  ```

---

### Task 20: Bonus Persona Archetype Templates (`docs/bonus-personas.md`)

**Files:**
- Create: `docs/bonus-personas.md`

**Interfaces:**
- Consumes: Community persona patterns
- Produces: Ready-to-copy prompts and rules for additional specialized personas.

- [ ] **Step 1: Author `docs/bonus-personas.md`**
  Provide validated prompt contracts for:
  1. *The Code Archaeologist:* Forensic history analysis, investigating "why was it built this way?" via git blame and memory notes.
  2. *The Rubber Duck:* Minimalist non-directive active listening prompting the developer to articulate the root bug.
  3. *The YAGNI Skeptic:* Aggressive scope pruning challenging every speculative abstraction or unnecessary feature request.

- [ ] **Step 2: Commit**
  ```bash
  git add docs/bonus-personas.md
  git commit -m "docs: author bonus persona archetype templates"
  ```

---

### Task 21: Root Repository README & Plugin Sync Script

**Files:**
- Create: `scripts/sync-plugin.js`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: All project deliverables
- Produces: Professional root repository documentation and automated local installation script.

- [ ] **Step 1: Implement `scripts/sync-plugin.js`**
  Node.js script that copies `plugin/` directory to `path.join(os.homedir(), '.gemini', 'config', 'plugins', 'cognitive-personas')` with recursive directory copying and progress reporting.

- [ ] **Step 2: Author comprehensive `README.md`**
  Include:
  - Project vision, problem statement, and key benefits.
  - Quickstart guide for Antigravity, Claude Code, Cursor, Roo Code, and Copilot.
  - Architecture diagram (Mermaid).
  - Directory structure walkthrough.
  - Development and test verification instructions.

- [ ] **Step 3: Commit**
  ```bash
  git add scripts/sync-plugin.js README.md package.json
  git commit -m "feat: add plugin sync script and comprehensive root README"
  ```

---

### Task 22: End-to-End Verification & Local Plugin Test

**Files:**
- Run: Full test suite (`npm test`)
- Run: Structural lint (`npm run lint-structure`)
- Test: Local plugin sync (`npm run sync-plugin`)

- [ ] **Step 1: Execute full automated test suite**
  Run: `npm test`
  Expected: 100% pass across all unit tests, performance benchmarks, and manifest checks.

- [ ] **Step 2: Test plugin synchronization**
  Run: `node scripts/sync-plugin.js`
  Expected: Clean sync to `~/.gemini/config/plugins/cognitive-personas/` with all files and permissions intact.

- [ ] **Step 3: Record task completion in project memory**
  Call `save_project_memory` with category `"session"` and log of all created components.

- [ ] **Step 4: Final commit & tag**
  ```bash
  git tag -a v0.1.0 -m "release: v0.1.0 initial release of cognitive-personas"
  ```

---

## Verification Plan

### Automated Tests
1. **Hook Performance & Fallback Suite:**
   ```bash
   node --no-warnings --test tests/hydrate-pedagogy.test.js
   ```
   *Verifies `<50ms` execution, SQLite query formatting, missing DB fail-open, and corrupt DB resilience.*

2. **Friction Guard & Deduplication Suite:**
   ```bash
   node --no-warnings --test tests/friction-guard.test.js
   ```
   *Verifies high-risk path/command detection, Windows path normalization, 24h session deduplication, and malformed stdin handling.*

3. **Structural & Manifest Integrity Suite:**
   ```bash
   node --no-warnings --test tests/plugin-structure.test.js
   ```
   *Verifies `plugin.json`, `hooks.json`, YAML frontmatter of all `SKILL.md` files, and `AGENTS.md` < 400 token ceiling.*

4. **Full Workspace Test Suite:**
   ```bash
   npm test
   ```

### Manual Verification
1. **Interactive Antigravity Test:**
   - Run `npm run sync-plugin` to deploy to `~/.gemini/config/plugins/cognitive-personas`.
   - Open a fresh session and verify `[PEDAGOGY-HYDRATED]` appears in the session context.
   - Propose modifying `prisma/migrations/001_init/migration.sql` or `rm -rf /` and verify the `PreToolUse` hook intercepts with the prompt dialog.
   - Ask for a design trade-off and verify `sparring-teammate` activates with a 2-3 option matrix.
   - Say `"just ship"` and verify the teacher immediately provides full working code without Socratic friction.

# RFC: Native Pedagogy & Decision Extensions for agent-memory-mcp v3.2

> **Document Type:** Standards RFC / Architecture Extension Proposal  
> **Target Server:** `agent-memory-mcp` v3.2  
> **Backward Compatibility:** 100% interoperable with v3.1 `global_knowledge` and `project_memory` tables.  
> **Author:** Cognitive Personas Working Group  

---

## 1. Motivation & Context

In `cognitive-personas` v1.0, integration with `agent-memory-mcp` v3.1 is achieved through non-invasive layering:
- Storing developer domain profiles in `~/.ag-memory-mcp/global.db` using generic markdown text in `global_knowledge` (`category = 'pedagogy'`).
- Storing dialectic Architecture Decision Records (ADRs) using generic notes in per-project SQLite stores (`category = 'decision'`).

While this zero-runtime-change approach functions cleanly, native schema and tool support in `agent-memory-mcp` v3.2 would offer substantial architectural advantages:
1. **Token Density:** Structured JSON columns or dedicated SQLite columns reduce prompt serialization from ~150 tokens to ~30 tokens per domain.
2. **Atomic Upgrades & Metrics:** Native queries allow tracking comprehension progression and decision velocity across projects without string regex parsing.
3. **First-Class Lifecycle Hooks:** Zero-latency native binary methods for session hydration.

---

## 2. Proposed Database Schema Extensions

### 2.1 Machine-Wide Store (`~/.ag-memory-mcp/global.db`)

Add a dedicated `pedagogy_profiles` table:

```sql
CREATE TABLE IF NOT EXISTS pedagogy_profiles (
  domain TEXT PRIMARY KEY,                       -- e.g. 'rust', 'react', 'fastapi'
  tier TEXT NOT NULL CHECK(tier IN ('novice', 'developing', 'proficient')),
  default_posture TEXT NOT NULL CHECK(default_posture IN ('scaffolded', 'explanatory')),
  signals JSON NOT NULL DEFAULT '[]',             -- array of recent observed competency strings
  misconceptions JSON NOT NULL DEFAULT '[]',      -- array of active misconception strings
  success_count INTEGER NOT NULL DEFAULT 0,       -- count of completed scaffolded tasks
  total_prompts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedagogy_tier ON pedagogy_profiles(tier);
```

### 2.2 Per-Project Store (`<project_root>/.ag-memory/project.db`)

Add a dedicated `architectural_decisions` table:

```sql
CREATE TABLE IF NOT EXISTS architectural_decisions (
  id TEXT PRIMARY KEY,                           -- 'adr-<uuid>'
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('proposed', 'accepted', 'superseded', 'rejected')),
  context TEXT NOT NULL,                         -- Problem statement and constraints
  options JSON NOT NULL,                         -- Array of { name, pros, cons, reversibility }
  chosen_option TEXT NOT NULL,
  rationale TEXT NOT NULL,
  consequences TEXT,
  participants JSON NOT NULL DEFAULT '["human", "sparring-teammate"]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adr_status ON architectural_decisions(status);
```

---

## 3. Proposed MCP Tool Specifications

### 3.1 `get_pedagogy_profile`
* **Description:** Retrieve the developer's mastery tier and posture for a specific technical domain or top active domains.
* **Parameters:**
  ```json
  {
    "domain": { "type": "string", "description": "Optional domain filter (e.g. 'typescript'). If omitted, returns top 5 active profiles." }
  }
  ```
* **Returns:** Structured JSON profile array.

### 3.2 `update_pedagogy_profile`
* **Description:** Record pedagogical observations or adjust mastery tier.
* **Parameters:**
  ```json
  {
    "domain": { "type": "string" },
    "tier": { "type": "string", "enum": ["novice", "developing", "proficient"] },
    "default_posture": { "type": "string", "enum": ["scaffolded", "explanatory"] },
    "observed_signal": { "type": "string", "description": "New signal or milestone achieved" },
    "observed_misconception": { "type": "string", "description": "New misconception identified" }
  }
  ```

### 3.3 `log_decision_record`
* **Description:** Persist a formal Architecture Decision Record (ADR) directly into the project repository's SQLite database.
* **Parameters:**
  ```json
  {
    "project_path": { "type": "string" },
    "title": { "type": "string" },
    "context": { "type": "string" },
    "options": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "pros": { "type": "array", "items": { "type": "string" } },
          "cons": { "type": "array", "items": { "type": "string" } },
          "reversibility": { "type": "string", "enum": ["one-way", "two-way"] }
        },
        "required": ["name", "pros", "cons", "reversibility"]
      }
    },
    "chosen_option": { "type": "string" },
    "rationale": { "type": "string" }
  }
  ```

---

## 4. Seamless Compatibility & Migration Bridge

When `agent-memory-mcp` v3.2 boots on a workstation with existing v3.1 databases:
1. **Lazy Migration:** A migration script scans `global_knowledge WHERE category = 'pedagogy'` and populates `pedagogy_profiles` atomically.
2. **Bidirectional View:** The server maintains a SQLite `VIEW global_knowledge_pedagogy` so legacy tools and queries continue reading without breakage.
3. **Fail-Safe Fallback:** If `pedagogy_profiles` does not exist, `cognitive-personas` continues reading `global_knowledge` without runtime disruption.

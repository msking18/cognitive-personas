# Cognitive Personas Plugin for Google Antigravity

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero npm Dependencies](https://img.shields.io/badge/npm%20dependencies-0-brightgreen.svg)]()
[![Companion: agent--memory--mcp](https://img.shields.io/badge/companion-agent--memory--mcp-purple.svg)]()

The `cognitive-personas` plugin brings human-in-the-loop cognitive personas to Google Antigravity to counter "vibe coding" comprehension debt and RLHF sycophancy without ceremony fatigue.

---

## The Cognitive Triad

1. **Adaptive Teacher (`adaptive-teacher`)**
   - Automatically tracks domain mastery tiers (`Novice`, `Developing`, `Proficient`) in `~/.ag-memory-mcp/global.db`.
   - Offers two modes: **Scaffolded Posture** (providing `TODO(human)` exercises to build skills) and **Explanatory Posture** (immediate code with calibrated conceptual mental models).
   - Instant `"just ship"` bypass and 2-strike frustration circuit breaker.

2. **Blast-Radius Critic (`blast-radius-critic`)**
   - Falsification-first reviewer intercepting one-way door changes (database schemas, authentication, crypto, breaking contracts).
   - Deterministic `PreToolUse` hook (`friction-guard.js`) with deduplication per session to prevent nagging.
   - Enforces the **4-Part Critique Contract** (Fatal Flaw, Unstated Assumptions, Invariant Conflicts, Stress Questions) with **zero code** and **zero praise**.

3. **Sparring Teammate (`sparring-teammate`)**
   - Dialectic design thought partner for evaluating 2–3 options (*Simple vs. Scalable vs. Unconventional*).
   - Delivers a decisive peer recommendation and logs Architecture Decision Records (ADRs) to project memory.

---

## Dependency Model & Graceful Degradation

- **Zero npm Dependencies:** Requires no `npm install` or third-party packages; runs entirely on built-in Node.js v22+ native modules (`node:sqlite`, `node:fs`, `node:os`).
- **Companion MCP Server (`agent-memory-mcp`):** Recommended for cross-session mastery memory (`global.db`) and project ADR persistence.
- **Fail-Open Graceful Degradation:** If `agent-memory-mcp` is not installed or enabled, hooks and skills fail open immediately:
  - `hydrate-pedagogy.js` returns `{}` in <1ms without errors if `global.db` is absent.
  - `friction-guard.js` runs 100% locally with zero external dependencies.
  - All personas operate cleanly in stateless in-session mode.

---

## Installation & Deployment

From the repository root:

```bash
npm run sync-plugin
```

This deploys `plugin/` into `~/.gemini/config/plugins/cognitive-personas/`. Restart Antigravity or open a new session to activate.

---

## Configuration & Runtime Invariants

- **Fail-Open Architecture:** Lifecycle hooks execute in `<150ms` using native `node:sqlite` and fail open to unblocked execution on any runtime error.
- **Rule Budget:** `rules/AGENTS.md` is strictly under 400 tokens, preserving your active context window.
- **Escape Hatch:** Say `"just ship"` or `"give me the code"` at any time to bypass Socratic prompts immediately.

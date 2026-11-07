# Cognitive Personas Plugin for Google Antigravity

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()

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

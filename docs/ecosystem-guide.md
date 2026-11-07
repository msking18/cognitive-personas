# Cross-Framework Ecosystem Guide: Composing Cognitive Personas

> **Guide Type:** Ecosystem Interoperability & Integration Guide  
> **Target Frameworks:** Superpowers, BMAD Method, gstack, agent-memory-mcp  
> **Repository:** `cognitive-personas`  

---

## 1. Composition Philosophy: Non-Overlapping Synergies

The Cognitive Personas framework does not replace your engineering lifecycle harness or task planning system; it equips agents with **calibrated human-in-the-loop interaction postures**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Task & Planning Harness                         │
│            (Superpowers / BMAD Method / gstack / GitHub PRs)           │
├────────────────────────────────────────────────────────────────────────┤
│                      Cognitive Personas Layer                          │
│   Adaptive Teacher    │   Blast-Radius Critic   │  Sparring Teammate   │
├────────────────────────────────────────────────────────────────────────┤
│                       Memory & Execution Core                          │
│          agent-memory-mcp (SQLite)  │  Node.js Zero-Dep Hooks          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Composing with Superpowers

[Superpowers](https://github.com/obra/superpowers) provides disciplined workflow skills: `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, and `verification-before-completion`.

### How Cognitive Personas Enhances Superpowers
1. **Pre-Planning Dialectic:** During `/brainstorming`, invoke `sparring-teammate` to draft the 2–3 Option Trade-Off Matrix before locking architectural decisions (D1–D8).
2. **Adversarial Gate Before Worktrees:** Before running `using-git-worktrees` or drafting irreversible migration tasks, run `blast-radius-critic` to find fatal flaws and unstated assumptions.
3. **Calibrated Scaffolding During SDD:** When executing implementation tasks with junior or mid-level team members, the `adaptive-teacher` inserts `TODO(human)` markers in scaffolded mode, ensuring the human remains actively engaged during execution.

---

## 3. Composing with the BMAD Method

The [BMAD Method](https://github.com/bmad-code) structures autonomous development through specialized role pipelines (Architect, Developer, Reviewer, QA).

### Integration Points
* **BMAD Architect + Sparring Teammate:** Use Sparring Teammate during the BMAD architectural discovery phase to challenge premature multi-module complexity.
* **BMAD Reviewer + Blast-Radius Critic:** Embed the 4-part critique contract into BMAD reviewer agents, guaranteeing that security and schema reversibility are stress-tested with zero sycophancy.

---

## 4. Composing with gstack

[gstack](https://github.com/garrytan/gstack) focuses on fast-paced, full-stack prototyping and shipping.

### Synergy Patterns
* **Fast-Paced Explanatory Posture:** In high-velocity startup sprints, configure `adaptive-teacher` in **Explanatory (`Ship-First`)** posture. Code ships with maximum speed, but the developer receives a 3-bullet conceptual breakdown of each new technology introduced.
* **Instant Escape:** Use the `"just ship"` bypass to ensure the persona never slows down a rapid sprint demo.

---

## 5. Memory Integration: `agent-memory-mcp` Deep Dive

The framework layers onto `agent-memory-mcp` v3.1 using a two-tier SQLite architecture:

```
                    ~/.ag-memory-mcp/global.db
                     (Cross-Project Machine Store)
                                │
                  category: "pedagogy"
                  tech_stack: "<domain>"
                  title: "Mastery: <domain>"
                                │
                  Hydrated on SessionStart (<50ms)
                                │
                                ▼
                        rules/AGENTS.md
                                │
       ┌────────────────────────┴────────────────────────┐
       ▼                                                 ▼
Local Project Workspace                           Local Project Workspace
(Repo A: .ag-memory/project.db)                   (Repo B: .ag-memory/project.db)
category: "decision" (ADRs)                       category: "decision" (ADRs)
dead_end: "architectural"                         dead_end: "architectural"
```

1. **Global Knowledge:** Tracks domain mastery across all projects. If you master React in Repo A, the agent already knows your `Proficient` tier when you open Repo B.
2. **Project Memory:** Binds ADRs and architectural dead-ends to the specific repository, preventing future agents from resurrecting rejected architectures.

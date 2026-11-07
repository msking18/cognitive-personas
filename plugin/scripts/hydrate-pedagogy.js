#!/usr/bin/env node
/**
 * @fileoverview SessionStart Hook: Hydrate Pedagogy Context
 * @description
 * High-performance, zero-dependency Node.js hook executed automatically at
 * the start of every Antigravity session.
 *
 * Responsibilities:
 * 1. Reads active developer domain mastery profiles from ~/.ag-memory-mcp/global.db
 *    in <50ms using Node's built-in node:sqlite module.
 * 2. Emits a structured [PEDAGOGY-HYDRATED] system prompt message to prime
 *    the agent's cognitive posture before user interaction begins.
 * 3. Enforces a strict fail-open architecture: any runtime error, locked database,
 *    table absence, or missing file gracefully falls back to an empty object {}.
 *
 * Execution Profile:
 * - Runtime: Node.js v22+ (native node:sqlite)
 * - Flags: --no-warnings
 * - Target Latency: < 50ms (< 150ms ceiling)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

/**
 * Main execution routine for the SessionStart pedagogy hydration hook.
 * Queries global.db and outputs a JSON payload with `systemMessage`.
 *
 * @returns {void}
 */
function run() {
  try {
    // Safely inspect stdin for workspacePaths if invoked by Antigravity SessionStart hook
    let workspaceRoot = process.cwd();
    let hasExplicitWorkspace = false;
    if (!process.stdin.isTTY) {
      try {
        const rawInput = fs.readFileSync(0, 'utf8');
        if (rawInput && rawInput.trim()) {
          const payload = JSON.parse(rawInput);
          if (Array.isArray(payload.workspacePaths) && payload.workspacePaths.length > 0 && payload.workspacePaths[0]) {
            workspaceRoot = payload.workspacePaths[0];
            hasExplicitWorkspace = true;
          }
        }
      } catch {
        // Fail-open on empty or malformed stdin
      }
    }

    // Determine path to global SQLite database (allows env override for test suites)
    const defaultDbPath = path.join(os.homedir(), '.ag-memory-mcp', 'global.db');
    const dbPath = process.env.AG_GLOBAL_DB_PATH || defaultDbPath;

    let lines = [];

    // Fast existence check before attempting to open the SQLite file
    const isExplicitDb = Boolean(process.env.AG_GLOBAL_DB_PATH);
    const fallbackPath =
      process.env.AG_PEDAGOGY_PROFILE_PATH ||
      (!isExplicitDb || hasExplicitWorkspace ? path.join(workspaceRoot, '.agents', 'pedagogy-profile.md') : null);

    if (!fs.existsSync(dbPath)) {
      // Fallback: check workspace-local .agents/pedagogy-profile.md if SQLite is absent
      if (fallbackPath && fs.existsSync(fallbackPath)) {
        try {
          const content = fs.readFileSync(fallbackPath, 'utf8').trim();
          if (content) {
            lines = [
              '[PEDAGOGY-HYDRATED] Developer Domain Mastery Profiles (.agents/pedagogy-profile.md):',
              content.slice(0, 450),
              'Calibrate explanations and scaffolding to these recorded mastery profiles.',
            ];
          }
        } catch {
          // Ignore read error on fallback
        }
      }

      if (lines.length === 0) {
        process.stdout.write(JSON.stringify({}));
        return;
      }
    } else {
      let db;
      let rows = [];
      try {
        // Open SQLite in read-only mode with a strict 50ms lock contention timeout
        db = new DatabaseSync(dbPath, { readOnly: true, timeout: 50 });

        // Check whether global_memories (agent-memory v3.1) or global_knowledge (RFC v3.2) exists
        let tableName = 'global_knowledge';
        try {
          const hasMemories = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='global_memories'").get();
          if (hasMemories) {
            tableName = 'global_memories';
          }
        } catch {}

        // Enforce strict token budget: limit to top 5 profiles (< 150 tokens target)
        const stmt = db.prepare(`
          SELECT tech_stack, title, summary
          FROM ${tableName}
          WHERE category = 'pedagogy'
          ORDER BY updated_at DESC
          LIMIT 5;
        `);
        rows = stmt.all();
      } catch {
        // Fail open on table missing, lock contention (SQLITE_BUSY), or corruption
        rows = [];
      } finally {
        // Ensure database file handle is cleanly closed
        if (db) {
          try {
            db.close();
          } catch {
            // Ignore close error on exit
          }
        }
      }

      // If no pedagogy records exist, check for workspace-local profile fallback
      if (!rows || rows.length === 0) {
        if (fallbackPath && fs.existsSync(fallbackPath)) {
          try {
            const content = fs.readFileSync(fallbackPath, 'utf8').trim();
            if (content) {
              lines = [
                '[PEDAGOGY-HYDRATED] Developer Domain Mastery Profiles (.agents/pedagogy-profile.md):',
                content.slice(0, 450),
                'Calibrate explanations and scaffolding to these recorded mastery profiles.',
              ];
            }
          } catch {
            // Ignore fallback read error
          }
        }

        if (lines.length === 0) {
          process.stdout.write(JSON.stringify({}));
          return;
        }
      } else {
        // Format human-readable hydration block enforcing < 150 token budget
        lines = ['[PEDAGOGY-HYDRATED] Developer Domain Mastery Profiles:'];
        for (const row of rows) {
          const domain = row.tech_stack || row.title.replace(/^Mastery:\s*/i, '');
          // Compress multi-line summary if necessary
          const cleanSummary = (row.summary || '').replace(/\s+/g, ' ').slice(0, 90);
          lines.push(`- ${domain}: ${cleanSummary}`);
        }
        lines.push('Calibrate explanations and scaffolding to these recorded mastery profiles.');
      }
    }

    const formattedMessage = lines.join('\n') + '\n';

    // Dual-wire protocol: Antigravity native injectSteps + legacy systemMessage
    const result = {
      systemMessage: formattedMessage,
      injectSteps: [
        {
          systemMessage: {
            systemMessage: formattedMessage,
          },
        },
      ],
    };

    process.stdout.write(JSON.stringify(result));
  } catch {
    // Fail-open guarantee: never block SessionStart under unexpected runtime failures
    process.stdout.write(JSON.stringify({}));
  }
}

// Execute hook
run();

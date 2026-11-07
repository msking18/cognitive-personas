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
    // Determine path to global SQLite database (allows env override for test suites)
    const defaultDbPath = path.join(os.homedir(), '.ag-memory-mcp', 'global.db');
    const dbPath = process.env.AG_GLOBAL_DB_PATH || defaultDbPath;

    // Fast existence check before attempting to open the SQLite file
    if (!fs.existsSync(dbPath)) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    let db;
    let rows = [];
    try {
      // Open SQLite in read-only mode with a strict 50ms lock contention timeout
      db = new DatabaseSync(dbPath, { readOnly: true, timeout: 50 });
      const stmt = db.prepare(`
        SELECT tech_stack, title, summary
        FROM global_knowledge
        WHERE category = 'pedagogy'
        ORDER BY updated_at DESC
        LIMIT 10;
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

    // If no pedagogy records exist, return empty object to bypass context injection
    if (!rows || rows.length === 0) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    // Format human-readable hydration block for the agent's context window
    const lines = ['[PEDAGOGY-HYDRATED] Developer Domain Mastery Profiles:'];
    for (const row of rows) {
      const domain = row.tech_stack || row.title.replace(/^Mastery:\s*/i, '');
      lines.push(`- ${domain}: ${row.summary}`);
    }
    lines.push('Calibrate explanations and scaffolding to these recorded mastery profiles.');

    const result = {
      systemMessage: lines.join('\n') + '\n',
    };

    process.stdout.write(JSON.stringify(result));
  } catch {
    // Fail-open guarantee: never block SessionStart under unexpected runtime failures
    process.stdout.write(JSON.stringify({}));
  }
}

// Execute hook
run();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

/**
 * SessionStart Hook: Hydrate Pedagogy Context
 * Reads active pedagogy mastery profiles from ~/.ag-memory-mcp/global.db
 * in <50ms and emits a concise [PEDAGOGY-HYDRATED] system message.
 * Fails open to {} on any error, timeout, or missing database.
 */
function run() {
  try {
    const defaultDbPath = path.join(os.homedir(), '.ag-memory-mcp', 'global.db');
    const dbPath = process.env.AG_GLOBAL_DB_PATH || defaultDbPath;

    if (!fs.existsSync(dbPath)) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

    let db;
    let rows = [];
    try {
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
      // Fail open on table missing, lock timeout, or corruption
      rows = [];
    } finally {
      if (db) {
        try {
          db.close();
        } catch {
          // ignore close error
        }
      }
    }

    if (!rows || rows.length === 0) {
      process.stdout.write(JSON.stringify({}));
      return;
    }

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
    // Fail-open guarantee: never block SessionStart
    process.stdout.write(JSON.stringify({}));
  }
}

run();

/**
 * @fileoverview Test Harness Utilities and Fixtures
 * @description
 * Shared helpers for initializing temporary SQLite databases, spawning hook
 * child processes, and measuring execution latency.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';

/**
 * Creates an isolated temporary SQLite database for test execution.
 *
 * @param {string} [populateSql] - Optional DDL/DML statements to execute upon creation.
 * @returns {string} Absolute path to the created temporary SQLite file.
 */
export function createTempDb(populateSql = '') {
  const tempDir = os.tmpdir();
  const dbName = `test-ag-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const dbPath = path.join(tempDir, dbName);

  const db = new DatabaseSync(dbPath);
  if (populateSql) {
    db.exec(populateSql);
  }
  db.close();

  return dbPath;
}

/**
 * Safely removes a temporary SQLite database file if it exists.
 *
 * @param {string} dbPath - Absolute path to the temporary database.
 * @returns {void}
 */
export function cleanupTempDb(dbPath) {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch {
    // Ignore cleanup errors during teardown
  }
}

/**
 * Spawns a hook script in a child process with piped stdin and captured stdout/stderr.
 *
 * @param {string} scriptPath - Absolute path to the Node.js script.
 * @param {string|object} [stdinData=''] - Payload to pipe into stdin.
 * @param {Record<string, string>} [env={}] - Additional environment variables.
 * @returns {{ stdout: string, stderr: string, exitCode: number, durationMs: number }}
 */
export function runHookProcess(scriptPath, stdinData = '', env = {}) {
  const input = typeof stdinData === 'object' ? JSON.stringify(stdinData) : stdinData;
  const start = performance.now();

  const result = spawnSync(
    process.execPath,
    ['--no-warnings', scriptPath],
    {
      input,
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 5000,
      windowsHide: true,
    }
  );

  const durationMs = Math.round(performance.now() - start);

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status ?? 1,
    durationMs,
  };
}

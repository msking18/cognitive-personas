import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';

/**
 * Creates a temporary SQLite database for testing.
 * @param {string} [populateSql] Optional SQL statements to initialize data.
 * @returns {string} Absolute path to temporary database file.
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
 * Deletes a temporary SQLite database file if it exists.
 * @param {string} dbPath
 */
export function cleanupTempDb(dbPath) {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch {
    // Ignore cleanup errors in tests
  }
}

/**
 * Executes a hook script via child process, streaming stdinData and capturing execution metrics.
 * @param {string} scriptPath
 * @param {string|object} [stdinData]
 * @param {Record<string, string>} [env]
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

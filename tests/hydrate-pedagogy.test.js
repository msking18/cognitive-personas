/**
 * @fileoverview Test Suite: SessionStart Pedagogy Hydration Hook
 * @description
 * Tests hydrate-pedagogy.js against populated, missing, empty, and corrupt
 * SQLite database fixtures. Verifies fail-open resilience and performance ceilings.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTempDb, cleanupTempDb, runHookProcess } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../plugin/scripts/hydrate-pedagogy.js');

test('hydrate-pedagogy: populated global.db emits formatted [PEDAGOGY-HYDRATED] system message', () => {
  const schemaSql = `
    CREATE TABLE global_knowledge (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tech_stack TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO global_knowledge (id, category, title, summary, tech_stack, updated_at) VALUES
      ('g-1', 'pedagogy', 'Mastery: TypeScript', 'tier: Proficient | posture: explanatory | signals: strict mode, generics', 'typescript', '2026-11-01 10:00:00'),
      ('g-2', 'pedagogy', 'Mastery: Rust', 'tier: Novice | posture: scaffolded | signals: learning ownership and lifetimes', 'rust', '2026-11-02 11:00:00'),
      ('g-3', 'pedagogy', 'Mastery: Docker', 'tier: Developing | posture: scaffolded | signals: multi-stage builds', 'docker', '2026-11-03 12:00:00');
  `;
  const dbPath = createTempDb(schemaSql);

  try {
    const { stdout, stderr, exitCode, durationMs } = runHookProcess(scriptPath, '', {
      AG_GLOBAL_DB_PATH: dbPath,
    });

    assert.equal(exitCode, 0, 'Exit code should be 0');
    assert.equal(stderr, '', 'Stderr should be empty');

    const output = JSON.parse(stdout);
    assert.ok(output.systemMessage, 'Output should have systemMessage property');
    assert.ok(Array.isArray(output.injectSteps), 'Output should have injectSteps array for Antigravity host');
    assert.equal(output.injectSteps.length, 1, 'injectSteps should contain 1 step');
    assert.ok(output.injectSteps[0].systemMessage.systemMessage, 'injectSteps must contain systemMessage');

    assert.ok(output.systemMessage.includes('[PEDAGOGY-HYDRATED]'), 'Message should start with [PEDAGOGY-HYDRATED]');
    assert.ok(output.systemMessage.includes('typescript'), 'Message should include typescript profile');
    assert.ok(output.systemMessage.includes('rust'), 'Message should include rust profile');
    assert.ok(output.systemMessage.includes('docker'), 'Message should include docker profile');

    // Strict token budget assertion: output must be < 150 tokens (~600 chars)
    const estimatedTokens = Math.ceil(output.systemMessage.length / 4);
    assert.ok(
      estimatedTokens < 150,
      `Hydration output must be strictly < 150 tokens. Was ${estimatedTokens} (~${output.systemMessage.length} chars)`
    );

    // Allow for Windows child process spawn overhead under parallel test suite
    assert.ok(durationMs < 350, `Execution duration including process spawn should be < 350ms, was ${durationMs}ms`);
  } finally {
    cleanupTempDb(dbPath);
  }
});

test('hydrate-pedagogy: missing database fails open to empty object {}', () => {
  const fakeDbPath = path.join(path.dirname(scriptPath), 'non-existent-db-file.db');

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, '', {
    AG_GLOBAL_DB_PATH: fakeDbPath,
  });

  assert.equal(exitCode, 0, 'Exit code must be 0');
  assert.equal(stderr, '', 'Stderr must be empty on graceful fail-open');
  const output = JSON.parse(stdout);
  assert.deepEqual(output, {}, 'Output must be empty object {}');
});

test('hydrate-pedagogy: database with zero pedagogy records emits empty object {}', () => {
  const schemaSql = `
    CREATE TABLE global_knowledge (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tech_stack TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO global_knowledge (id, category, title, summary, tech_stack) VALUES
      ('g-1', 'architecture', 'Some Pattern', 'Architectural summary', 'node');
  `;
  const dbPath = createTempDb(schemaSql);

  try {
    const { stdout, stderr, exitCode } = runHookProcess(scriptPath, '', {
      AG_GLOBAL_DB_PATH: dbPath,
    });

    assert.equal(exitCode, 0);
    assert.equal(stderr, '');
    const output = JSON.parse(stdout);
    assert.deepEqual(output, {});
  } finally {
    cleanupTempDb(dbPath);
  }
});

test('hydrate-pedagogy: corrupt database file fails open to empty object {} without crashing', () => {
  const corruptDbPath = createTempDb();
  fs.writeFileSync(corruptDbPath, 'CORRUPT_NOT_SQLITE_BINARY_HEADER');

  try {
    const { stdout, stderr, exitCode } = runHookProcess(scriptPath, '', {
      AG_GLOBAL_DB_PATH: corruptDbPath,
    });

    assert.equal(exitCode, 0, 'Must exit with code 0 on corrupt DB');
    assert.equal(stderr, '', 'Must not throw unhandled exception to stderr');
    const output = JSON.parse(stdout);
    assert.deepEqual(output, {});
  } finally {
    cleanupTempDb(corruptDbPath);
  }
});

test('hydrate-pedagogy: falls back to .agents/pedagogy-profile.md when SQLite DB is absent', () => {
  const fakeDbPath = path.join(path.dirname(scriptPath), 'non-existent-db.db');
  const tempProfilePath = path.join(path.dirname(scriptPath), 'temp-test-profile.md');
  fs.writeFileSync(
    tempProfilePath,
    '- rust: tier: Novice | posture: scaffolded\n- typescript: tier: Proficient'
  );

  try {
    const { stdout, stderr, exitCode } = runHookProcess(scriptPath, '', {
      AG_GLOBAL_DB_PATH: fakeDbPath,
      AG_PEDAGOGY_PROFILE_PATH: tempProfilePath,
    });

    assert.equal(exitCode, 0);
    assert.equal(stderr, '');
    const output = JSON.parse(stdout);
    assert.ok(output.systemMessage);
    assert.ok(output.systemMessage.includes('[PEDAGOGY-HYDRATED]'));
    assert.ok(output.systemMessage.includes('rust'));
    assert.ok(output.systemMessage.includes('typescript'));
    assert.ok(Array.isArray(output.injectSteps));
  } finally {
    if (fs.existsSync(tempProfilePath)) {
      fs.unlinkSync(tempProfilePath);
    }
  }
});

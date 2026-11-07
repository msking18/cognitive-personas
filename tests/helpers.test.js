import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTempDb, cleanupTempDb } from './helpers.js';

test('createTempDb and cleanupTempDb correctly manage temporary SQLite databases', () => {
  const dbPath = createTempDb('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);');
  assert.ok(fs.existsSync(dbPath), 'Temp DB file should exist');

  cleanupTempDb(dbPath);
  assert.ok(!fs.existsSync(dbPath), 'Temp DB file should be removed');
});

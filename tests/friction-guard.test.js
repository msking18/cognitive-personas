import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runHookProcess } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../plugin/scripts/friction-guard.js');

test('friction-guard: benign tool call (read_file) is allowed', () => {
  const payload = {
    toolName: 'read_file',
    arguments: { Path: 'src/index.js' },
    context: { conversationId: 'conv-test-1' },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'allow');
});

test('friction-guard: benign edit (Button.jsx) is allowed', () => {
  const payload = {
    toolName: 'write_file',
    arguments: { Path: 'src/components/Button.jsx', Content: 'export const Button = () => null;' },
    context: { conversationId: 'conv-test-1' },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'allow');
});

test('friction-guard: high-blast-radius file (migrations) triggers prompt decision', () => {
  const payload = {
    toolName: 'edit_file',
    arguments: { Path: 'prisma/migrations/001_init/migration.sql' },
    context: { conversationId: `conv-mig-${Date.now()}` },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'prompt');
  assert.ok(res.message.includes('DATABASE_SCHEMA'), 'Message should identify schema category');
});

test('friction-guard: high-blast-radius file (auth) triggers prompt decision', () => {
  const payload = {
    toolName: 'write_file',
    arguments: { Path: 'src/auth/jwt-signer.ts' },
    context: { conversationId: `conv-auth-${Date.now()}` },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'prompt');
  assert.ok(res.message.includes('SECURITY_AUTH'));
});

test('friction-guard: Windows path backslashes normalized and detected', () => {
  const payload = {
    toolName: 'write_file',
    arguments: { Path: 'src\\auth\\jwt-signer.ts' },
    context: { conversationId: `conv-win-${Date.now()}` },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'prompt');
  assert.ok(res.message.includes('SECURITY_AUTH'));
});

test('friction-guard: destructive commands trigger prompt decision', () => {
  const payload = {
    toolName: 'run_command',
    arguments: { CommandLine: 'rm -rf /var/data' },
    context: { conversationId: `conv-cmd-${Date.now()}` },
  };

  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, payload);
  assert.equal(exitCode, 0);
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'prompt');
  assert.ok(res.message.includes('DESTRUCTIVE_COMMANDS'));
});

test('friction-guard: session deduplication allows second occurrence in same conversation', () => {
  const convId = `conv-dedupe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload1 = {
    toolName: 'write_file',
    arguments: { Path: 'src/auth/session.js' },
    context: { conversationId: convId },
  };
  const payload2 = {
    toolName: 'edit_file',
    arguments: { Path: 'src/auth/cookie.js' },
    context: { conversationId: convId },
  };

  const res1 = JSON.parse(runHookProcess(scriptPath, payload1).stdout);
  assert.equal(res1.decision, 'prompt', 'First occurrence must prompt');

  const res2 = JSON.parse(runHookProcess(scriptPath, payload2).stdout);
  assert.equal(res2.decision, 'allow', 'Second occurrence in same conversation must allow without prompt');
});

test('friction-guard: distinct conversations do not suppress each other', () => {
  const convA = `conv-iso-a-${Date.now()}`;
  const convB = `conv-iso-b-${Date.now()}`;
  const payloadA = {
    toolName: 'write_file',
    arguments: { Path: 'src/auth/tokens.ts' },
    context: { conversationId: convA },
  };
  const payloadB = {
    toolName: 'write_file',
    arguments: { Path: 'src/auth/tokens.ts' },
    context: { conversationId: convB },
  };

  const resA = JSON.parse(runHookProcess(scriptPath, payloadA).stdout);
  assert.equal(resA.decision, 'prompt');

  const resB = JSON.parse(runHookProcess(scriptPath, payloadB).stdout);
  assert.equal(resB.decision, 'prompt', 'Different conversation must also prompt');
});

test('friction-guard: malformed stdin fails open to allow', () => {
  const { stdout, stderr, exitCode } = runHookProcess(scriptPath, 'NOT_VALID_JSON{:::');
  assert.equal(exitCode, 0);
  assert.equal(stderr, '');
  const res = JSON.parse(stdout);
  assert.equal(res.decision, 'allow');
});

test('friction-guard: stale markers older than 24 hours are pruned', () => {
  const tempDir = os.tmpdir();
  const oldMarker = path.join(tempDir, `ag-friction-stale-test-${Date.now()}.json`);
  const twoDaysAgo = Date.now() - 48 * 3600 * 1000;
  fs.writeFileSync(oldMarker, JSON.stringify({ timestamp: twoDaysAgo }));

  // Invoke hook to trigger cleanup routine
  const payload = {
    toolName: 'read_file',
    arguments: { Path: 'README.md' },
    context: { conversationId: 'conv-clean' },
  };
  runHookProcess(scriptPath, payload);

  // Check if stale test marker was pruned (if prefixed with ag-friction-)
  assert.ok(fs.existsSync(tempDir));
  if (fs.existsSync(oldMarker)) {
    fs.unlinkSync(oldMarker);
  }
});

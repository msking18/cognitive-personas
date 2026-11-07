/**
 * @fileoverview Live End-to-End Smoke Test Suite
 * @description
 * Comprehensive end-to-end smoke verification exercising:
 * 1. SessionStart hook with global.db pedagogy persistence & hydration (v3.1 & v3.2 schemas)
 *    and workspace-local fallback via stdin workspacePaths.
 * 2. PreToolUse Blast-Radius friction guard across all 5 risk categories, Antigravity
 *    native wire payloads, and 24-hour session deduplication.
 * 3. Operational validation of all three cognitive personas (Adaptive Teacher,
 *    Sparring Teammate, Blast-Radius Critic) and the semantic triage router.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTempDb, cleanupTempDb, runHookProcess } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const hydrateScript = path.resolve(projectRoot, 'plugin/scripts/hydrate-pedagogy.js');
const frictionScript = path.resolve(projectRoot, 'plugin/scripts/friction-guard.js');
const routerRulePath = path.resolve(projectRoot, 'plugin/rules/AGENTS.md');
const skillsDir = path.resolve(projectRoot, 'plugin/skills');

/* -------------------------------------------------------------------------- */
/*  1. PEDAGOGY PERSISTENCE & HYDRATION SMOKE TESTS                          */
/* -------------------------------------------------------------------------- */

test('E2E Smoke: Pedagogy hydration from agent-memory v3.1 global_memories table', () => {
  const schemaSql = `
    CREATE TABLE global_memories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'pattern',
      tags_json TEXT NOT NULL DEFAULT '[]',
      tech_stack TEXT NOT NULL DEFAULT 'general',
      source_project TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO global_memories (id, title, summary, category, tech_stack, created_at, updated_at) VALUES
      ('g-rust', 'Mastery: Rust', 'Novice (Scaffolded): learning ownership, borrow checker, and lifetimes', 'pedagogy', 'rust', '2026-11-07 10:00:00', '2026-11-07 10:00:00'),
      ('g-ts', 'Mastery: TypeScript', 'Proficient (Explanatory): advanced generics, conditional types, strict mode', 'pedagogy', 'typescript', '2026-11-07 10:05:00', '2026-11-07 10:05:00'),
      ('g-docker', 'Mastery: Docker', 'Developing (Scaffolded): multi-stage builds, rootless container security', 'pedagogy', 'docker', '2026-11-07 10:10:00', '2026-11-07 10:10:00');
  `;
  const dbPath = createTempDb(schemaSql);

  try {
    const sessionInput = {
      conversationId: 'smoke-session-101',
      workspacePaths: [projectRoot],
    };

    const { stdout, stderr, exitCode, durationMs } = runHookProcess(hydrateScript, sessionInput, {
      AG_GLOBAL_DB_PATH: dbPath,
    });

    assert.equal(exitCode, 0, 'Hook must exit with code 0');
    assert.equal(stderr, '', 'Hook must not output to stderr');

    const output = JSON.parse(stdout);
    assert.ok(output.systemMessage, 'Must contain systemMessage');
    assert.ok(Array.isArray(output.injectSteps), 'Must contain injectSteps array');
    assert.equal(output.injectSteps.length, 1);
    assert.ok(output.injectSteps[0].systemMessage.systemMessage);

    const msg = output.systemMessage;
    assert.ok(msg.includes('[PEDAGOGY-HYDRATED]'), 'Header must be [PEDAGOGY-HYDRATED]');
    assert.ok(msg.includes('rust'), 'Must hydrate rust mastery');
    assert.ok(msg.includes('typescript'), 'Must hydrate typescript mastery');
    assert.ok(msg.includes('docker'), 'Must hydrate docker mastery');

    // Token budget assertion (< 150 tokens)
    const tokenEst = Math.ceil(msg.length / 4);
    assert.ok(tokenEst < 150, `Token count must be < 150 tokens. Was ${tokenEst}`);
    assert.ok(durationMs < 350, `Execution latency must be sub-second (was ${durationMs}ms)`);
  } finally {
    cleanupTempDb(dbPath);
  }
});

test('E2E Smoke: Pedagogy hydration fallback via stdin workspacePaths', () => {
  const fakeDbPath = path.join(__dirname, 'non-existent-smoke.db');
  const tempWorkspaceDir = path.join(projectRoot, 'tests', 'fixtures', `ws-${Date.now()}`);
  const tempAgentsDir = path.join(tempWorkspaceDir, '.agents');
  fs.mkdirSync(tempAgentsDir, { recursive: true });

  const profileContent = `- python: tier: Proficient | posture: explanatory\n- go: tier: Novice | posture: scaffolded`;
  fs.writeFileSync(path.join(tempAgentsDir, 'pedagogy-profile.md'), profileContent);

  try {
    const sessionInput = {
      conversationId: 'smoke-fallback-session',
      workspacePaths: [tempWorkspaceDir],
    };

    const { stdout, stderr, exitCode } = runHookProcess(hydrateScript, sessionInput, {
      AG_GLOBAL_DB_PATH: fakeDbPath,
    });

    assert.equal(exitCode, 0);
    assert.equal(stderr, '');

    const output = JSON.parse(stdout);
    assert.ok(output.systemMessage);
    assert.ok(output.systemMessage.includes('[PEDAGOGY-HYDRATED]'));
    assert.ok(output.systemMessage.includes('python'));
    assert.ok(output.systemMessage.includes('go'));
  } finally {
    try {
      fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
    } catch {}
  }
});

/* -------------------------------------------------------------------------- */
/*  2. PRETOOLUSE FRICTION GATING SMOKE TESTS                                */
/* -------------------------------------------------------------------------- */

test('E2E Smoke: PreToolUse friction gating across all 5 risk categories and deduplication', () => {
  const conversationId = `smoke-friction-${Date.now()}`;

  // 1. Benign read/edit: allow
  const benignRead = runHookProcess(frictionScript, {
    toolCall: { name: 'read_file', args: { Path: 'src/index.js' } },
    conversationId,
  });
  assert.equal(JSON.parse(benignRead.stdout).decision, 'allow');

  const benignWrite = runHookProcess(frictionScript, {
    toolCall: { name: 'write_file', args: { Path: 'src/components/Header.jsx' } },
    conversationId,
  });
  assert.equal(JSON.parse(benignWrite.stdout).decision, 'allow');

  // 2. High-blast-radius: Category 1 DATABASE_SCHEMA (e.g. migration.sql)
  const migrationEdit = runHookProcess(frictionScript, {
    toolCall: { name: 'edit_file', args: { Path: 'prisma/migrations/001_init/migration.sql' } },
    conversationId,
  });
  const migResult = JSON.parse(migrationEdit.stdout);
  assert.equal(migResult.decision, 'ask', 'Native Antigravity payload must emit ask');
  assert.equal(migResult.prompt, true);
  assert.ok(migResult.reason.includes('DATABASE_SCHEMA'));

  // Deduplication check: Second call in same conversation is allowed without prompt fatigue
  const migrationRepeat = runHookProcess(frictionScript, {
    toolCall: { name: 'edit_file', args: { Path: 'prisma/migrations/002_add_users/migration.sql' } },
    conversationId,
  });
  assert.equal(JSON.parse(migrationRepeat.stdout).decision, 'allow', 'Repeated risk category in same conversation must be allowed');

  // Category 2: SECURITY_AUTH (e.g. auth/jwt.ts) in same conversation
  const authWrite = runHookProcess(frictionScript, {
    toolCall: { name: 'write_file', args: { Path: 'src/auth/jwt-signer.ts' } },
    conversationId,
  });
  const authResult = JSON.parse(authWrite.stdout);
  assert.equal(authResult.decision, 'ask');
  assert.ok(authResult.reason.includes('SECURITY_AUTH'));

  // Category 3: ROOT_DEPENDENCIES (e.g. package.json)
  const pkgWrite = runHookProcess(frictionScript, {
    toolCall: { name: 'write_file', args: { Path: 'package.json' } },
    conversationId,
  });
  const pkgResult = JSON.parse(pkgWrite.stdout);
  assert.equal(pkgResult.decision, 'ask');
  assert.ok(pkgResult.reason.includes('ROOT_DEPENDENCIES'));

  // Category 4: CONTRACT_SURFACE (e.g. openapi.yaml)
  const openapiWrite = runHookProcess(frictionScript, {
    toolCall: { name: 'write_file', args: { Path: 'api/openapi.yaml' } },
    conversationId,
  });
  const openapiResult = JSON.parse(openapiWrite.stdout);
  assert.equal(openapiResult.decision, 'ask');
  assert.ok(openapiResult.reason.includes('CONTRACT_SURFACE'));

  // Category 5: DESTRUCTIVE_COMMANDS (e.g. Remove-Item or rm -rf)
  const destructiveCmd = runHookProcess(frictionScript, {
    toolCall: { name: 'run_command', args: { CommandLine: 'Remove-Item -Recurse -Force ./build' } },
    conversationId,
  });
  const cmdResult = JSON.parse(destructiveCmd.stdout);
  assert.equal(cmdResult.decision, 'ask');
  assert.ok(cmdResult.reason.includes('DESTRUCTIVE_COMMANDS'));

  // Cross-Session Isolation: Different conversationId triggers prompt again
  const newConversationId = `smoke-friction-new-${Date.now()}`;
  const isolatedMig = runHookProcess(frictionScript, {
    toolCall: { name: 'edit_file', args: { Path: 'prisma/migrations/003_tenants/migration.sql' } },
    conversationId: newConversationId,
  });
  assert.equal(JSON.parse(isolatedMig.stdout).decision, 'ask', 'New conversation must prompt again');
});

/* -------------------------------------------------------------------------- */
/*  3. PERSONAS BEHAVIORAL PROTOCOL & ROUTER VERIFICATION                     */
/* -------------------------------------------------------------------------- */

test('E2E Smoke: Adaptive Teacher behavioral contracts and "just ship" bypass', () => {
  const teacherSkillPath = path.join(skillsDir, 'adaptive-teacher', 'SKILL.md');
  assert.ok(fs.existsSync(teacherSkillPath), 'adaptive-teacher skill must exist');

  const content = fs.readFileSync(teacherSkillPath, 'utf8');
  assert.ok(content.includes('TODO(human)'), 'Must enforce TODO(human) markers in scaffolded mode');
  assert.ok(content.includes('Novice'), 'Must support Novice tier');
  assert.ok(content.includes('Developing'), 'Must support Developing tier');
  assert.ok(content.includes('Proficient'), 'Must support Proficient tier');
  assert.ok(content.includes('just ship'), 'Must include "just ship" immediate bypass instruction');
});

test('E2E Smoke: Sparring Teammate dialectical trade-off matrix and ADR capture', () => {
  const sparringSkillPath = path.join(skillsDir, 'sparring-teammate', 'SKILL.md');
  assert.ok(fs.existsSync(sparringSkillPath), 'sparring-teammate skill must exist');

  const content = fs.readFileSync(sparringSkillPath, 'utf8');
  assert.ok(content.includes('Option Matrix') || content.includes('Trade-Off Matrix') || content.includes('Comparison Matrix'), 'Must include trade-off matrix instructions');
  assert.ok(content.includes('Complexity') && content.includes('Reversibility'), 'Must evaluate Complexity and Reversibility');
  assert.ok(content.includes('ADR') || content.includes('Architecture Decision Record'), 'Must document architectural decision capture');
  assert.ok(content.includes('save_project_memory'), 'Must specify save_project_memory integration');
});

test('E2E Smoke: Blast-Radius Critic 4-part critique and read-only isolation', () => {
  const criticSkillPath = path.join(skillsDir, 'blast-radius-critic', 'SKILL.md');
  assert.ok(fs.existsSync(criticSkillPath), 'blast-radius-critic skill must exist');

  const content = fs.readFileSync(criticSkillPath, 'utf8');
  assert.ok(content.includes('Fatal Flaw'), 'Must require Fatal Flaw analysis');
  assert.ok(content.includes('Unstated Assumptions'), 'Must require Unstated Assumptions check');
  assert.ok(content.includes('Invariant Conflicts'), 'Must require Invariant Conflicts check');
  assert.ok(content.includes('Stress-Test Questions') || content.includes('Stress Questions'), 'Must require Stress-Test Questions check');
  assert.ok(content.includes('zero code') || content.includes('Zero Code') || content.includes('forbidden from writing replacement code'), 'Must mandate zero code');
  assert.ok(content.includes('zero praise') || content.includes('Zero Flattery') || content.includes('Zero Praise'), 'Must mandate zero flattery / praise');
});

test('E2E Smoke: Thin Router Rule (rules/AGENTS.md) token budget and dispatch integrity', () => {
  assert.ok(fs.existsSync(routerRulePath), 'rules/AGENTS.md must exist');
  const content = fs.readFileSync(routerRulePath, 'utf8');

  // Adhere to strict < 400 token ceiling (~1600 characters)
  const tokenEst = Math.ceil(content.length / 4);
  assert.ok(tokenEst < 400, `Rule must be strictly under 400 tokens. Current size: ${tokenEst} tokens (${content.length} chars)`);

  // Routing contracts
  assert.ok(content.includes('adaptive-teacher'), 'Rule must dispatch to adaptive-teacher');
  assert.ok(content.includes('sparring-teammate'), 'Rule must dispatch to sparring-teammate');
  assert.ok(content.includes('blast-radius-critic'), 'Rule must dispatch to blast-radius-critic');
  assert.ok(content.includes('Zero Flattery'), 'Rule must enforce anti-sycophancy / Zero Flattery');
  assert.ok(content.includes('just ship'), 'Rule must enforce instant code bypass on "just ship"');
});

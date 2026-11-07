/**
 * @fileoverview Test Suite: Plugin Structural Integrity & Manifest Validation
 * @description
 * Verifies plugin.json schema, hooks.json configuration, YAML frontmatter on all
 * SKILL.md progressive skills, and strictly verifies the 400-token ceiling on AGENTS.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '../plugin');

test('plugin manifest (plugin.json) has valid schema and required fields', () => {
  const manifestPath = path.join(pluginRoot, 'plugin.json');
  assert.ok(fs.existsSync(manifestPath), 'plugin.json must exist');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.id, 'cognitive-personas', 'id must be cognitive-personas');
  assert.equal(manifest.name, 'Cognitive Personas', 'name must be Cognitive Personas');
  assert.ok(manifest.version, 'version must be present');
  assert.ok(manifest.description, 'description must be present');
  assert.equal(manifest.hooks, 'hooks.json', 'hooks must point to hooks.json');
  assert.ok(Array.isArray(manifest.skills), 'skills must be an array');
  assert.equal(manifest.skills.length, 3, 'skills must declare exactly 3 personas');
  assert.ok(manifest.skills.includes('skills/adaptive-teacher'));
  assert.ok(manifest.skills.includes('skills/blast-radius-critic'));
  assert.ok(manifest.skills.includes('skills/sparring-teammate'));
});

test('hooks configuration (hooks.json) has valid SessionStart and PreToolUse hooks', () => {
  const hooksPath = path.join(pluginRoot, 'hooks.json');
  assert.ok(fs.existsSync(hooksPath), 'hooks.json must exist');

  const content = fs.readFileSync(hooksPath, 'utf8');
  const hooksConfig = JSON.parse(content);

  assert.ok(hooksConfig.SessionStart, 'SessionStart hook must be defined');
  assert.ok(hooksConfig.PreToolUse, 'PreToolUse hook must be defined');

  // Verify scripts exist on disk
  const sessionScript = path.join(pluginRoot, 'scripts/hydrate-pedagogy.js');
  const frictionScript = path.join(pluginRoot, 'scripts/friction-guard.js');
  assert.ok(fs.existsSync(sessionScript), 'hydrate-pedagogy.js must exist on disk');
  assert.ok(fs.existsSync(frictionScript), 'friction-guard.js must exist on disk');
});

test('rule token budget: rules/AGENTS.md is under 400 tokens (~1600 chars) if present', () => {
  const rulePath = path.join(pluginRoot, 'rules/AGENTS.md');
  if (fs.existsSync(rulePath)) {
    const content = fs.readFileSync(rulePath, 'utf8');
    // Conservative token estimation: ~4 chars per token in English prose/markdown
    const estimatedTokens = Math.ceil(content.length / 4);
    assert.ok(
      estimatedTokens < 400,
      `AGENTS.md token count must be strictly < 400 tokens. Estimated: ${estimatedTokens} (~${content.length} chars)`
    );
  }
});

test('skills frontmatter validation for existing skills', () => {
  const manifestPath = path.join(pluginRoot, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const skillRelPath of manifest.skills) {
    const skillMdPath = path.join(pluginRoot, skillRelPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      assert.ok(content.startsWith('---'), `${skillRelPath}/SKILL.md must start with YAML frontmatter delimiter`);
      assert.ok(content.includes('name:'), `${skillRelPath}/SKILL.md frontmatter must contain name`);
      assert.ok(content.includes('description:'), `${skillRelPath}/SKILL.md frontmatter must contain description`);
    }
  }
});

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * PreToolUse Hook: Blast-Radius Friction Guard
 * Deterministically checks tool arguments against sensitive file patterns and
 * destructive commands, requiring explicit user prompt before first execution per session.
 * Deduplicates per (conversationId, riskCategory) to avoid ceremony fatigue.
 * Fails open to {"decision": "allow"} on any error.
 */

const RISK_RULES = [
  {
    category: 'DATABASE_SCHEMA',
    tools: ['write_file', 'edit_file'],
    pattern: /(migrations\/|schema\.prisma|schema\.sql|\.sql$|alembic\/)/i,
    extractTarget: (args) => (args?.Path || '').replace(/\\/g, '/'),
  },
  {
    category: 'SECURITY_AUTH',
    tools: ['write_file', 'edit_file'],
    pattern: /(\/auth\/|\/crypto\/|\/permissions\/|\/jwt\/|jwt-signer|session-mgr)/i,
    extractTarget: (args) => (args?.Path || '').replace(/\\/g, '/'),
  },
  {
    category: 'ROOT_DEPENDENCIES',
    tools: ['write_file', 'edit_file'],
    pattern: /(^|\/)(package\.json|Cargo\.toml|go\.mod|requirements\.txt|pom\.xml)$/i,
    extractTarget: (args) => (args?.Path || '').replace(/\\/g, '/'),
  },
  {
    category: 'CONTRACT_SURFACE',
    tools: ['write_file', 'edit_file'],
    pattern: /(^|\/)(openapi\.(json|yaml|yml)|.*\.proto)$/i,
    extractTarget: (args) => (args?.Path || '').replace(/\\/g, '/'),
  },
  {
    category: 'DESTRUCTIVE_COMMANDS',
    tools: ['run_command'],
    pattern: /\b(rm\s+-rf|git\s+reset\s+--hard|drop\s+table|delete\s+from|mkfs|dd\s+if=)\b/i,
    extractTarget: (args) => args?.CommandLine || '',
  },
];

function pruneStaleMarkers(tempDir) {
  try {
    const now = Date.now();
    const ttlMs = 24 * 3600 * 1000;
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file.startsWith('ag-friction-') && file.endsWith('.json')) {
        const fullPath = path.join(tempDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > ttlMs) {
            fs.unlinkSync(fullPath);
          }
        } catch {
          // ignore single file error
        }
      }
    }
  } catch {
    // ignore cleanup error
  }
}

function run() {
  try {
    let rawInput = '';
    try {
      rawInput = fs.readFileSync(0, 'utf8');
    } catch {
      rawInput = '';
    }

    if (!rawInput || !rawInput.trim()) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawInput);
    } catch {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    const { toolName, arguments: args, context } = payload || {};
    const conversationId = context?.conversationId || 'default-session';
    const tempDir = os.tmpdir();

    // Background housekeeping for markers older than 24h
    pruneStaleMarkers(tempDir);

    if (!toolName || !args) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Evaluate matching risk category
    let matchedCategory = null;
    for (const rule of RISK_RULES) {
      if (!rule.tools.includes(toolName)) continue;
      const target = rule.extractTarget(args);
      if (target && rule.pattern.test(target)) {
        matchedCategory = rule.category;
        break;
      }
    }

    if (!matchedCategory) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Check session marker deduplication
    const hash = crypto
      .createHash('sha256')
      .update(`${conversationId}:${matchedCategory}`)
      .digest('hex')
      .slice(0, 16);
    const markerFile = path.join(tempDir, `ag-friction-${hash}.json`);

    if (fs.existsSync(markerFile)) {
      try {
        const stat = fs.statSync(markerFile);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < 24 * 3600 * 1000) {
          // Already prompted in this conversation session: allow through
          process.stdout.write(JSON.stringify({ decision: 'allow' }));
          return;
        }
      } catch {
        // Fall through on stat error
      }
    }

    // Record session marker
    try {
      fs.writeFileSync(markerFile, JSON.stringify({ timestamp: Date.now(), category: matchedCategory }));
    } catch {
      // ignore write error
    }

    // Emit prompt decision with specific category guidance
    const promptMessage = `CRITICAL RISK: Modifying high-blast-radius surface [${matchedCategory}]. Before proceeding, have you engaged the Blast-Radius Critic or Sparring Teammate?`;
    process.stdout.write(
      JSON.stringify({
        decision: 'prompt',
        message: promptMessage,
      })
    );
  } catch {
    // Fail-open guarantee: never block tool execution on script defect
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

run();

#!/usr/bin/env node
/**
 * @fileoverview PreToolUse Hook: Blast-Radius Friction Guard
 * @description
 * Deterministic lifecycle guard executed before agent tool calls on sensitive
 * surfaces (file edits and terminal commands).
 *
 * Responsibilities:
 * 1. Inspects tool invocations (write_file, edit_file, run_command) against
 *    one-way door risk categories (migrations, auth/crypto, contract surfaces,
 *    root dependencies, and destructive terminal commands).
 * 2. Normalizes Windows backslashes (`\`) to forward slashes (`/`) to ensure
 *    uniform regex matching across all operating systems.
 * 3. Enforces session deduplication: caches prompted categories per conversation
 *    in `os.tmpdir()` so the developer is prompted at most once per risk category
 *    per conversation session, eliminating ceremony fatigue.
 * 4. Automatically prunes stale markers older than 24 hours.
 * 5. Fails open to `{"decision": "allow"}` on malformed input or unexpected errors.
 *
 * Execution Profile:
 * - Runtime: Node.js v22+
 * - Flags: --no-warnings
 * - Target Latency: < 150ms
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * @typedef {Object} RiskRule
 * @property {string} category - Identifier for the risk category (e.g. DATABASE_SCHEMA).
 * @property {string[]} tools - Applicable tool names to intercept.
 * @property {RegExp} pattern - Regular expression matching high-risk paths or commands.
 * @property {function(Record<string, any>): string} extractTarget - Extractor function returning target string.
 */

/**
 * Deterministic rules governing one-way door surfaces.
 * @type {RiskRule[]}
 */
const RISK_RULES = [
  {
    category: 'DATABASE_SCHEMA',
    tools: ['write_file', 'edit_file'],
    pattern: /(migrations\/|schema\.prisma|schema\.sql|\.sql$|alembic\/)/i,
    extractTarget: (args) => (args?.Path || args?.path || args?.filePath || '').replace(/\\/g, '/'),
  },
  {
    category: 'SECURITY_AUTH',
    tools: ['write_file', 'edit_file'],
    pattern: /(^|\/)(auth|crypto|permissions|jwt)\/|jwt-signer|session-mgr/i,
    extractTarget: (args) => (args?.Path || args?.path || args?.filePath || '').replace(/\\/g, '/'),
  },
  {
    category: 'ROOT_DEPENDENCIES',
    tools: ['write_file', 'edit_file'],
    pattern: /(^|\/)(package\.json|package-lock\.json|Cargo\.toml|Cargo\.lock|go\.mod|go\.sum|requirements\.txt|pom\.xml)$/i,
    extractTarget: (args) => (args?.Path || args?.path || args?.filePath || '').replace(/\\/g, '/'),
  },
  {
    category: 'CONTRACT_SURFACE',
    tools: ['write_file', 'edit_file'],
    pattern: /(^|\/)(openapi\.(json|yaml|yml)|.*\.proto|graphql\.schema|schema\.graphql|.*\.gql|.*\.graphql)$/i,
    extractTarget: (args) => (args?.Path || args?.path || args?.filePath || '').replace(/\\/g, '/'),
  },
  {
    category: 'DESTRUCTIVE_COMMANDS',
    tools: ['run_command'],
    pattern: /\b(rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)|git\s+reset\s+--hard|drop\s+table|delete\s+from|mkfs|dd\s+if=|remove-item\s+.*(-recurse.*-force|-force.*-recurse)|rmdir\s+\/s\s+\/q|rd\s+\/s\s+\/q)\b/i,
    extractTarget: (args) => args?.CommandLine || args?.command || args?.commandLine || '',
  },
];

/**
 * Prunes session markers older than 24 hours to prevent inode accumulation.
 *
 * @param {string} tempDir - Path to operating system temporary directory.
 * @returns {void}
 */
function pruneStaleMarkers(tempDir) {
  try {
    const now = Date.now();
    const ttlMs = 24 * 3600 * 1000; // 24-hour retention
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
          // Ignore individual file deletion errors
        }
      }
    }
  } catch {
    // Ignore directory scan errors
  }
}

/**
 * Main execution routine for the PreToolUse hook.
 * Reads JSON payload from stdin (fd 0) and writes response to stdout.
 *
 * @returns {void}
 */
function run() {
  try {
    // If run directly in an interactive terminal, exit immediately to prevent hang
    if (process.stdin.isTTY) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Read stdin synchronously from file descriptor 0
    let rawInput = '';
    try {
      rawInput = fs.readFileSync(0, 'utf8');
    } catch {
      rawInput = '';
    }

    // Fail open if stdin is empty
    if (!rawInput || !rawInput.trim()) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Parse incoming JSON payload
    let payload;
    try {
      payload = JSON.parse(rawInput);
    } catch {
      // Malformed JSON fails open safely
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Dual-compatibility: supports Antigravity native { toolCall: { name, args } }
    // as well as generic/test harness { toolName, arguments }
    const toolName = payload?.toolCall?.name || payload?.toolName || '';
    const args = payload?.toolCall?.args || payload?.arguments || {};
    const conversationId =
      payload?.conversationId || payload?.context?.conversationId || 'default-session';
    const tempDir = os.tmpdir();

    // Background housekeeping for markers older than 24h
    pruneStaleMarkers(tempDir);

    // If toolName or args are missing, allow execution
    if (!toolName || !args) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Evaluate tool arguments against defined risk categories
    let matchedCategory = null;
    for (const rule of RISK_RULES) {
      if (!rule.tools.includes(toolName)) continue;
      const target = rule.extractTarget(args);
      if (target && rule.pattern.test(target)) {
        matchedCategory = rule.category;
        break;
      }
    }

    // If no risk pattern matched, allow immediately
    if (!matchedCategory) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // Generate deterministic session hash for deduplication
    const hash = crypto
      .createHash('sha256')
      .update(`${conversationId}:${matchedCategory}`)
      .digest('hex')
      .slice(0, 16);
    const markerFile = path.join(tempDir, `ag-friction-${hash}.json`);

    // Check if user was already prompted in this conversation session
    if (fs.existsSync(markerFile)) {
      try {
        const stat = fs.statSync(markerFile);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < 24 * 3600 * 1000) {
          // Already prompted: allow without duplicate ceremony
          process.stdout.write(JSON.stringify({ decision: 'allow' }));
          return;
        }
      } catch {
        // Fall through on file stat error
      }
    }

    // Record session marker before prompting
    try {
      fs.writeFileSync(
        markerFile,
        JSON.stringify({ timestamp: Date.now(), category: matchedCategory })
      );
    } catch {
      // Ignore write errors
    }

    // Emit prompt decision requiring explicit human confirmation
    const promptMessage = `CRITICAL RISK: Modifying high-blast-radius surface [${matchedCategory}]. Before proceeding, have you engaged the Blast-Radius Critic or Sparring Teammate?`;
    const isNativeAntigravity = Boolean(payload?.toolCall);
    process.stdout.write(
      JSON.stringify({
        decision: isNativeAntigravity ? 'ask' : 'prompt',
        prompt: true,
        reason: promptMessage,
        message: promptMessage,
      })
    );
  } catch {
    // Fail-open guarantee: never block tool execution on script defect
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

// Execute hook
run();

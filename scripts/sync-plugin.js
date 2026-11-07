#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const pluginSource = path.join(repoRoot, 'plugin');
const targetPluginDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'cognitive-personas');

console.log('🔄 Syncing Cognitive Personas plugin...');
console.log(`Source: ${pluginSource}`);
console.log(`Target: ${targetPluginDir}`);

try {
  if (!fs.existsSync(pluginSource)) {
    throw new Error(`Plugin source directory not found: ${pluginSource}`);
  }

  // Ensure target parent directory exists
  fs.mkdirSync(path.dirname(targetPluginDir), { recursive: true });

  // Copy recursive (Node 16.7+)
  fs.cpSync(pluginSource, targetPluginDir, { recursive: true, force: true });

  console.log('✅ Successfully synced cognitive-personas plugin to Antigravity config directory!');
  console.log('💡 Restart Antigravity or start a new conversation to load the updated plugin.');
} catch (err) {
  console.error(`❌ Plugin sync failed: ${err.message}`);
  process.exit(1);
}

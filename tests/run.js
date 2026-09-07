#!/usr/bin/env node
/* ================================================================
   Test runner entry point.

   Usage:
     node --test "tests/*.test.js"
     node --test --test-reporter=spec "tests/*.test.js"
     node tests/run.js  (fallback if node:test not available)

   This file exists as a convenience — actual test discovery is done
   by node:test CLI. Manual runner below is fallback for older Node.
   ================================================================ */

'use strict';

const nodeVersion = process.versions.node.split('.').map(Number);
const majorVersion = nodeVersion[0];

if (majorVersion < 18) {
  console.error('\x1b[31m✖ Node.js 18+ required (found: ' + process.version + ')\x1b[0m');
  console.error('  node:test module is not available in older versions.');
  console.error('  Install Node 18+ from https://nodejs.org/');
  process.exit(1);
}

console.log('\x1b[36m═══════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[36m  Grafik Gillette — Unit Tests\x1b[0m');
console.log('\x1b[36m═══════════════════════════════════════════════════════\x1b[0m');
console.log('  Node: ' + process.version);
console.log('');
console.log('  Preferred usage:');
console.log('    \x1b[33mnode --test "tests/*.test.js"\x1b[0m');
console.log('    \x1b[33mnode --test --test-reporter=spec "tests/*.test.js"\x1b[0m');
console.log('');
console.log('  Running all tests via child_process...');
console.log('');

const { spawnSync } = require('child_process');
const path = require('path');

// NOTE: Passing the tests/ directory directly to --test is unreliable on
// Windows / Node 22+ (Node tries to load the directory as a module and
// fails with MODULE_NOT_FOUND). Use a glob pattern instead — Node expands
// glob patterns in --test positional args since v21.
const testGlob = path.join(__dirname, '*.test.js').replace(/\\/g, '/');

const result = spawnSync(
  process.execPath,
  ['--test', '--test-reporter=spec', testGlob],
  { stdio: 'inherit' }
);

process.exit(result.status || 0);
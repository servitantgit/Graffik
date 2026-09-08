#!/usr/bin/env node
/* ================================================================
   i18n Audit Tool
   
   Analyzes translation keys used in project vs defined in i18n files.
   Reports: missing keys, unused keys, parity mismatches, untranslated
   values, placeholder mismatches.
   
   Usage: node tools/i18n-audit.js
   
   Read-only: does not modify any files.
   ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(PROJECT_ROOT, 'js', 'i18n');
const LANGS = ['pl', 'en', 'uk'];

// Directories to scan for t() calls and data-i18n attributes
const SCAN_DIRS = ['js', 'css'];
const SCAN_ROOT_FILES = ['index.html'];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /i18n[\\/](pl|en|uk|i18n)\.js$/,
  /tools[\\/]/,
];

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const red = (t) => color(31, t);
const green = (t) => color(32, t);
const yellow = (t) => color(33, t);
const blue = (t) => color(34, t);
const cyan = (t) => color(36, t);
const bold = (t) => color(1, t);
const dim = (t) => color(2, t);

/**
 * Load i18n file and extract keys.
 * Parses `window.translations.XX = { ... }` object literal via regex.
 */
function loadI18nFile(lang) {
  const filePath = path.join(I18N_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) {
    console.error(red(`✖ i18n file not found: ${filePath}`));
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Map();

  // Match: key: 'value' OR key: "value" OR key: `value`
  // Handles multiline template strings
  const regex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(['"`])([\s\S]*?)\2\s*,?\s*$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const value = match[3];
    if (keys.has(key)) {
      console.warn(yellow(`⚠  Duplicate key in ${lang}.js: ${key}`));
    }
    keys.set(key, value);
  }
  return keys;
}
/**
 * Recursively collect all files matching extensions from directory.
 */
function collectFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(PROJECT_ROOT, fullPath);
    if (EXCLUDE_PATTERNS.some((p) => p.test(relPath))) continue;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract all key usages from a file.
 * Detects: t('key'), t("key"), data-i18n="key", data-i18n-title="key",
 *          data-i18n-placeholder="key"
 */
function extractKeyUsages(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();

  // t('key') or t("key") — with optional params
  const tCallRegex = /\bt\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]/g;
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }

  // tr('key') helper used in settings.js
  const trCallRegex = /\btr\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]/g;
  while ((match = trCallRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }

  // data-i18n="key", data-i18n-title="key", data-i18n-placeholder="key"
  const dataI18nRegex = /data-i18n(?:-(?:title|placeholder))?\s*=\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]/g;
  while ((match = dataI18nRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }

  // translate('key', ...) — helper used in js/schedules/_core.js
  // Signature: translate(key, fallback) with i18n resolution
  const translateCallRegex = /\btranslate\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]/g;
  while ((match = translateCallRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }

  return keys;
}

/**
 * Extract dynamic key prefixes from code.
 * Detects patterns like:
 *   t('prefix' + variable)
 *   t('prefix' + var + 'suffix')
 *   t(`prefix${variable}`)
 * Returns Set of prefix strings (without trailing quotes).
 */
function extractDynamicPrefixes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const prefixes = new Set();

  // Pattern 1: t('prefix' + variable), tr('prefix' + var), translate('prefix' + var)
  // \b(t|tr|translate)\w* matches t, tr, translate, and their compound forms
  const concatRegex = /\b(?:t|tr|translate)\w*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\+/g;
  let match;
  while ((match = concatRegex.exec(content)) !== null) {
    prefixes.add(match[1]);
  }

  // Pattern 2: t(`prefix${var}`), tr(`prefix${var}`), translate(`prefix${var}`)
  const templateRegex = /\b(?:t|tr|translate)\w*\(\s*`([a-zA-Z_][a-zA-Z0-9_]*)\$\{/g;
  while ((match = templateRegex.exec(content)) !== null) {
    prefixes.add(match[1]);
  }

  return prefixes;
}

/**
 * Check if a key matches any dynamic prefix pattern.
 * E.g. "labelR" matches prefix "label".
 */
function matchesDynamicPrefix(key, prefixes) {
  for (const prefix of prefixes) {
    if (key.startsWith(prefix) && key.length > prefix.length) {
      // Ensure next char is uppercase or digit (typical suffix pattern)
      const nextChar = key[prefix.length];
      if (nextChar === nextChar.toUpperCase() || /\d/.test(nextChar)) {
        return prefix;
      }
    }
  }
  return null;
}

/**
 * Extract placeholder names from i18n value string.
 * E.g. "Hello {name}, you have {count} items" -> ['name', 'count']
 */
function extractPlaceholders(value) {
  const placeholders = new Set();
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let match;
  while ((match = regex.exec(value)) !== null) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function setDiff(a, b) {
  return [...a].filter((x) => !b.has(x));
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// ============================================================
// MAIN
// ============================================================

console.log(bold(cyan('\n═══════════════════════════════════════════════════════')));
console.log(bold(cyan('  i18n AUDIT REPORT')));
console.log(bold(cyan('═══════════════════════════════════════════════════════\n')));

// 1. Load i18n files
const translations = {};
for (const lang of LANGS) {
  const keys = loadI18nFile(lang);
  if (!keys) process.exit(1);
  translations[lang] = keys;
  console.log(`  ${green('✓')} ${lang}.js loaded: ${bold(keys.size)} keys`);
}

// 2. Collect source files
const sourceFiles = [];
for (const dir of SCAN_DIRS) {
  sourceFiles.push(...collectFiles(path.join(PROJECT_ROOT, dir), ['.js', '.css', '.html']));
}
for (const file of SCAN_ROOT_FILES) {
  const p = path.join(PROJECT_ROOT, file);
  if (fs.existsSync(p)) sourceFiles.push(p);
}
console.log(`  ${green('✓')} Scanned ${bold(sourceFiles.length)} source files\n`);

// 3. Collect used keys
const usedKeys = new Map(); // key -> Set of files where used
const dynamicPrefixes = new Map(); // prefix -> Set of files
for (const file of sourceFiles) {
  const keys = extractKeyUsages(file);
  for (const k of keys) {
    if (!usedKeys.has(k)) usedKeys.set(k, new Set());
    usedKeys.get(k).add(path.relative(PROJECT_ROOT, file));
  }
  const prefixes = extractDynamicPrefixes(file);
  for (const p of prefixes) {
    if (!dynamicPrefixes.has(p)) dynamicPrefixes.set(p, new Set());
    dynamicPrefixes.get(p).add(path.relative(PROJECT_ROOT, file));
  }
}
console.log(`  ${green('✓')} Found ${bold(usedKeys.size)} unique static key usages in code`);
console.log(`  ${green('✓')} Found ${bold(dynamicPrefixes.size)} dynamic key prefixes (t('prefix' + var))\n`);


// ============================================================
// ANALYSIS
// ============================================================

const plKeys = translations.pl;
const enKeys = translations.en;
const ukKeys = translations.uk;
const allDefinedKeys = new Set([...plKeys.keys(), ...enKeys.keys(), ...ukKeys.keys()]);

// --- 1. MISSING KEYS (used in code but not defined) ---
console.log(bold(yellow('─── 1. MISSING KEYS (used in code, not in i18n) ───')));
const missingKeys = [];
for (const [key, files] of usedKeys) {
  const missingIn = LANGS.filter((lang) => !translations[lang].has(key));
  if (missingIn.length > 0) {
    missingKeys.push({ key, missingIn, files: [...files] });
  }
}
if (missingKeys.length === 0) {
  console.log(green('  ✓ No missing keys\n'));
} else {
  console.log(red(`  ✖ ${missingKeys.length} missing key(s):\n`));
  for (const { key, missingIn, files } of missingKeys) {
    console.log(`    ${red('•')} ${bold(key)}`);
    console.log(`      ${dim('missing in:')} ${red(missingIn.join(', '))}`);
    console.log(`      ${dim('used in:')} ${files.slice(0, 3).join(', ')}${files.length > 3 ? dim(` (+${files.length - 3} more)`) : ''}`);
  }
  console.log('');
}

// --- Show dynamic patterns detected ---
if (dynamicPrefixes.size > 0) {
  console.log(bold(cyan('─── DYNAMIC KEY PATTERNS DETECTED ───')));
  console.log(dim('  These prefixes are used with variable concatenation (e.g. t("label" + shift))'));
  console.log(dim('  Keys starting with these prefixes are treated as USED to avoid false positives.\n'));
  const sortedPrefixes = [...dynamicPrefixes.keys()].sort();
  for (const prefix of sortedPrefixes) {
    const files = [...dynamicPrefixes.get(prefix)].slice(0, 2);
    // Count matching keys per prefix
    const matched = [...allDefinedKeys].filter((k) => {
      const m = matchesDynamicPrefix(k, new Set([prefix]));
      return m === prefix;
    });
    console.log(`    ${cyan('•')} ${bold(prefix + '*')} → ${matched.length} matching key(s) ${dim('(' + files.join(', ') + ')')}`);
  }
  console.log('');
}

// --- 2. UNUSED KEYS (defined but never used) ---
console.log(bold(yellow('─── 2. UNUSED KEYS (defined in i18n, not used in code) ───')));
const unusedKeys = [];
const dynamicallyUsed = [];
for (const key of allDefinedKeys) {
  if (usedKeys.has(key)) continue; // static usage
  const matchedPrefix = matchesDynamicPrefix(key, new Set(dynamicPrefixes.keys()));
  if (matchedPrefix) {
    dynamicallyUsed.push({ key, prefix: matchedPrefix });
    continue; // matched dynamic pattern → treat as used
  }
  const definedIn = LANGS.filter((lang) => translations[lang].has(key));
  unusedKeys.push({ key, definedIn });
}

if (dynamicallyUsed.length > 0) {
  console.log(dim(`  ℹ ${dynamicallyUsed.length} keys matched dynamic patterns and excluded from "unused"`));
}
if (unusedKeys.length === 0) {
  console.log(green('  ✓ No unused keys\n'));
} else {
  console.log(yellow(`  ⚠ ${unusedKeys.length} unused key(s):\n`));
  const sorted = unusedKeys.sort((a, b) => a.key.localeCompare(b.key));
  for (const { key, definedIn } of sorted.slice(0, 50)) {
    console.log(`    ${yellow('•')} ${key} ${dim(`(in: ${definedIn.join(', ')})`)}`);
  }
  if (sorted.length > 50) {
    console.log(dim(`    ... and ${sorted.length - 50} more`));
  }
  console.log('');
}
// --- 3. PARITY MISMATCHES (key in one lang, missing in another) ---
console.log(bold(yellow('─── 3. PARITY MISMATCHES (defined in some but not all langs) ───')));
const parityIssues = [];
for (const key of allDefinedKeys) {
  const definedIn = LANGS.filter((lang) => translations[lang].has(key));
  if (definedIn.length !== LANGS.length && definedIn.length > 0) {
    const missingIn = LANGS.filter((lang) => !translations[lang].has(key));
    parityIssues.push({ key, definedIn, missingIn });
  }
}
if (parityIssues.length === 0) {
  console.log(green('  ✓ All keys defined in all languages\n'));
} else {
  console.log(red(`  ✖ ${parityIssues.length} parity issue(s):\n`));
  for (const { key, definedIn, missingIn } of parityIssues) {
    console.log(`    ${red('•')} ${bold(key)}`);
    console.log(`      ${dim('in:')} ${green(definedIn.join(', '))} ${dim('missing:')} ${red(missingIn.join(', '))}`);
  }
  console.log('');
}

// --- 4. UNTRANSLATED KEYS (value == key name) ---
console.log(bold(yellow('─── 4. UNTRANSLATED KEYS (value equals key name) ───')));
const untranslated = [];
for (const lang of LANGS) {
  for (const [key, value] of translations[lang]) {
    if (value === key) {
      untranslated.push({ lang, key });
    }
  }
}
if (untranslated.length === 0) {
  console.log(green('  ✓ No untranslated keys\n'));
} else {
  console.log(yellow(`  ⚠ ${untranslated.length} untranslated value(s):\n`));
  for (const { lang, key } of untranslated.slice(0, 30)) {
    console.log(`    ${yellow('•')} ${lang}: ${key}`);
  }
  if (untranslated.length > 30) {
    console.log(dim(`    ... and ${untranslated.length - 30} more`));
  }
  console.log('');
}

// --- 5. PLACEHOLDER MISMATCHES ---
console.log(bold(yellow('─── 5. PLACEHOLDER MISMATCHES (different {vars} across langs) ───')));
const placeholderIssues = [];
const commonKeys = [...allDefinedKeys].filter((k) =>
  LANGS.every((lang) => translations[lang].has(k))
);
for (const key of commonKeys) {
  const placeholdersByLang = {};
  for (const lang of LANGS) {
    placeholdersByLang[lang] = extractPlaceholders(translations[lang].get(key));
  }
  const [firstLang, ...restLangs] = LANGS;
  const reference = placeholdersByLang[firstLang];
  const mismatches = restLangs.filter(
    (lang) => !setsEqual(reference, placeholdersByLang[lang])
  );
  if (mismatches.length > 0) {
    placeholderIssues.push({ key, placeholdersByLang });
  }
}
if (placeholderIssues.length === 0) {
  console.log(green('  ✓ All placeholders match across languages\n'));
} else {
  console.log(red(`  ✖ ${placeholderIssues.length} placeholder mismatch(es):\n`));
  for (const { key, placeholdersByLang } of placeholderIssues) {
    console.log(`    ${red('•')} ${bold(key)}`);
    for (const lang of LANGS) {
      const ph = [...placeholdersByLang[lang]];
      console.log(`      ${lang}: ${ph.length ? cyan(ph.map((p) => '{' + p + '}').join(', ')) : dim('(none)')}`);
    }
  }
  console.log('');
}

// ============================================================
// SUMMARY
// ============================================================
console.log(bold(cyan('═══════════════════════════════════════════════════════')));
console.log(bold(cyan('  SUMMARY')));
console.log(bold(cyan('═══════════════════════════════════════════════════════')));
console.log(`  Missing keys:         ${missingKeys.length ? red(missingKeys.length) : green('0')}`);
console.log(`  Unused keys:          ${unusedKeys.length ? yellow(unusedKeys.length) : green('0')}`);
console.log(`  Parity issues:        ${parityIssues.length ? red(parityIssues.length) : green('0')}`);
console.log(`  Untranslated:         ${untranslated.length ? yellow(untranslated.length) : green('0')}`);
console.log(`  Placeholder issues:   ${placeholderIssues.length ? red(placeholderIssues.length) : green('0')}`);
console.log('');

const hasCritical = missingKeys.length > 0 || parityIssues.length > 0 || placeholderIssues.length > 0;
if (hasCritical) {
  console.log(red(bold('  ✖ Critical issues found — review recommended\n')));
  process.exit(1);
} else {
  console.log(green(bold('  ✓ No critical issues\n')));
  process.exit(0);
}



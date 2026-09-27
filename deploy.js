#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = __dirname;

const ENV_FILE = join(rootDir, '.env.submit');
const HISTORY_FILE = join(rootDir, '.deploy-history.json');
const AMO_API = 'https://addons.mozilla.org/api/v5';
const CWS_ITEM_API = 'https://www.googleapis.com/chromewebstore/v1.1/items';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REQUEST_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const hasFlag = (...names) => names.some(name => argv.includes(name));

const OPT = {
  dryRun: hasFlag('--dry-run'),
  checkOnly: hasFlag('--check'),
  assumeYes: hasFlag('--yes', '-y'),
  force: hasFlag('--force'),
  skipChecks: hasFlag('--skip-checks'),
  help: hasFlag('--help', '-h'),
};

// Which stores to submit to. Both by default; narrow it while a store is still
// being set up (e.g. Chrome OAuth not finished yet).
const CHROME_ONLY = hasFlag('--chrome-only');
const FIREFOX_ONLY = hasFlag('--firefox-only');
if (CHROME_ONLY && FIREFOX_ONLY) {
  console.error('Cannot pass both --chrome-only and --firefox-only.');
  process.exit(1);
}
const STORES = CHROME_ONLY ? ['chrome'] : FIREFOX_ONLY ? ['firefox'] : ['chrome', 'firefox'];
const HAS_CHROME = STORES.includes('chrome');
const HAS_FIREFOX = STORES.includes('firefox');

// Credentials each store needs before `wxt submit` can talk to it.
const CHROME_KEYS = [
  'CHROME_EXTENSION_ID',
  'CHROME_CLIENT_ID',
  'CHROME_CLIENT_SECRET',
  'CHROME_REFRESH_TOKEN',
];
// The Firefox add-on id can be derived from the build, so it is not required here.
const FIREFOX_KEYS = ['FIREFOX_JWT_ISSUER', 'FIREFOX_JWT_SECRET'];

// Prompts are only shown on a real terminal unless --yes was passed. When we
// cannot prompt we fall back to the safest behaviour for each question.
const CAN_PROMPT = Boolean(process.stdin.isTTY) && !OPT.assumeYes;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  log(`Running: ${command}`, 'cyan');
  execSync(command, { stdio: 'inherit', cwd: rootDir });
}

function execOutput(command) {
  return execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
}

// A single readline interface for the whole run; creating one per question
// silently drops buffered input.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askYesNo(question, defaultYes) {
  if (!CAN_PROMPT) return defaultYes;
  const hint = defaultYes ? ' [Y/n]: ' : ' [y/N]: ';
  const answer = (await ask(question + hint)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

function done(code) {
  try {
    rl.close();
  } catch {
    // stdin already closed
  }
  process.exit(code);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnv() {
  const env = {};

  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  // Real environment variables win, matching dotenv's default behaviour.
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && (key.startsWith('CHROME_') || key.startsWith('FIREFOX_'))) {
      env[key] = value;
    }
  }

  return env;
}

function readPackageJson() {
  return JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
}

/** Compare two dotted version strings. Returns -1, 0 or 1. */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function readHistory() {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
    return Array.isArray(parsed.deployments) ? parsed.deployments : [];
  } catch {
    return [];
  }
}

function recordDeployment(version, stores) {
  const deployments = readHistory();
  deployments.push({ version, date: new Date().toISOString(), stores });
  writeFileSync(
    HISTORY_FILE,
    `${JSON.stringify({ deployments }, null, 2)}\n`
  );
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

function checkLocalGitTag(version) {
  try {
    execSync(`git rev-parse -q --verify "refs/tags/v${version}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    return { status: 'ok', versions: [version] };
  } catch {
    return { status: 'ok', versions: [] };
  }
}

/** Best-effort read of the live Chrome Web Store version (needs OAuth creds). */
async function checkChromeStore(env) {
  const store = 'Chrome Web Store';
  const extensionId = env.CHROME_EXTENSION_ID;
  const clientId = env.CHROME_CLIENT_ID;
  const clientSecret = env.CHROME_CLIENT_SECRET;
  const refreshToken = env.CHROME_REFRESH_TOKEN;

  if (!extensionId) return { store, status: 'skipped', reason: 'CHROME_EXTENSION_ID not set' };
  if (!clientId || !clientSecret || !refreshToken) {
    return { store, status: 'skipped', reason: 'Chrome OAuth credentials not found' };
  }

  try {
    const tokenRes = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      // Distinguish the common Google OAuth failures so the fix is obvious.
      let errorCode = '';
      try {
        errorCode = (await tokenRes.json())?.error ?? '';
      } catch {
        // response was not JSON
      }

      let hint = '';
      if (errorCode === 'invalid_grant') {
        // Usually an expired/revoked refresh token: Testing-mode consent
        // screens issue refresh tokens that expire after 7 days.
        hint =
          ' — regenerate CHROME_REFRESH_TOKEN in the OAuth Playground' +
          (tokenRes.status === 400 ? ' (Testing-mode tokens expire after 7 days)' : '');
      } else if (errorCode === 'invalid_client') {
        hint = ' — CHROME_CLIENT_ID / CHROME_CLIENT_SECRET do not match, or the OAuth client is deleted';
      } else if (tokenRes.status === 403) {
        hint = ' — the signed-in Google account may lack access; check the OAuth consent screen test users';
      }

      return {
        store,
        status: 'error',
        reason: `token request failed (HTTP ${tokenRes.status}${errorCode ? ` ${errorCode}` : ''})${hint}`,
      };
    }

    const { access_token: accessToken } = await tokenRes.json();
    if (!accessToken) {
      return { store, status: 'error', reason: 'token request returned no access token' };
    }

    const versions = new Set();
    for (const projection of ['PUBLISHED', 'DRAFT']) {
      try {
        const res = await fetchWithTimeout(
          `${CWS_ITEM_API}/${encodeURIComponent(extensionId)}?projection=${projection}`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'x-goog-api-version': '2' } }
        );
        if (res.ok) {
          const item = await res.json();
          if (item.crxVersion) versions.add(item.crxVersion);
        }
      } catch {
        // Try the next projection; both failing is handled below.
      }
    }

    if (versions.size === 0) {
      return { store, status: 'error', reason: 'could not read the item version from the API' };
    }

    return { store, status: 'ok', versions: [...versions] };
  } catch (error) {
    return { store, status: 'error', reason: error.message ?? String(error) };
  }
}

/**
 * Resolve the Firefox add-on id. Unlike Chrome, this is public information: it
 * is baked into the built manifest and defined in wxt.config.ts, so the AMO
 * duplicate check works even before .env.submit has been created.
 */
function resolveFirefoxExtensionId(env) {
  if (env.FIREFOX_EXTENSION_ID) return env.FIREFOX_EXTENSION_ID;

  const manifestPath = join(rootDir, 'dist', 'firefox-mv2', 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const id = JSON.parse(readFileSync(manifestPath, 'utf8'))
        ?.browser_specific_settings?.gecko?.id;
      if (id) return id;
    } catch {
      // fall through to the config lookup
    }
  }

  try {
    const config = readFileSync(join(rootDir, 'wxt.config.ts'), 'utf8');
    const match = config.match(/id:\s*['"]([^'"]+@[^'"]+)['"]/);
    if (match) return match[1];
  } catch {
    // no config file to read
  }

  return undefined;
}

/** Read published Firefox versions. The AMO versions endpoint is public. */
async function checkFirefoxStore(env) {
  const store = 'Firefox Add-ons';
  const rawId = resolveFirefoxExtensionId(env);
  if (!rawId) return { store, status: 'skipped', reason: 'could not determine the add-on id' };

  const extensionId = rawId.replace(/^\{|\}$/g, '');
  try {
    const res = await fetchWithTimeout(
      `${AMO_API}/addons/addon/${encodeURIComponent(extensionId)}/versions/?page_size=50`
    );
    if (!res.ok) {
      return { store, status: 'error', reason: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const versions = (body.results ?? []).map(r => r.version).filter(Boolean);
    return { store, status: 'ok', versions: [...new Set(versions)] };
  } catch (error) {
    return { store, status: 'error', reason: error.message ?? String(error) };
  }
}

/** Turn raw store results into duplicate/behind findings for a version. */
function evaluateResults(results, version) {
  const findings = [];

  for (const result of results) {
    if (result.status !== 'ok' || !result.versions.length) continue;

    const exact = result.versions.find(v => compareVersions(v, version) === 0);
    if (exact) {
      findings.push({
        kind: 'duplicate',
        store: result.store,
        local: Boolean(result.local),
        message: `already has v${version}`,
      });
      continue;
    }

    const newer = result.versions
      .filter(v => compareVersions(v, version) > 0)
      .sort(compareVersions);
    if (newer.length) {
      findings.push({
        kind: 'behind',
        store: result.store,
        message: `is ahead at v${newer[newer.length - 1]}`,
      });
    }
  }

  return findings;
}

async function runChecks(version, env) {
  const results = [];
  const findings = [];

  // 1. Local git tag
  const tag = checkLocalGitTag(version);
  results.push({
    store: 'Local git tag',
    local: true,
    status: 'ok',
    versions: tag.versions,
  });

  // 2. Local deploy history
  const deployed = readHistory().filter(d => compareVersions(d.version, version) === 0);
  results.push({
    store: 'Local deploy history',
    local: true,
    status: 'ok',
    versions: deployed.map(d => d.version),
  });

  // 3. Remote stores (best effort, in parallel)
  results.push(...(await Promise.all([checkChromeStore(env), checkFirefoxStore(env)])));

  findings.push(...evaluateResults(results, version));

  return { results, findings };
}

function printReport(version, results, findings) {
  log('\n🔎 Pre-flight duplicate check', 'bright');
  log(`   Candidate version: v${version}`, 'cyan');
  log('');

  for (const result of results) {
    if (result.status === 'ok') {
      const known = result.versions.length ? `v${result.versions.join(', v')}` : 'nothing on record';
      const dup = result.versions.some(v => compareVersions(v, version) === 0);
      const label = dup ? '❌' : '✅';
      const color = dup ? 'red' : 'green';
      log(`   ${label} ${result.store}: ${known}`, color);
    } else if (result.status === 'skipped') {
      log(`   ⏭️  ${result.store}: skipped (${result.reason})`, 'yellow');
    } else {
      log(`   ⚠️  ${result.store}: could not verify (${result.reason})`, 'yellow');
    }
  }

  const duplicates = findings.filter(f => f.kind === 'duplicate');
  const behind = findings.filter(f => f.kind === 'behind');

  log('');
  for (const finding of duplicates) {
    const suffix = finding.local
      ? '— this version was already released.'
      : '— this upload would be rejected as a duplicate.';
    log(`   ❌ ${finding.store} ${finding.message} ${suffix}`, 'red');
  }
  for (const finding of behind) {
    log(`   ⚠️  ${finding.store} ${finding.message} — you may be deploying an older version.`, 'yellow');
  }

  return { duplicates, behind };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function missingCredentialKeys(env) {
  const missing = [];
  if (HAS_CHROME) {
    for (const key of CHROME_KEYS) if (!env[key]?.trim()) missing.push(key);
  }
  if (HAS_FIREFOX) {
    for (const key of FIREFOX_KEYS) if (!env[key]?.trim()) missing.push(key);
  }
  return missing;
}

const CREDENTIAL_HELP = {
  CHROME_EXTENSION_ID:
    'CWS developer dashboard, or the 32-char ID in the item URL (e.g. ocfdgncpifmegplaglcnglhioflaimkd)',
  CHROME_CLIENT_ID:
    'Google Cloud Console > Credentials > OAuth client ID (type: Web application, with redirect URI https://developers.google.com/oauthplayground)',
  CHROME_CLIENT_SECRET: 'Same OAuth client (the secret is shown when you create it)',
  CHROME_REFRESH_TOKEN:
    'OAuth 2.0 Playground with your own client id/secret, scope https://www.googleapis.com/auth/chromewebstore',
  FIREFOX_JWT_ISSUER: 'https://addons.mozilla.org/developers/addon/api/key/',
  FIREFOX_JWT_SECRET: 'https://addons.mozilla.org/developers/addon/api/key/',
};

function reportMissingCredentials(missing) {
  log('❌ Credentials are incomplete — nothing was uploaded.', 'red');
  log('');
  if (!existsSync(ENV_FILE)) {
    log('No .env.submit file was found. Expected it at:', 'yellow');
    log(`  ${ENV_FILE}`, 'cyan');
    log('');
  }
  log('Missing or empty:', 'yellow');
  for (const key of missing) {
    log(`   • ${key}`, 'red');
    if (CREDENTIAL_HELP[key]) log(`     ↳ ${CREDENTIAL_HELP[key]}`, 'cyan');
  }
  log('');
  log('Fill these in .env.submit and re-run. See README.md for the full walkthrough.', 'yellow');
}

function showHelp() {
  log('Usage: node deploy.js [options]', 'bright');
  log('');
  log('Options:');
  log('  --dry-run       Check credentials and run the pre-flight checks, upload nothing');
  log('  --check         Run the duplicate checks only, then exit');
  log('  --force         Continue even if a store already has this version');
  log('  --skip-checks   Skip the store/duplicate checks entirely');
  log('  --chrome-only   Submit to the Chrome Web Store only');
  log('  --firefox-only  Submit to Firefox Add-ons only');
  log('  --yes, -y       Do not prompt (for CI); duplicate versions still abort');
  log('  --help, -h      Show this message');
}

async function main() {
  if (OPT.help) {
    showHelp();
    done(0);
  }

  const pkg = readPackageJson();
  const version = pkg.version;
  const base = `${pkg.name}-${version}`;

  const chromeZip = join('dist', `${base}-chrome.zip`);
  const firefoxZip = join('dist', `${base}-firefox.zip`);
  const firefoxSourcesZip = join('dist', `${base}-sources.zip`);

  const STORE_NAMES = { chrome: 'Chrome Web Store', firefox: 'Firefox Add-ons' };
  const storeLabel = STORES.map(s => STORE_NAMES[s]).join(' and ');

  log(`🚀 Deploying ${pkg.name} v${version}`, 'bright');
  log(`   Target: ${storeLabel}`, 'cyan');
  if (OPT.dryRun) log('   (dry run — nothing will be uploaded)', 'yellow');
  if (OPT.checkOnly) log('   (check only — no build, no upload)', 'yellow');

  const env = loadEnv();

  // publish-browser-extension auto-loads .env.submit from the working dir.
  // Credentials can also come from the environment (useful for CI).
  // --check is read-only, so it can run without credentials (Chrome will be skipped).
  if (!OPT.checkOnly) {
    const missing = missingCredentialKeys(env);
    if (missing.length) {
      reportMissingCredentials(missing);
      done(1);
    }
  }

  // Pre-flight duplicate detection, before spending time on a build.
  let duplicates = [];
  if (!OPT.skipChecks) {
    const { results, findings } = await runChecks(version, env);
    const report = printReport(version, results, findings);
    duplicates = report.duplicates;
  } else {
    log('\n⏭️  Skipping version checks (--skip-checks)', 'yellow');
  }

  // --check is read-only: report and exit without any override prompt.
  if (OPT.checkOnly) {
    if (duplicates.length) {
      log('\n❌ Duplicate version detected. Bump the version before deploying.', 'red');
      done(1);
    }
    log('\n✅ No duplicate version found — safe to deploy.', 'green');
    done(0);
  }

  if (duplicates.length && !OPT.force) {
    log('');
    log('❌ Refusing to deploy a version that already exists in a store.', 'red');
    log('   Bump the version first (npm run release), or re-run with --force.', 'yellow');

    const override = await askYesNo('Deploy the duplicate version anyway?', false);
    if (!override) done(1);
    log('⚠️  Continuing because you confirmed the override.', 'yellow');
  } else if (duplicates.length && OPT.force) {
    log('\n⚠️  Duplicate versions detected, continuing because --force was passed.', 'yellow');
  }

  // Build & zip so we always upload exactly what is on disk.
  log('\n📦 Step 1: Build and zip', 'yellow');
  exec('npm run zip');

  const neededZips = [];
  if (HAS_CHROME) neededZips.push(chromeZip);
  if (HAS_FIREFOX) neededZips.push(firefoxZip, firefoxSourcesZip);

  for (const zip of neededZips) {
    if (!existsSync(join(rootDir, zip))) {
      log(`❌ Expected build artifact not found: ${zip}`, 'red');
      done(1);
    }
  }

  // Optional dry run: validates credentials without uploading anything.
  let shouldDryRun = OPT.dryRun;
  if (!OPT.dryRun) {
    shouldDryRun = await askYesNo(
      '\n🧪 Run a dry run first (validates credentials, uploads nothing)?',
      true
    );
  }

  const submitArgs = ['npx wxt submit'];
  if (HAS_CHROME) {
    submitArgs.push(`--chrome-zip ${chromeZip}`);
  }
  if (HAS_FIREFOX) {
    submitArgs.push(`--firefox-zip ${firefoxZip}`);
    submitArgs.push(`--firefox-sources-zip ${firefoxSourcesZip}`);
    // The add-on id is public (it is baked into the built manifest), so pass it
    // explicitly when it is not already present in .env.submit.
    if (!env.FIREFOX_EXTENSION_ID?.trim()) {
      const firefoxId = resolveFirefoxExtensionId(env);
      if (firefoxId) submitArgs.push(`--firefox-extension-id ${firefoxId}`);
    }
  }

  if (shouldDryRun) {
    log('\n🧪 Step 2: Dry run', 'yellow');
    exec([...submitArgs, '--dry-run'].join(' '));
    log('✅ Dry run passed — credentials are valid and the zips were found.', 'green');

    if (OPT.dryRun) {
      log('\n🎉 Dry run complete. Nothing was uploaded.', 'bright');
      done(0);
    }
  }

  // Final confirmation before the real, irreversible submit.
  const proceed = await askYesNo(
    `\n🚀 Submit v${version} to ${storeLabel} for real?`,
    true
  );
  if (!proceed) {
    log('ℹ️  Aborted. Nothing was uploaded.', 'cyan');
    done(0);
  }

  log('\n🚀 Step 3: Submit to stores', 'yellow');
  exec(submitArgs.join(' '));

  // Record what we shipped so future runs can catch a repeat locally.
  recordDeployment(version, STORES);

  log('\n🎉 Deploy complete!', 'bright');
  log(`${storeLabel} will review the new version.`, 'green');
  log('');
  log(`   Version: ${version}`, 'cyan');
  log(`   Recorded in ${HISTORY_FILE.split('/').pop()}`, 'cyan');
  log('');
  log('Remember to commit the version bump and push a matching git tag.', 'yellow');

  done(0);
}

main().catch(error => {
  log(`❌ Deploy failed: ${error.message ?? error}`, 'red');
  done(1);
});

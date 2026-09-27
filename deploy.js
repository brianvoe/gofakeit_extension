#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = __dirname;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command) {
  log(`Running: ${command}`, 'cyan');
  execSync(command, { stdio: 'inherit', cwd: rootDir });
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  const version = pkg.version;
  const base = `${pkg.name}-${version}`;

  const chromeZip = join('dist', `${base}-chrome.zip`);
  const firefoxZip = join('dist', `${base}-firefox.zip`);
  const firefoxSourcesZip = join('dist', `${base}-sources.zip`);

  // publish-browser-extension auto-loads .env.submit from the working dir.
  // Credentials can also come from the environment (useful for CI later).
  const hasEnvFile = existsSync(join(rootDir, '.env.submit'));
  if (!hasEnvFile && !process.env.CHROME_CLIENT_ID) {
    log('❌ No credentials found.', 'red');
    log('');
    log('Run the interactive setup once to create a .env.submit file:', 'yellow');
    log('  npx wxt submit init', 'cyan');
    log('');
    log('It will ask for your Chrome Web Store and Firefox Add-ons credentials.', 'yellow');
    log('The file is gitignored and safe to keep locally.', 'yellow');
    process.exit(1);
  }

  log(`🚀 Deploying ${pkg.name} v${version}`, 'bright');
  if (dryRun) {
    log('   (dry run — credentials are checked, nothing is uploaded)', 'yellow');
  }

  log('\n📦 Step 1: Build and zip', 'yellow');
  run('npm run zip');

  for (const zip of [chromeZip, firefoxZip, firefoxSourcesZip]) {
    if (!existsSync(join(rootDir, zip))) {
      log(`❌ Expected build artifact not found: ${zip}`, 'red');
      process.exit(1);
    }
  }

  log('\n🚀 Step 2: Submit to stores', 'yellow');
  const args = [
    'npx wxt submit',
    `--chrome-zip ${chromeZip}`,
    `--firefox-zip ${firefoxZip}`,
    `--firefox-sources-zip ${firefoxSourcesZip}`,
  ];
  if (dryRun) {
    args.push('--dry-run');
  }
  run(args.join(' '));

  log('\n🎉 Deploy complete!', 'bright');
  log('Chrome Web Store and Firefox Add-ons will review the new version.', 'green');
  log('', 'reset');
  log(`   Version: ${version}`, 'cyan');
  log('', 'reset');
  log('Remember to commit the version bump and push a matching git tag.', 'yellow');
}

try {
  main();
} catch (error) {
  log(`❌ Deploy failed: ${error.message ?? error}`, 'red');
  process.exit(1);
}

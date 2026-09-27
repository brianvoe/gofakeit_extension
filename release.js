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

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    execSync(command, {
      stdio: 'inherit',
      cwd: rootDir,
      ...options,
    });
    return true;
  } catch (error) {
    log(`Command failed: ${command}`, 'red');
    log(`Exit code: ${error.status}`, 'red');
    return false;
  }
}

function execOutput(command) {
  return execSync(command, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function readPackageJson() {
  const packagePath = join(rootDir, 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf8'));
}

function writePackageJson(packageJson) {
  const packagePath = join(rootDir, 'package.json');
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

// A single readline interface for the whole run. Creating one per question
// drops any buffered input, which breaks non-interactive/piped usage.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function askYesNo(question) {
  return askQuestion(question).then(answer => {
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  });
}

function validateVersion(currentVersion, newVersion) {
  // Check if version format is valid (x.y.z)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(newVersion)) {
    log(
      '❌ Invalid version format. Please use format: x.y.z (e.g., 1.0.1)',
      'red'
    );
    return null;
  }

  const [major1, minor1, patch1] = currentVersion.split('.').map(Number);
  const [major2, minor2, patch2] = newVersion.split('.').map(Number);

  // Check if new version is greater than current
  if (major2 > major1) return 'major';
  if (major2 === major1 && minor2 > minor1) return 'minor';
  if (major2 === major1 && minor2 === minor1 && patch2 > patch1) return 'patch';

  log('❌ New version must be greater than current version', 'red');
  log(`   Current: ${currentVersion}`, 'yellow');
  log(`   New:     ${newVersion}`, 'yellow');
  return null;
}

function tagExists(tag) {
  try {
    execSync(`git rev-parse -q --verify "refs/tags/${tag}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

// dist is gitignored, so only the versioned metadata is committed
const RELEASE_PATHS = ['package.json', 'package-lock.json', 'CHANGELOG.md'];

function commitReleaseChanges(version) {
  const changes = execOutput(
    `git status --porcelain ${RELEASE_PATHS.join(' ')}`
  );

  if (!changes) {
    log('ℹ️  No release files to commit.', 'cyan');
    return true;
  }

  log(`   Staging: ${RELEASE_PATHS.join(', ')}`, 'cyan');
  if (!exec(`git add ${RELEASE_PATHS.join(' ')}`)) return false;
  if (!exec(`git commit -m "release - v${version}"`)) return false;
  log('✅ Release changes committed!', 'green');

  const otherChanges = execOutput('git status --porcelain');
  if (otherChanges) {
    log(
      '⚠️  Other uncommitted changes were not included in the release commit.',
      'yellow'
    );
  }

  return true;
}

async function createAndPushTag(version) {
  const tag = `v${version}`;

  if (tagExists(tag)) {
    log(`❌ Tag ${tag} already exists locally.`, 'red');
    return false;
  }

  const status = execOutput('git status --porcelain');
  if (status) {
    log(
      '⚠️  Uncommitted changes remain. The tag will point at the last commit only.',
      'yellow'
    );
  }

  log(`\n🏷️  Creating tag ${tag}...`, 'yellow');
  if (!exec(`git tag -a ${tag} -m "Release ${tag}"`)) return false;
  log(`✅ Tag ${tag} created!`, 'green');

  log('\n📤 Pushing commits and tag to remote...', 'yellow');
  if (!exec('git push')) return false;
  if (!exec(`git push origin ${tag}`)) return false;
  log(`✅ Tag ${tag} pushed to remote!`, 'green');

  return true;
}

async function main() {
  log('🚀 Starting release process...', 'bright');

  // Step 1: Run tests
  log('\n📋 Step 1: Running tests...', 'yellow');
  if (!exec('npm test')) {
    log('❌ Tests failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Tests passed!', 'green');

  // Step 2: Confirm changelog update
  log('\n📚 Step 2: Changelog confirmation...', 'yellow');
  log('   Please add an entry for this release to CHANGELOG.md.', 'cyan');

  let changelogConfirmed = false;
  do {
    changelogConfirmed = await askYesNo(
      'Have you updated CHANGELOG.md for this release? (y/n): '
    );

    if (!changelogConfirmed) {
      log('❌ Please update CHANGELOG.md before continuing.', 'red');
    }
  } while (!changelogConfirmed);

  log('✅ Changelog update confirmed!', 'green');

  // Step 3: Get current version and ask for new version
  const packageJson = readPackageJson();
  const currentVersion = packageJson.version;

  log(`\n📦 Current version: ${currentVersion}`, 'blue');
  log('   Format: x.y.z (e.g., 1.0.1, 1.1.0, 2.0.0)', 'cyan');

  let newVersion;
  let versionType;

  do {
    newVersion = await askQuestion(
      `Enter new version (current: ${currentVersion}): `
    );
    versionType = validateVersion(currentVersion, newVersion);
  } while (!versionType);

  log(
    `\n🔄 Step 3: Updating version from ${currentVersion} to ${newVersion} (${versionType} release)...`,
    'yellow'
  );

  // Update package.json
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  log('✅ Package.json updated!', 'green');

  // Update package-lock.json to match the new version
  log('Updating package-lock.json...', 'cyan');
  if (!exec('npm install --package-lock-only')) {
    log('❌ Failed to update package-lock.json. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Package-lock.json updated!', 'green');

  // Step 4: Clean previous builds
  log('\n🧹 Step 4: Cleaning previous builds...', 'yellow');
  if (!exec('npm run clean')) {
    log('❌ Clean failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Cleaned previous builds!', 'green');

  // Step 5: Build extensions
  log('\n🔨 Step 5: Building extensions...', 'yellow');
  if (!exec('npm run build')) {
    log('❌ Build failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Extensions built successfully!', 'green');

  // Step 6: Create zip files
  log('\n📦 Step 6: Creating zip files...', 'yellow');
  if (!exec('npm run zip')) {
    log('❌ Zip creation failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Zip files created successfully!', 'green');

  // Step 7: Show results
  const base = `gofakeit-extension-${newVersion}`;
  log('\n🎉 Release built successfully!', 'bright');
  log(`📋 Version: ${newVersion}`, 'green');
  log('📁 Build artifacts:', 'blue');
  log('   - dist/chrome-mv3/ (Chrome extension)', 'cyan');
  log('   - dist/firefox-mv2/ (Firefox extension)', 'cyan');
  log('📦 Zip files:', 'blue');
  log(`   - dist/${base}-chrome.zip`, 'cyan');
  log(`   - dist/${base}-firefox.zip`, 'cyan');
  log(`   - dist/${base}-sources.zip`, 'cyan');

  // Step 8: Commit version bump
  log('\n📝 Step 8: Committing release changes to git...', 'yellow');
  if (!commitReleaseChanges(newVersion)) {
    log('❌ Failed to commit release changes.', 'red');
    process.exit(1);
  }

  // Step 9: Optional store deploy
  log('\n🚀 Step 9: Publishing to the extension stores (optional)...', 'yellow');
  const hasCredentials =
    existsSync(join(rootDir, '.env.submit')) || Boolean(process.env.CHROME_CLIENT_ID);

  if (!hasCredentials) {
    log('ℹ️  No store credentials found (.env.submit). Skipping deploy.', 'cyan');
    log('   Run `npx wxt submit init` once, then `npm run deploy`.', 'cyan');
  } else {
    const shouldDeploy = await askYesNo(
      'Publish this version to Chrome Web Store and Firefox Add-ons now? (y/n): '
    );

    if (shouldDeploy) {
      if (!exec('npm run deploy')) {
        log('❌ Deploy failed. The version bump is committed; re-run `npm run deploy`.', 'red');
        process.exit(1);
      }
      log('✅ Submitted to both stores!', 'green');
    } else {
      log('ℹ️  Skipped deploy. Run `npm run deploy` when ready.', 'cyan');
    }
  }

  // Step 10: Optional git tag and push
  log('\n🏷️  Step 10: Git tag (optional)...', 'yellow');
  const shouldTag = await askYesNo(
    `Would you like to create and push git tag v${newVersion}? (y/n): `
  );

  if (shouldTag) {
    if (!(await createAndPushTag(newVersion))) {
      log('❌ Git tag step failed. You can tag and push manually.', 'red');
      process.exit(1);
    }
  } else {
    log('ℹ️  Skipped git tag. Tag and push manually when ready:', 'cyan');
    log(`   git tag -a v${newVersion} -m "Release v${newVersion}" && git push origin v${newVersion}`, 'cyan');
  }

  log('\n🚀 Release complete!', 'bright');
  log(`   Version ${newVersion} is staged for the stores.`, 'green');

  rl.close();
}

// Handle errors
process.on('unhandledRejection', error => {
  log(`❌ Unhandled error: ${error}`, 'red');
  process.exit(1);
});

// Run the release script
main().catch(error => {
  log(`❌ Release failed: ${error}`, 'red');
  process.exit(1);
});

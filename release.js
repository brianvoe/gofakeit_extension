#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
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

function readPackageJson() {
  const packagePath = join(rootDir, 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf8'));
}

function writePackageJson(packageJson) {
  const packagePath = join(rootDir, 'package.json');
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
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

async function main() {
  log('🚀 Starting release process...', 'bright');

  // Step 1: Run tests
  log('\n📋 Step 1: Running tests...', 'yellow');
  if (!exec('npm test')) {
    log('❌ Tests failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Tests passed!', 'green');

  // Step 2: Get current version and ask for new version
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
    `\n🔄 Step 2: Updating version from ${currentVersion} to ${newVersion} (${versionType} release)...`,
    'yellow'
  );

  // Update package.json
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  log('✅ Package.json updated!', 'green');

  // Update wxt.config.ts version
  log('Updating wxt.config.ts...', 'cyan');
  const wxtConfigPath = join(rootDir, 'wxt.config.ts');
  let wxtConfig = readFileSync(wxtConfigPath, 'utf8');
  
  // Update the version in wxt.config.ts (remove patch version for extension)
  const extensionVersion = newVersion.split('.').slice(0, 2).join('.');
  wxtConfig = wxtConfig.replace(
    /version:\s*['"][^'"]*['"]/,
    `version: '${extensionVersion}'`
  );
  
  writeFileSync(wxtConfigPath, wxtConfig);
  log('✅ Wxt.config.ts updated!', 'green');

  // Step 3: Clean previous builds
  log('\n🧹 Step 3: Cleaning previous builds...', 'yellow');
  if (!exec('npm run clean')) {
    log('❌ Clean failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Cleaned previous builds!', 'green');

  // Step 4: Build extensions
  log('\n🔨 Step 4: Building extensions...', 'yellow');
  if (!exec('npm run build')) {
    log('❌ Build failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Extensions built successfully!', 'green');

  // Step 5: Create zip files
  log('\n📦 Step 5: Creating zip files...', 'yellow');
  if (!exec('npm run zip')) {
    log('❌ Zip creation failed. Aborting release.', 'red');
    process.exit(1);
  }
  log('✅ Zip files created successfully!', 'green');

  // Step 6: Show results
  log('\n🎉 Release completed successfully!', 'bright');
  log(`📋 Version: ${newVersion}`, 'green');
  log('📁 Build artifacts:', 'blue');
  log('   - dist/chrome-mv3/ (Chrome extension)', 'cyan');
  log('   - dist/firefox-mv2/ (Firefox extension)', 'cyan');
  log('📦 Zip files:', 'blue');
  log('   - dist/gofakeit-extension-1.0-chrome.zip', 'cyan');
  log('   - dist/gofakeit-extension-1.0-firefox.zip', 'cyan');
  log('   - dist/gofakeit-extension-1.0-sources.zip', 'cyan');
  
  log('\n🚀 Ready for deployment!', 'bright');
  log('💡 Next steps:', 'yellow');
  log('   1. Test the built extensions', 'cyan');
  log('   2. Upload to Chrome Web Store', 'cyan');
  log('   3. Upload to Firefox Add-ons', 'cyan');
  log('   4. Commit and push changes', 'cyan');
  log(`   5. Create a git tag: git tag v${newVersion}`, 'cyan');
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
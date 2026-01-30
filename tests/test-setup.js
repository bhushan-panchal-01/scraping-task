/**
 * Test Setup Script
 * Run this to verify your configuration before starting the full application
 */

const fs = require('fs');
const path = require('path');

console.log('========== Testing Setup ==========\n');

// Test 1: Check if .env file exists
console.log('1. Checking .env file...');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✓ .env file found');
} else {
  console.log('   ✗ .env file NOT found - please create it from .env.example');
  process.exit(1);
}

// Test 2: Load and validate environment variables
console.log('\n2. Validating environment variables...');
require('dotenv').config({ path: envPath });

const requiredVars = ['RAPIDAPI_KEY'];
let allPresent = true;

requiredVars.forEach(varName => {
  if (process.env[varName] && process.env[varName] !== 'your_rapidapi_key_here') {
    console.log(`   ✓ ${varName} is set`);
  } else {
    console.log(`   ✗ ${varName} is missing or not configured`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.log('\n   Please update your .env file with valid API keys');
  process.exit(1);
}

// Test 3: Check data file (CSV or Excel)
console.log('\n3. Checking data file...');
const csvPath = process.env.INFLUENCER_CSV_PATH || './influencers.csv';
const excelPath = process.env.EXCEL_FILE_PATH || './influencer names.xlsx';
const fullCsvPath = path.resolve(csvPath);
const fullExcelPath = path.resolve(excelPath);

if (fs.existsSync(fullCsvPath)) {
  console.log(`   ✓ CSV file found at: ${fullCsvPath}`);
  const stats = fs.statSync(fullCsvPath);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('   Using CSV format (recommended)');
} else if (fs.existsSync(fullExcelPath)) {
  console.log(`   ✓ Excel file found at: ${fullExcelPath}`);
  const stats = fs.statSync(fullExcelPath);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('   Using Excel format (legacy - consider migrating to CSV)');
} else {
  console.log(`   ✗ Data file NOT found`);
  console.log(`   Expected CSV: ${fullCsvPath}`);
  console.log(`   Or Excel: ${fullExcelPath}`);
  console.log('   Please create influencers.csv with columns: username,platform,average views');
  process.exit(1);
}

// Test 4: Check directory structure
console.log('\n4. Checking directory structure...');
const requiredDirs = [
  'src/config',
  'src/services/fileIO',
  'src/services/scrapers',
  'src/jobs',
  'src/utils',
  'logs',
  'backups',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ ${dir}`);
  } else {
    console.log(`   ✗ ${dir} missing`);
  }
});

// Test 5: Check dependencies
console.log('\n5. Checking dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = [
  'axios',
  'winston',
  'node-cron',
  'dotenv',
  'p-limit',
  'csv-parse',
  'csv-stringify',
];

// Optional dependencies (only needed for Excel support)
const optionalDeps = ['exceljs'];

const installedDeps = Object.keys(packageJson.dependencies || {});
let allInstalled = true;

requiredDeps.forEach(dep => {
  if (installedDeps.includes(dep)) {
    console.log(`   ✓ ${dep}`);
  } else {
    console.log(`   ✗ ${dep} not found`);
    allInstalled = false;
  }
});

if (!allInstalled) {
  console.log('\n   Please run: npm install');
  process.exit(1);
}

// Check optional dependencies
console.log('\n   Optional dependencies (for Excel support):');
optionalDeps.forEach(dep => {
  if (installedDeps.includes(dep)) {
    console.log(`   ✓ ${dep} (Excel support available)`);
  } else {
    console.log(`   - ${dep} (not installed - Excel support disabled, CSV only)`);
  }
});

// Test 6: Validate cron expression
console.log('\n6. Validating cron schedule...');
const cron = require('node-cron');
const cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *';

if (cron.validate(cronSchedule)) {
  console.log(`   ✓ Cron schedule is valid: ${cronSchedule}`);
} else {
  console.log(`   ✗ Invalid cron schedule: ${cronSchedule}`);
  process.exit(1);
}

// Test 7: Test file reading (CSV or Excel)
console.log('\n7. Testing data file reading...');
(async () => {
  try {
    const FileReaderFactory = require('../src/services/fileIO/fileReaderFactory');
    const reader = FileReaderFactory.create();

    const influencers = await reader.readInfluencers();
    console.log(`   ✓ Successfully read ${influencers.length} influencers`);

    if (influencers.length > 0) {
      console.log(`   First influencer: ${influencers[0].username} (${influencers[0].platform})`);
    }

    // Show platform breakdown
    const platformCounts = influencers.reduce((acc, inf) => {
      acc[inf.platform] = (acc[inf.platform] || 0) + 1;
      return acc;
    }, {});

    console.log('   Platform breakdown:');
    Object.entries(platformCounts).forEach(([platform, count]) => {
      console.log(`     - ${platform}: ${count}`);
    });

    console.log('\n========== All Tests Passed! ==========');
    console.log('\nYou can now run:');
    console.log('  - npm run scrape-now    (run once)');
    console.log('  - npm start             (start scheduler)');
    console.log('  - pm2 start ecosystem.config.js  (production)');
  } catch (error) {
    console.log(`   ✗ Error reading data file: ${error.message}`);
    process.exit(1);
  }
})();

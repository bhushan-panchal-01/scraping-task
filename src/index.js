const cron = require('node-cron');
const logger = require('./utils/logger');
const config = require('./config/config');
const ScrapingJob = require('./jobs/scrapingJob');
const browserManager = require('./services/browser/browserManager');
const fs = require('fs');
const path = require('path');

// Check if data file exists
const dataFilePath = config.paths.dataFile;
const fileExt = path.extname(dataFilePath).toLowerCase();

if (fileExt === '.csv') {
  // For CSV, check if influencers file exists (posts.csv will be created automatically)
  const influencersExist = fs.existsSync(config.paths.csvInfluencers);
  const postsExist = fs.existsSync(config.paths.csvPosts);

  if (!influencersExist) {
    logger.error(`Influencers CSV file not found at: ${config.paths.csvInfluencers}`);
    logger.error('Please create influencers.csv with columns: username,platform,average views');
    process.exit(1);
  } else {
    logger.info(`Using CSV format: ${config.paths.csvInfluencers}`);
    if (postsExist) {
      logger.info(`Found existing posts file: ${config.paths.csvPosts}`);
    } else {
      logger.info(`Posts CSV will be created at: ${config.paths.csvPosts}`);
    }
  }
} else {
  // For Excel (legacy), check if file exists
  if (!fs.existsSync(dataFilePath)) {
    logger.error(`Data file not found at: ${dataFilePath}`);
    logger.error('Please ensure the data file exists in the project');
    logger.info(`Tip: CSV format is recommended. Create influencers.csv or set INFLUENCER_CSV_PATH in .env`);
    process.exit(1);
  } else {
    logger.info(`Using Excel format (legacy): ${dataFilePath}`);
    logger.warn('Excel format is legacy. Consider migrating to CSV format for better performance.');
  }
}

// Create job instance
const scrapingJob = new ScrapingJob();

// Check if running in "run once" mode
const runOnce = process.argv.includes('--run-once');

/**
 * Execute the scraping job
 */
async function executeJob() {
  try {
    logger.info('Executing scraping job...');
    const summary = await scrapingJob.run();

    console.log('\n========== Job Summary ==========');
    console.log(`Total Influencers: ${summary.totalInfluencers}`);
    console.log(`Successful: ${summary.successCount}`);
    console.log(`Failed: ${summary.failureCount}`);
    console.log(`Total Posts Fetched: ${summary.totalPosts}`);
    console.log(`New Posts Added: ${summary.newPosts}`);
    console.log(`Posts Updated: ${summary.updatedPosts}`);
    console.log(`Duration: ${summary.duration}`);

    if (summary.errors.length > 0) {
      console.log('\n========== Errors ==========');
      summary.errors.forEach(err => {
        console.log(`- ${err.platform}/${err.username}: ${err.error}`);
      });
    }

    console.log('=================================\n');

    if (runOnce) {
      logger.info('Run-once mode completed, exiting...');
      process.exit(0);
    }
  } catch (error) {
    logger.error(`Job execution failed: ${error.message}`);

    if (runOnce) {
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Close browser if running
    if (browserManager.isRunning()) {
      logger.info('Closing browser...');
      await browserManager.closeBrowser();
    }

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main entry point
async function main() {
  logger.info('========== Scraping API Started ==========');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Data file: ${config.paths.dataFile}`);
  logger.info(`Log directory: ${config.paths.logDir}`);
  logger.info(`Backup directory: ${config.paths.backupDir}`);
  logger.info(`TikTok scraping method: ${config.scraping.tiktok.method}`);
  logger.info(`Instagram scraping method: ${config.scraping.instagram.method}`);

  if (runOnce) {
    logger.info('Running in "run-once" mode');
    await executeJob();
  } else {
    logger.info(`Cron schedule: ${config.cronSchedule}`);

    // Validate cron expression (supports both 5-field and 6-field with seconds)
    if (!cron.validate(config.cronSchedule)) {
      logger.error(`Invalid cron schedule: ${config.cronSchedule}`);
      logger.error('Cron format: [second] minute hour day month day-of-week');
      logger.error('Examples: "*/20 * * * * *" (every 20 seconds) or "*/30 * * * *" (every 30 minutes)');
      process.exit(1);
    }

    // Schedule the job
    cron.schedule(config.cronSchedule, async () => {
      logger.info('Cron triggered, executing job...');
      await executeJob();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });

    logger.info('Cron scheduler started successfully');
    logger.info('Press Ctrl+C to stop');

    // Optionally run immediately on startup
    const runOnStartup = process.env.RUN_ON_STARTUP === 'true';
    if (runOnStartup) {
      logger.info('Running job immediately on startup...');
      await executeJob();
    }
  }

  setupGracefulShutdown();
}

// Start the application
main().catch(error => {
  logger.error(`Application startup failed: ${error.message}`);
  process.exit(1);
});

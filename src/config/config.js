require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Conditional validation based on scraping method
const instagramMethod = process.env.INSTAGRAM_SCRAPING_METHOD ||
                        process.env.SCRAPING_METHOD ||
                        'rapidapi';
const tiktokMethod = process.env.TIKTOK_SCRAPING_METHOD ||
                     process.env.SCRAPING_METHOD ||
                     'web';

// Validate RapidAPI key only if Instagram uses rapidapi
if (instagramMethod === 'rapidapi') {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error(
      'RAPIDAPI_KEY is required when INSTAGRAM_SCRAPING_METHOD=rapidapi\n' +
      'Please add RAPIDAPI_KEY to your .env file'
    );
  }
}

// Validate Meta API credentials if Instagram uses meta
if (instagramMethod === 'meta') {
  const metaVars = ['INSTAGRAM_META_ACCESS_TOKEN', 'INSTAGRAM_META_USER_ID'];
  const missingMetaVars = metaVars.filter(v => !process.env[v]);
  if (missingMetaVars.length > 0) {
    throw new Error(
      `Missing Meta API variables: ${missingMetaVars.join(', ')}\n` +
      'Required when INSTAGRAM_SCRAPING_METHOD=meta\n' +
      'See .env.example for setup instructions'
    );
  }
}

// Block TikTok RapidAPI with clear migration message
if (tiktokMethod === 'rapidapi') {
  throw new Error(
    'TikTok RapidAPI is no longer supported.\n' +
    'Please set TIKTOK_SCRAPING_METHOD=web in your .env file\n' +
    'Web scraping provides more reliable TikTok data.'
  );
}

const config = {
  // RapidAPI Configuration
  rapidApi: {
    key: process.env.RAPIDAPI_KEY || '',
    tiktokHost: process.env.TIKTOK_API_HOST || 'tiktok-scraper7.p.rapidapi.com',
    instagramHost: process.env.INSTAGRAM_API_HOST || 'instagram-scraper-api2.p.rapidapi.com',
  },

  // Meta API Configuration (for Instagram)
  metaApi: {
    instagram: {
      accessToken: process.env.INSTAGRAM_META_ACCESS_TOKEN || '',
      userId: process.env.INSTAGRAM_META_USER_ID || '',
      apiVersion: process.env.INSTAGRAM_META_API_VERSION || 'v21.0',
    },
  },

  // Scraping Configuration
  scraping: {
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 3,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    postsToFetch: 10, // Number of recent posts to fetch per influencer

    // Scraping method: 'rapidapi' or 'web'
    method: process.env.SCRAPING_METHOD || 'rapidapi',

    // Platform-specific method overrides
    tiktok: {
      method: process.env.TIKTOK_SCRAPING_METHOD || process.env.SCRAPING_METHOD || 'web',
    },
    instagram: {
      method: process.env.INSTAGRAM_SCRAPING_METHOD || process.env.SCRAPING_METHOD || 'rapidapi',
    },
  },

  // Web Scraping Configuration
  webScraping: {
    // Instagram Authentication (for web scraping)
    instagram: {
      // Cookie-based authentication (optional)
      // Get cookies by logging into Instagram in browser, then copy cookies
      // Format: "sessionid=xxx; csrftoken=xxx; ds_user_id=xxx"
      cookies: process.env.INSTAGRAM_COOKIES || '',
      // Or use session storage path (alternative method)
      sessionPath: process.env.INSTAGRAM_SESSION_PATH || '',
    },

    // Proxy Settings
    // Proxy is optional - only enabled when PROXY_ENABLED=true
    // For testing, proxy is not required (VPN can be used for TikTok)
    // For server environment, use the provided proxy to avoid rate limits
    proxy: {
      enabled: process.env.PROXY_ENABLED === 'true',
      host: process.env.PROXY_HOST || 'us.decodo.com',
      port: parseInt(process.env.PROXY_PORT) || 10001,
      username: process.env.PROXY_USERNAME || 'bhushan',
      password: process.env.PROXY_PASSWORD || 'Qz2q2ovEF7h2~Lkept',
    },

    // Browser Settings
    browser: {
      headless: process.env.HEADLESS_MODE !== 'false', // Default true
      timeout: parseInt(process.env.BROWSER_TIMEOUT) || 60000,
      viewport: {
        width: parseInt(process.env.VIEWPORT_WIDTH) || 1920,
        height: parseInt(process.env.VIEWPORT_HEIGHT) || 1080,
      },
      userAgent: process.env.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },

    // Anti-Detection Settings
    delays: {
      min: parseInt(process.env.MIN_DELAY_MS) || 1000,
      max: parseInt(process.env.MAX_DELAY_MS) || 3000,
    },
  },

  // Cron Schedule
  cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *', // Every 6 hours by default

  // Instagram Modal Enrichment (for web scraping)
  instagramModalEnrichment: {
    enabled: process.env.INSTAGRAM_ENABLE_MODAL_ENRICHMENT !== 'false', // Default: enabled
    maxPosts: parseInt(process.env.INSTAGRAM_MAX_MODAL_ENRICHMENT) || 15, // Limit to avoid rate limiting
  },

  // File Paths
  paths: {
    // Primary data file (auto-detected by extension)
    // Defaults to CSV format - uses influencers.csv for detection
    // Priority: 1. DATA_FILE_PATH, 2. INFLUENCER_CSV_PATH, 3. CSV default, 4. Excel (legacy)
    dataFile: (() => {
      if (process.env.DATA_FILE_PATH) {
        return path.resolve(process.env.DATA_FILE_PATH);
      }
      if (process.env.INFLUENCER_CSV_PATH) {
        return path.resolve(process.env.INFLUENCER_CSV_PATH);
      }
      // Check if CSV file exists, otherwise fall back to Excel (legacy)
      const csvPath = path.resolve('./influencers.csv');
      if (fs.existsSync(csvPath)) {
        return csvPath;
      }
      // Only use Excel if CSV doesn't exist AND EXCEL_FILE_PATH is explicitly set
      if (process.env.EXCEL_FILE_PATH) {
        return path.resolve(process.env.EXCEL_FILE_PATH);
      }
      // Default to CSV (will be created if needed)
      return csvPath;
    })(),

    // Legacy Excel support (for backward compatibility - CSV is now default)
    // Only used when Excel files (.xlsx) are explicitly provided via EXCEL_FILE_PATH
    excelFile: path.resolve(process.env.EXCEL_FILE_PATH || './influencer names.xlsx'),

    // CSV-specific paths (for dual-file CSV mode)
    csvInfluencers: path.resolve(process.env.INFLUENCER_CSV_PATH || './influencers.csv'),
    csvPosts: path.resolve(process.env.POSTS_CSV_PATH || './posts.csv'),

    backupDir: path.resolve(process.env.BACKUP_DIR || './backups'),
    logDir: path.resolve(process.env.LOG_DIR || './logs'),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Excel Sheet Names
  sheets: {
    main: 'main',
    postLink: 'post link',
  },
};

module.exports = config;

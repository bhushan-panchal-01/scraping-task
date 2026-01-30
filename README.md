# TikTok & Instagram Influencer Scraping API

Automated scraping system for collecting influencer data from TikTok and Instagram with scheduled updates.

## Features

### Core Features
- Scrapes influencer data from TikTok and Instagram
- **Multiple scraping methods**:
  - **Instagram**: RapidAPI, Web scraping, or Meta Graph API (official)
  - **TikTok**: Web scraping (browser-based)
- **Flexible file formats**: Excel (.xlsx) or CSV (.csv) with auto-detection
- Calculates average views from the last 10 posts per influencer
- Automatic data updates with scheduled execution
- Automatic backup before each update
- Robust error handling and retry logic
- Concurrency control to avoid rate limiting
- Comprehensive logging

### Web Scraping Features (NEW)
- **Browser automation** using Puppeteer with stealth mode
- **Proxy support** for accessing restricted regions (TikTok in India)
- **Anti-detection** measures (random delays, user agent spoofing)
- **Configurable per platform** (TikTok via web, Instagram via API)

### CSV Support (NEW)
- **Auto-detect file format** based on extension (.xlsx or .csv)
- **Two-file CSV structure**: influencers.csv + posts.csv
- **Backward compatible** with existing Excel setup
- Same data interface for both formats

## Project Structure

```
data-scrapping-api/
├── src/
│   ├── config/
│   │   └── config.js               # Enhanced with web scraping & CSV config
│   ├── services/
│   │   ├── browser/                # NEW: Browser management
│   │   │   ├── browserManager.js  # Puppeteer browser lifecycle
│   │   │   └── proxyConfig.js     # Proxy configuration helper
│   │   ├── fileIO/                 # NEW: Format-agnostic I/O
│   │   │   ├── baseReader.js      # Abstract reader interface
│   │   │   ├── baseWriter.js      # Abstract writer interface
│   │   │   ├── excelReader.js     # Excel implementation
│   │   │   ├── excelWriter.js     # Excel implementation
│   │   │   ├── csvReader.js       # CSV implementation
│   │   │   ├── csvWriter.js       # CSV implementation
│   │   │   ├── fileReaderFactory.js # Factory pattern
│   │   │   └── fileWriterFactory.js # Factory pattern
│   │   ├── excel/                  # Legacy (for backward compatibility)
│   │   │   ├── excelReader.js
│   │   │   └── excelWriter.js
│   │   └── scrapers/
│   │       ├── strategies/         # NEW: Strategy pattern
│   │       │   ├── scrapingStrategy.js      # Abstract strategy
│   │       │   ├── rapidApiStrategy.js      # RapidAPI strategy
│   │       │   ├── webScraperStrategy.js    # Web scraping base
│   │       │   ├── tiktokWebStrategy.js     # TikTok web scraping
│   │       │   ├── instagramWebStrategy.js  # Instagram web scraping
│   │       │   └── scraperStrategyFactory.js # Strategy factory
│   │       ├── baseScraper.js     # Strategy-aware base class
│   │       ├── tiktokScraper.js   # Uses strategy pattern
│   │       └── instagramScraper.js # Uses strategy pattern
│   ├── jobs/
│   │   └── scrapingJob.js         # Uses file factories
│   ├── utils/
│   │   ├── logger.js              # Winston logging
│   │   └── dataProcessor.js       # Calculate avg, deduplicate
│   └── index.js                   # Entry point with browser cleanup
├── logs/                          # Log files
├── backups/                       # Data file backups
├── .env                          # API keys & configuration
└── influencer names.xlsx         # Excel data file (OR CSV files)
    OR influencers.csv + posts.csv
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- **For Instagram RapidAPI method**: RapidAPI account with Instagram API access
- **For Instagram Meta API method**: Meta Developer account with Instagram Graph API (see Instagram Meta API Setup below)
- **For TikTok**: Proxy service recommended for restricted regions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Configuration:**
```bash
# For Instagram RapidAPI method
INSTAGRAM_SCRAPING_METHOD=rapidapi
RAPIDAPI_KEY=your_actual_rapidapi_key_here

# OR for Instagram Meta API method
INSTAGRAM_SCRAPING_METHOD=meta
INSTAGRAM_META_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_META_USER_ID=your_instagram_business_account_id

# OR for Instagram web scraping
INSTAGRAM_SCRAPING_METHOD=web

# For TikTok (web scraping only)
TIKTOK_SCRAPING_METHOD=web
PROXY_ENABLED=true
PROXY_HOST=your.proxy.host
PROXY_PORT=8080
```

**Scraping Method Configuration:**
- `SCRAPING_METHOD`: Global default ('rapidapi', 'web', or 'meta')
- `INSTAGRAM_SCRAPING_METHOD`: Options: 'rapidapi', 'web', or 'meta'
- `TIKTOK_SCRAPING_METHOD`: Only 'web' supported (RapidAPI no longer available)

**Proxy Settings (for web scraping):**
- `PROXY_ENABLED`: Enable/disable proxy (true/false)
- `PROXY_HOST`: Proxy server hostname
- `PROXY_PORT`: Proxy server port
- `PROXY_USERNAME`: Proxy username (optional)
- `PROXY_PASSWORD`: Proxy password (optional)

**File Format Configuration:**
- `DATA_FILE_PATH`: Path to data file (.xlsx or .csv)
- `INFLUENCER_CSV_PATH`: CSV influencers file (if using CSV)
- `POSTS_CSV_PATH`: CSV posts file (if using CSV)

**Other Settings:**
- `CRON_SCHEDULE`: Cron expression (default: every 6 hours)
- `MAX_CONCURRENT_REQUESTS`: Concurrent requests (default: 3)
- `HEADLESS_MODE`: Run browser in headless mode (true/false)
- `BROWSER_TIMEOUT`: Browser timeout in ms (default: 60000)

### 3. Prepare Data File

**Option A: Excel Format (Default)**

Ensure `influencer names.xlsx` exists in the project root with:

**Sheet 1 ("main")**:
- Columns: `username`, `platform`, `average views` (optional)

**Sheet 2 ("post link")** (optional, will be created if missing):
- Columns: `username`, `post link`, `posted date`, `views`, `likes`, `share`

**Option B: CSV Format**

Create two CSV files:

**influencers.csv**:
```csv
username,platform,average views
@user1,tiktok,
@user2,instagram,
```

**posts.csv** (optional, will be created automatically):
```csv
username,platform,post link,posted date,views,likes,share
```

Set in `.env`:
```bash
DATA_FILE_PATH=./influencers.csv
# OR
INFLUENCER_CSV_PATH=./influencers.csv
POSTS_CSV_PATH=./posts.csv
```

### 4. Instagram Meta API Setup (Optional)

To use Instagram's official Meta Graph API:

**Requirements:**
- Instagram Business or Creator account (personal accounts NOT supported)
- Facebook Page connected to your Instagram account
- Meta Developer account

**Setup Steps:**

1. **Create a Meta App**
   - Go to [Meta Developers](https://developers.facebook.com)
   - Click "My Apps" → "Create App"
   - Choose app type: "Business" or "Consumer"
   - Fill in app details and create

2. **Add Instagram Graph API Product**
   - In your app dashboard, click "Add Product"
   - Find "Instagram Graph API" and click "Set Up"
   - Follow the setup wizard

3. **Connect Instagram Account**
   - Go to Instagram Graph API → Settings
   - Add your Instagram Business Account
   - Ensure it's connected to a Facebook Page

4. **Generate Access Token**
   - Go to Tools → Graph API Explorer
   - Select your app from dropdown
   - Add permissions: `instagram_basic`, `instagram_graph_user_profile`
   - Click "Generate Access Token"
   - **IMPORTANT**: Exchange for long-lived token (60-day validity)

   Use this command to exchange tokens:
   ```bash
   curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
   ```

5. **Get Instagram User ID**
   - In Graph API Explorer, query: `me/accounts`
   - Find your Instagram Business Account ID

6. **Configure .env**
   ```bash
   INSTAGRAM_SCRAPING_METHOD=meta
   INSTAGRAM_META_ACCESS_TOKEN=your_long_lived_access_token
   INSTAGRAM_META_USER_ID=your_instagram_business_account_id
   INSTAGRAM_META_API_VERSION=v21.0
   ```

**Rate Limits:**
- 200 requests per hour per Instagram user
- Each post requires 2 API calls (media + insights)
- For 10 posts: 11 API calls per user
- Can scrape ~18 users per hour

**Benefits:**
- Official API with stable data structure
- More reliable than web scraping
- No proxy required
- Direct access to insights (impressions/views)

**Limitations:**
- Requires Instagram Business/Creator account
- Lower rate limits compared to RapidAPI
- Requires token management (refresh every 60 days)

### 5. Choose Scraping Method

**Method 1: Instagram RapidAPI**

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to an Instagram API service (e.g., "Instagram Scraper API")
3. Copy your API key from the dashboard
4. Add it to `.env`:
```bash
INSTAGRAM_SCRAPING_METHOD=rapidapi
RAPIDAPI_KEY=your_key_here
```

**Method 2: Instagram Meta API (Official)**

See "Instagram Meta API Setup" section above for detailed instructions. Quick config:
```bash
INSTAGRAM_SCRAPING_METHOD=meta
INSTAGRAM_META_ACCESS_TOKEN=your_token
INSTAGRAM_META_USER_ID=your_user_id
```

**Method 3: Instagram Web Scraping**

No API keys required, but may be less reliable:
```bash
INSTAGRAM_SCRAPING_METHOD=web
```

**Method 4: TikTok Web Scraping**

TikTok only supports web scraping (RapidAPI no longer available):

1. Get a proxy service (recommended for restricted regions)
   - Recommended: Bright Data, Oxylabs, or Smartproxy
   - Ensure proxy supports HTTPS

2. Configure in `.env`:
```bash
TIKTOK_SCRAPING_METHOD=web
PROXY_ENABLED=true
PROXY_HOST=your.proxy.host
PROXY_PORT=8080
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password
```

**Method 5: Mixed (Recommended)**

Use the best method for each platform:
```bash
# Instagram via Meta API (official, reliable)
INSTAGRAM_SCRAPING_METHOD=meta
INSTAGRAM_META_ACCESS_TOKEN=your_token
INSTAGRAM_META_USER_ID=your_user_id

# TikTok via web scraping (only option)
TIKTOK_SCRAPING_METHOD=web
PROXY_ENABLED=true
PROXY_HOST=your.proxy.host
PROXY_PORT=8080
```

## Usage

### Run Once (Manual Execution)

```bash
npm run scrape-now
```

This will execute the scraping job once and exit.

### Run with Scheduler

```bash
npm start
```

This starts the cron scheduler. The job will run based on `CRON_SCHEDULE` in `.env`.

### Development Mode (with auto-restart)

```bash
npm run dev
```

## Cron Schedule Examples

Edit `CRON_SCHEDULE` in `.env`:

- Every 6 hours: `0 */6 * * *` (default)
- Every day at midnight: `0 0 * * *`
- Every 12 hours: `0 */12 * * *`
- Every Monday at 9 AM: `0 9 * * 1`
- Every 5 minutes (testing): `*/5 * * * *`

## Deployment with PM2

### Install PM2

```bash
npm install -g pm2
```

### Start Application

```bash
pm2 start src/index.js --name scraping-api
```

### View Logs

```bash
pm2 logs scraping-api
```

### Monitor

```bash
pm2 monit
```

### Auto-restart on System Reboot

```bash
pm2 startup
pm2 save
```

### Stop Application

```bash
pm2 stop scraping-api
```

## Logging

Logs are written to the `logs/` directory:

- `combined.log`: All logs (info, warn, error)
- `error.log`: Only error logs

Logs are automatically rotated when they reach 5MB (keeps last 5 files).

## Backups

Before each Excel file update, a backup is created in `backups/` with timestamp:
```
backups/influencer_names_backup_2024-01-15T10-30-45-123Z.xlsx
```

## Error Handling

- **Individual Failures**: If one influencer fails, others continue processing
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Rate Limiting**: Max 3 concurrent requests to avoid API limits
- **Graceful Degradation**: Partial results are saved even if some influencers fail
- **Alerts**: High failure rates (>50%) are logged as critical errors

## Excel File Updates

### Main Sheet
- Updates the `average views` column for each influencer
- Creates column if it doesn't exist

### Post Link Sheet
- Appends new posts
- Updates views/likes/shares for existing posts (matched by `post link`)
- Never deletes historical data

## Troubleshooting

### "Missing required environment variables" error
- Ensure `.env` file exists
- For Instagram RapidAPI: Set `RAPIDAPI_KEY`
- For Instagram Meta API: Set `INSTAGRAM_META_ACCESS_TOKEN` and `INSTAGRAM_META_USER_ID`
- For web scraping: Configure proxy settings if needed

### "Data file not found" error
- For Excel: Ensure file exists at `DATA_FILE_PATH`
- For CSV: Ensure `influencers.csv` exists
- Check file path in `.env` configuration

### "User not found" errors
- Verify usernames are correct in data file
- Check if accounts are public (private accounts may fail)
- For web scraping: Ensure proxy is working

### Proxy connection errors (web scraping)
- Verify proxy credentials are correct
- Test proxy connection separately
- Check if proxy supports HTTPS
- Ensure proxy has good coverage for target region

### Browser errors (web scraping)
- Install Chromium dependencies on Linux:
  ```bash
  sudo apt-get install -y chromium-browser
  ```
- Check `HEADLESS_MODE` setting in `.env`
- Increase `BROWSER_TIMEOUT` if needed
- Verify sufficient disk space for browser cache

### High failure rate
- **RapidAPI**: Check quota and subscription status
- **Web scraping**: Verify proxy is working and not blocked
- Check logs for specific error messages
- Try reducing `MAX_CONCURRENT_REQUESTS`

### Rate limit errors
- Reduce `MAX_CONCURRENT_REQUESTS` in `.env`
- Increase delays: `MIN_DELAY_MS` and `MAX_DELAY_MS`
- For RapidAPI: Upgrade subscription plan
- For web scraping: Use rotating proxies

### CSV file corruption
- Check backups in `backups/` directory
- Verify CSV format (proper headers, encoding)
- Restore from latest backup if needed

### Memory issues (web scraping)
- Browser uses significant memory (~150-300MB)
- Set `HEADLESS_MODE=true` to reduce usage
- Reduce `MAX_CONCURRENT_REQUESTS`
- Ensure browser cleanup on shutdown

### Instagram Meta API errors

**"Access token has expired" (Error code 190)**
- Long-lived tokens expire after 60 days
- Generate a new long-lived token from Meta Developer Dashboard
- Update `INSTAGRAM_META_ACCESS_TOKEN` in `.env`

**"Invalid parameter" (Error code 100)**
- Verify `INSTAGRAM_META_USER_ID` is correct
- Ensure it's an Instagram Business Account ID (not personal account)
- Check user ID in Graph API Explorer

**"API Too Many Calls" (Error code 4 or 17)**
- Rate limit is 200 requests/hour per user
- Reduce scraping frequency or number of posts
- Each post requires 2 API calls (media + insights)
- Wait for rate limit window to reset

**"Application does not have capability" (Error code 10)**
- Verify your Meta App has Instagram Graph API product enabled
- Check app permissions include `instagram_basic` and `instagram_graph_user_profile`
- Ensure Instagram account is connected to app

**Missing insights/views data**
- Some media types don't support insights (e.g., stories)
- Account needs to be Business or Creator type
- Recent posts may not have insights available yet
- System logs warning and continues with views=0

## API Response Variations

Different RapidAPI providers may return different response structures. The scrapers are designed to handle common variations, but you may need to adjust the `transformResponse` and `transformPost` methods in:

- `src/services/scrapers/tiktokScraper.js`
- `src/services/scrapers/instagramScraper.js`

Check the API documentation of your specific RapidAPI service and modify accordingly.

## Testing

Before running with all influencers:

1. Test with 2-3 influencers first
2. Run manually: `npm run scrape-now`
3. Check logs: `cat logs/combined.log`
4. Verify Excel file updates correctly
5. Compare data with actual profiles

## Cost Estimation

RapidAPI costs vary by provider and plan:

- **Basic Plan**: ~$10-30/month (limited requests)
- **Pro Plan**: ~$30-50/month (moderate usage)
- **Ultra Plan**: ~$50-100/month (high usage)

For 48 influencers × 10 posts × 4 times/day = ~1,920 requests/day

Choose a plan that supports your request volume with buffer.

## Support

For issues or questions:
1. Check logs in `logs/combined.log` and `logs/error.log`
2. Verify RapidAPI subscription is active
3. Test with a single influencer first
4. Check Excel file has correct format

## License

ISC

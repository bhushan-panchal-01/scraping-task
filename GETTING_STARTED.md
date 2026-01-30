# Getting Started

Welcome! This guide will help you set up and run the TikTok & Instagram influencer scraping application in just a few minutes.

## ✨ What's New

This version includes powerful new features:

- **🌐 Web Scraping**: Now works in India and restricted regions using browser automation
- **📊 CSV Support**: Use CSV files instead of Excel if you prefer
- **🔀 Flexible Configuration**: Mix and match scraping methods per platform
- **🛡️ Proxy Support**: Configure proxies for accessing restricted content
- **🔄 Backward Compatible**: Existing Excel + RapidAPI setup still works perfectly

## Prerequisites

- Node.js installed (v14 or higher) - check with `node --version`
- npm installed - check with `npm --version`
- **Choose ONE of these**:
  - **Option A**: RapidAPI account (recommended for most regions)
  - **Option B**: Proxy service (required for India/restricted regions when using web scraping)

## Step-by-Step Setup

### 1. Verify Installation

First, check that all dependencies are installed:

```bash
npm install
```

You should see "added 409 packages" or similar.

### 2. Choose Your Scraping Method

**Important**: You have two options depending on your location and needs.

#### Option A: RapidAPI (Recommended for most regions)

**Best for**: Users outside India, those wanting fastest setup

1. **Go to RapidAPI**: Visit [https://rapidapi.com](https://rapidapi.com)

2. **Sign Up**: Create a free account if you don't have one

3. **Subscribe to TikTok API**:
   - Search for "TikTok" in the RapidAPI marketplace
   - Find a service like "TikTok Scraper" or "TikTok API"
   - Click "Subscribe to Test"
   - Choose a plan (Basic is fine to start)
   - Note the API host name (e.g., `tiktok-scraper7.p.rapidapi.com`)

4. **Subscribe to Instagram API**:
   - Search for "Instagram" in the RapidAPI marketplace
   - Find a service like "Instagram Scraper API"
   - Click "Subscribe to Test"
   - Choose a plan (Basic is fine to start)
   - Note the API host name (e.g., `instagram-scraper-api2.p.rapidapi.com`)

5. **Get Your API Key**:
   - Go to your RapidAPI dashboard
   - Click on any API you subscribed to
   - Go to "Endpoints" tab
   - Look for "X-RapidAPI-Key" in the code examples
   - Copy this key (it's the same for all APIs)

#### Option B: Web Scraping with Proxy (For India/Restricted Regions)

**Best for**: Users in India where TikTok API is restricted

1. **Get a Proxy Service**:
   - Recommended providers:
     - **Bright Data** (brightdata.com) - Most reliable
     - **Smartproxy** (smartproxy.com) - Good balance
     - **Oxylabs** (oxylabs.io) - Premium option

2. **Subscribe to a Plan**:
   - Choose a plan with good India/Asia coverage
   - Residential proxies work best for TikTok
   - You'll need: host, port, username, password

3. **Test Your Proxy** (optional but recommended):
   ```bash
   curl -x http://username:password@proxy.host:port https://www.tiktok.com
   ```

4. **For Instagram**: Still use RapidAPI if available (faster and more reliable)

#### Option C: Mixed Setup (Best of Both Worlds)

Use web scraping for TikTok and RapidAPI for Instagram:
- Get a proxy service for TikTok
- Get RapidAPI key for Instagram
- Configure both in the next step

### 3. Configure Your Environment

Copy `.env.example` to `.env` if you haven't already:

```bash
cp .env.example .env
```

Now edit `.env` based on your chosen method:

#### For RapidAPI Only (Option A):

```bash
# RapidAPI Configuration
RAPIDAPI_KEY=your_actual_key_here
TIKTOK_API_HOST=tiktok-scraper7.p.rapidapi.com
INSTAGRAM_API_HOST=instagram-scraper-api2.p.rapidapi.com

# Scraping Method (optional - rapidapi is default)
SCRAPING_METHOD=rapidapi
```

#### For Web Scraping (Option B - India):

```bash
# TikTok via Web Scraping
TIKTOK_SCRAPING_METHOD=web

# Instagram via Web Scraping (or use RapidAPI if available)
INSTAGRAM_SCRAPING_METHOD=web

# Proxy Configuration (REQUIRED for web scraping)
PROXY_ENABLED=true
PROXY_HOST=your.proxy.host
PROXY_PORT=8080
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password

# Browser Settings
HEADLESS_MODE=true
BROWSER_TIMEOUT=60000
```

#### For Mixed Setup (Option C - Recommended for India):

```bash
# TikTok via Web Scraping
TIKTOK_SCRAPING_METHOD=web

# Instagram via RapidAPI (faster)
INSTAGRAM_SCRAPING_METHOD=rapidapi
RAPIDAPI_KEY=your_rapidapi_key_here
INSTAGRAM_API_HOST=instagram-scraper-api2.p.rapidapi.com

# Proxy Configuration (for TikTok)
PROXY_ENABLED=true
PROXY_HOST=your.proxy.host
PROXY_PORT=8080
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password
```

**Important**: Replace placeholder values with your actual credentials!

### 4. Prepare Your Data File

You can use either Excel or CSV format:

#### Option 1: Excel Format (Default)

Make sure `influencer names.xlsx` exists in the project folder. It should have:

- **Sheet 1** named "main" with columns: `username`, `platform`, `average views`
- **Sheet 2** named "post link" (will be created automatically if missing)

Check the file:
```bash
ls -lh "influencer names.xlsx"
```

#### Option 2: CSV Format (Alternative)

Create two CSV files:

**influencers.csv**:
```csv
username,platform,average views
@user1,tiktok,
@user2,instagram,
```

**posts.csv** (will be created automatically if missing):
```csv
username,platform,post link,posted date,views,likes,share
```

Then configure in `.env`:
```bash
DATA_FILE_PATH=./influencers.csv
# OR use separate paths:
INFLUENCER_CSV_PATH=./influencers.csv
POSTS_CSV_PATH=./posts.csv
```

**Note**: The application auto-detects format based on file extension (.xlsx or .csv)

### 5. Test Your Setup

Run the setup verification:

```bash
npm run test-setup
```

You should see all green checkmarks (✓). If you see any red X marks (✗), follow the error message to fix the issue.

### 6. First Test Run

Test with just 1-2 influencers first:

1. **Backup your Excel file**:

   ```bash
   cp "influencer names.xlsx" "influencer names.backup.xlsx"
   ```

2. **Open Excel and temporarily remove all but 2 influencers**

3. **Run the scraper**:

   ```bash
   npm run scrape-now
   ```

4. **Check the output**:
   - You should see a summary in the console
   - Check `logs/combined.log` for details
   - Open the Excel file and verify data was added

5. **If successful**, restore your full Excel file

### 7. Run with All Influencers

Once you've verified it works:

```bash
npm run scrape-now
```

This will process all influencers in your Excel file.

### 8. Start the Scheduler

To run automatically on schedule (every 6 hours by default):

```bash
npm start
```

The application will keep running and execute on schedule. Press `Ctrl+C` to stop.

## Quick Reference

### Common Commands

```bash
# Test your configuration
npm run test-setup

# Run once immediately
npm run scrape-now

# Start the scheduler
npm start

# Run in development mode (auto-restart on changes)
npm run dev

# Deploy with PM2
npm run pm2-start
npm run pm2-logs
npm run pm2-stop
```

### Check Logs

```bash
# View all logs
cat logs/combined.log

# View only errors
cat logs/error.log

# Follow logs in real-time
tail -f logs/combined.log
```

### Check Backups

```bash
# List all backups
ls -lh backups/
```

Backups are created automatically before each Excel update.

## What to Expect

### First Run Output

You should see something like:

```
========== Job Summary ==========
Total Influencers: 48
Successful: 45
Failed: 3
Total Posts Fetched: 450
New Posts Added: 423
Posts Updated: 27
Duration: 3.45s
=================================
```

### Data File Updates

After running:

**For Excel:**
1. **"main" sheet**: The "average views" column will be populated/updated
2. **"post link" sheet**: New posts will be added, existing posts updated

**For CSV:**
1. **influencers.csv**: The "average views" column will be populated/updated
2. **posts.csv**: New posts will be added, existing posts updated

### Performance

- **RapidAPI**: ~1-2 seconds per influencer
- **Web Scraping**: ~3-5 seconds per influencer (slower but works in restricted regions)

### Logs

Check `logs/combined.log` to see:

- When the job started/completed
- Which influencers were processed
- Any errors that occurred
- Summary statistics

## Troubleshooting Quick Fixes

### "Missing required environment variables"

→ Edit `.env` and add your RapidAPI key (for API method) or proxy settings (for web scraping)

### "Data file not found"

→ Make sure your data file exists:
  - For Excel: `influencer names.xlsx` in the project folder
  - For CSV: `influencers.csv` in the project folder

### "User not found" errors

→ Check usernames in your data file are correct (no typos, no @ symbol needed)

### "Rate limit exceeded"

→ Your API plan limit was reached. Wait or upgrade plan.

### No data in file

→ Check if the Excel file is open. Close it and try again.

### "Proxy connection failed" (web scraping)

→ Verify proxy credentials in `.env` are correct:
  - Test proxy with: `curl -x http://username:password@proxy.host:port https://www.tiktok.com`
  - Check proxy service is active
  - Ensure proxy supports HTTPS

### Browser errors (web scraping)

→ Install Chromium dependencies (Linux):
```bash
sudo apt-get install -y chromium-browser
```

### "Navigation timeout" (web scraping)

→ Increase timeout in `.env`:
```bash
BROWSER_TIMEOUT=90000
```

## Next Steps

1. **Monitor First Few Runs**: Watch the first few scheduled runs to ensure everything works

2. **Adjust Schedule**: Edit `CRON_SCHEDULE` in `.env` if you want different timing

3. **Production Deployment**: Use PM2 for production (see README.md)

4. **Customize Scrapers**: If needed, see API_INTEGRATION_NOTES.md

## Getting Help

- Check logs: `cat logs/error.log`
- Run test setup: `npm run test-setup`
- Review documentation:
  - `README.md` - Full documentation with web scraping & CSV info
  - `IMPLEMENTATION_SUMMARY.md` - Architecture and features overview
  - `VERIFICATION_CHECKLIST.md` - Testing checklist
  - `.env.example` - All configuration options explained

## Important Notes

- **Costs**:
  - RapidAPI: Monitor usage dashboard to avoid unexpected charges
  - Proxy: Monitor bandwidth usage if on metered plan
- **Data File**: Always keep a backup of your original data file (backups/ folder)
- **Private Accounts**: The scraper may fail for private accounts
- **Rate Limits**:
  - RapidAPI: Respect API rate limits
  - Web Scraping: Built-in delays help avoid detection
- **Data Accuracy**: Spot-check data against actual profiles periodically
- **Scraping Method**: Web scraping is slower but works in restricted regions
- **Browser Memory**: Web scraping uses ~150-300MB RAM for browser

## Success

Once you see successful runs and data in your Excel file, you're all set! The application will now:

- Run automatically on schedule
- Update your Excel file with fresh data
- Create backups before each update
- Log all activities
- Handle errors gracefully

Enjoy your automated influencer data collection! 🚀

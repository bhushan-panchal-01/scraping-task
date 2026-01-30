# How to Run and Test

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

Create a `.env` file in the project root with the following configuration:

#### For Testing (No Proxy):
```bash
# RapidAPI Configuration (Required for Instagram)
RAPIDAPI_KEY=your_rapidapi_key_here
INSTAGRAM_API_HOST=instagram-scraper-api2.p.rapidapi.com

# Scraping Methods
INSTAGRAM_SCRAPING_METHOD=rapidapi
TIKTOK_SCRAPING_METHOD=web

# Proxy Configuration (DISABLED for testing)
PROXY_ENABLED=false

# Optional: Other settings
MAX_CONCURRENT_REQUESTS=3
BROWSER_TIMEOUT=60000
HEADLESS_MODE=true
```

#### For Production/Server (With Proxy):
```bash
# RapidAPI Configuration (Required for Instagram)
RAPIDAPI_KEY=your_rapidapi_key_here
INSTAGRAM_API_HOST=instagram-scraper-api2.p.rapidapi.com

# Scraping Methods
INSTAGRAM_SCRAPING_METHOD=rapidapi
TIKTOK_SCRAPING_METHOD=web

# Proxy Configuration (ENABLED for server)
PROXY_ENABLED=true
# Proxy credentials are already set as defaults in config.js:
# PROXY_HOST=us.decodo.com
# PROXY_PORT=10001
# PROXY_USERNAME=bhushan
# PROXY_PASSWORD=Qz2q2ovEF7h2~Lkept

# Optional: Other settings
MAX_CONCURRENT_REQUESTS=3
BROWSER_TIMEOUT=60000
HEADLESS_MODE=true
```

### 3. Verify Data File

Make sure you have `influencer names.xlsx` in the project root with:
- **Sheet "main"**: Contains `username`, `platform`, `average views` columns
- **Sheet "post link"**: Will be auto-created/updated

## Running the Application

### Option 1: Run Once (Test Mode)

Run the scraper once and exit:

```bash
npm run scrape-now
```

This will:
- Read influencers from Excel file
- Scrape data for each influencer
- Update Excel file with results
- Show summary and exit

### Option 2: Run with Scheduler

Run continuously with cron scheduler:

```bash
npm start
```

This will:
- Run on schedule (default: every 6 hours)
- Keep running until you press `Ctrl+C`
- Log all activity to `logs/combined.log`

### Option 3: Development Mode (Auto-restart)

For development with auto-restart on file changes:

```bash
npm run dev
```

## Testing

### Test 1: Verify Configuration

Check if everything is configured correctly:

```bash
npm run test-setup
```

This verifies:
- Environment variables are set
- Data file exists
- Dependencies are installed
- Configuration is valid

### Test 2: Test Proxy Connection

Test if proxy works (when PROXY_ENABLED=true):

```bash
curl -U "bhushan:Qz2q2ovEF7h2~Lkept" -x "us.decodo.com:10001" "https://ip.decodo.com/json"
```

Expected output: JSON with IP information

### Test 3: Test with Single Influencer

1. **Backup your Excel file**:
   ```bash
   cp "influencer names.xlsx" "influencer names.backup.xlsx"
   ```

2. **Edit Excel file**: Keep only 1-2 influencers in the "main" sheet

3. **Run scraper**:
   ```bash
   npm run scrape-now
   ```

4. **Check results**:
   - Console output shows summary
   - Check Excel file for updated data
   - Check logs: `cat logs/combined.log`

### Test 4: Test Instagram (RapidAPI)

Test Instagram scraping without proxy:

```bash
# In .env: PROXY_ENABLED=false
npm run scrape-now
```

Check logs for Instagram-specific messages:
```bash
grep -i instagram logs/combined.log
```

### Test 5: Test TikTok (Web Scraping)

Test TikTok scraping:

```bash
# In .env: PROXY_ENABLED=false (for testing)
# Or PROXY_ENABLED=true (for server)
npm run scrape-now
```

Check logs for TikTok-specific messages:
```bash
grep -i tiktok logs/combined.log
```

### Test 6: Test with Proxy Enabled

1. **Set proxy in .env**:
   ```bash
   PROXY_ENABLED=true
   ```

2. **Run scraper**:
   ```bash
   npm run scrape-now
   ```

3. **Verify proxy is used**:
   ```bash
   grep -i proxy logs/combined.log
   ```

   Should see: `Proxy enabled for browser: us.decodo.com:10001` or `Instagram using proxy: us.decodo.com:10001`

## Monitoring and Debugging

### View Logs

```bash
# All logs
cat logs/combined.log

# Only errors
cat logs/error.log

# Follow logs in real-time
tail -f logs/combined.log

# Search for specific platform
grep -i "instagram" logs/combined.log
grep -i "tiktok" logs/combined.log

# Search for errors
grep -i "error" logs/combined.log
```

### Check Backups

```bash
ls -lh backups/
```

Backups are created automatically before each update.

### Verify Results

1. **Check Excel file**: Open `influencer names.xlsx`
   - Sheet "main": Should have updated `average views`
   - Sheet "post link": Should have new posts

2. **Check console output**: Shows summary after each run

## Common Issues and Solutions

### Issue: "RAPIDAPI_KEY is required"

**Solution**: Add your RapidAPI key to `.env`:
```bash
RAPIDAPI_KEY=your_actual_key_here
```

### Issue: "Excel file not found"

**Solution**: 
- Ensure `influencer names.xlsx` is in project root
- Or set `EXCEL_FILE_PATH` in `.env`

### Issue: TikTok stuck in loading state

**Solution**: 
- For testing: Set `PROXY_ENABLED=false` and use VPN if needed
- For server: Ensure `PROXY_ENABLED=true` and proxy credentials are correct
- Increase timeout: `BROWSER_TIMEOUT=90000`

### Issue: Instagram popup blocking

**Solution**: 
- Instagram web scraping handles popups automatically
- Use RapidAPI method (default): `INSTAGRAM_SCRAPING_METHOD=rapidapi`

### Issue: Proxy not working

**Solution**:
1. Test proxy manually:
   ```bash
   curl -U "bhushan:Qz2q2ovEF7h2~Lkept" -x "us.decodo.com:10001" "https://ip.decodo.com/json"
   ```
2. Verify `PROXY_ENABLED=true` in `.env`
3. Check logs for proxy-related errors

### Issue: Rate limit errors

**Solution**:
- Reduce concurrency: `MAX_CONCURRENT_REQUESTS=2` or `1`
- Increase delays between requests
- Use proxy for server environment

## Example Test Scenarios

### Scenario 1: Test Instagram Only

1. Edit Excel: Keep only Instagram influencers
2. Run: `npm run scrape-now`
3. Verify: Instagram posts are fetched via RapidAPI

### Scenario 2: Test TikTok Only

1. Edit Excel: Keep only TikTok influencers
2. Run: `npm run scrape-now`
3. Verify: TikTok posts are fetched via web scraping

### Scenario 3: Test Both Platforms

1. Edit Excel: Keep both Instagram and TikTok influencers
2. Run: `npm run scrape-now`
3. Verify: Both platforms work correctly

### Scenario 4: Test Proxy vs No Proxy

1. **Without proxy**: Set `PROXY_ENABLED=false`, run `npm run scrape-now`
2. **With proxy**: Set `PROXY_ENABLED=true`, run `npm run scrape-now`
3. Compare: Both should work, proxy is optional

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
npm run pm2-start

# View logs
npm run pm2-logs

# Check status
pm2 status

# Stop application
npm run pm2-stop

# Restart application
npm run pm2-restart
```

### Environment Variables for Production

```bash
# Production .env
NODE_ENV=production
PROXY_ENABLED=true
RAPIDAPI_KEY=your_production_key
INSTAGRAM_SCRAPING_METHOD=rapidapi
TIKTOK_SCRAPING_METHOD=web
MAX_CONCURRENT_REQUESTS=3
CRON_SCHEDULE=0 */6 * * *
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run scrape-now` | Run once and exit |
| `npm start` | Run with scheduler |
| `npm run dev` | Development mode (auto-restart) |
| `npm run test-setup` | Verify configuration |
| `npm run pm2-start` | Start with PM2 |
| `npm run pm2-logs` | View PM2 logs |
| `npm run pm2-stop` | Stop PM2 process |

## Next Steps

1. ✅ Set up `.env` file
2. ✅ Test with 1-2 influencers
3. ✅ Verify proxy works (if needed)
4. ✅ Run full scrape
5. ✅ Set up scheduler or PM2 for production

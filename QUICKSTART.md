# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get RapidAPI Key

1. Go to [RapidAPI](https://rapidapi.com/)
2. Sign up or log in
3. Subscribe to these APIs:
   - **TikTok API** (search for "TikTok Scraper" or similar)
   - **Instagram API** (search for "Instagram Scraper API" or similar)
4. Copy your API key from the dashboard

## Step 3: Configure Environment

Open the `.env` file and replace `your_rapidapi_key_here` with your actual API key:

```bash
RAPIDAPI_KEY=abc123xyz456your_actual_key_here
```

Also verify the API hosts match your subscriptions. For example:
- If you subscribed to "TikTok Scraper7", use: `tiktok-scraper7.p.rapidapi.com`
- If you subscribed to "Instagram Scraper API2", use: `instagram-scraper-api2.p.rapidapi.com`

## Step 4: Verify Excel File

Make sure `influencer names.xlsx` exists in the project root with:

**Sheet 1: "main"**
| username | platform | average views |
|----------|----------|---------------|
| user1    | tiktok   |               |
| user2    | instagram|               |

**Sheet 2: "post link"** (optional, will be created automatically)
| username | post link | posted date | views | likes | share |
|----------|-----------|-------------|-------|-------|-------|

## Step 5: Test Setup

Run the setup test to verify everything is configured correctly:

```bash
npm run test-setup
```

This will check:
- Environment variables are set
- Excel file exists and is readable
- All dependencies are installed
- Directory structure is correct
- Cron schedule is valid

## Step 6: Test with One Influencer

Before running with all 48 influencers, test with just 1-2:

1. Create a backup of your Excel file
2. Temporarily remove all but 2 influencers from the "main" sheet
3. Run manually:

```bash
npm run scrape-now
```

4. Check the output in console
5. Verify Excel file was updated correctly
6. Check logs: `cat logs/combined.log`

## Step 7: Run with All Influencers

Once verified, restore your full Excel file and run:

```bash
npm run scrape-now
```

## Step 8: Start Scheduler

To run automatically on schedule:

```bash
npm start
```

The default schedule is every 6 hours. To change it, edit `CRON_SCHEDULE` in `.env`.

Press `Ctrl+C` to stop.

## Step 9: Deploy with PM2 (Optional)

For production deployment with auto-restart:

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
npm run pm2-start

# View logs
npm run pm2-logs

# Check status
pm2 status

# Stop the application
npm run pm2-stop
```

To make it restart on system reboot:

```bash
pm2 startup
pm2 save
```

## Common Issues

### Issue: "Missing required environment variables: RAPIDAPI_KEY"
**Solution**: Edit `.env` and set your actual RapidAPI key

### Issue: "Excel file not found"
**Solution**: Ensure `influencer names.xlsx` is in the project root, or update `EXCEL_FILE_PATH` in `.env`

### Issue: "User not found" for many users
**Solution**:
- Verify usernames are correct (no typos)
- Ensure accounts are public
- Check if API host in `.env` matches your RapidAPI subscription

### Issue: Rate limit errors
**Solution**:
- Reduce `MAX_CONCURRENT_REQUESTS` in `.env` (try 2 or 1)
- Upgrade your RapidAPI subscription plan
- Increase time between runs

### Issue: High failure rate
**Solution**:
- Check RapidAPI dashboard for quota limits
- Verify API subscriptions are active
- Check `logs/error.log` for specific errors
- Test with 1-2 users first to isolate issue

## Cron Schedule Examples

Edit `CRON_SCHEDULE` in `.env`:

```bash
# Every 6 hours (default)
CRON_SCHEDULE=0 */6 * * *

# Every day at midnight
CRON_SCHEDULE=0 0 * * *

# Every 12 hours
CRON_SCHEDULE=0 */12 * * *

# Every Monday at 9 AM
CRON_SCHEDULE=0 9 * * 1

# Every 30 minutes (for testing)
CRON_SCHEDULE=*/30 * * * *
```

## Monitoring

### View Logs
```bash
# All logs
cat logs/combined.log

# Only errors
cat logs/error.log

# Follow logs in real-time
tail -f logs/combined.log
```

### Check Backups
```bash
ls -lh backups/
```

Backups are created automatically before each Excel update.

## Support

If you encounter issues:

1. Check logs: `cat logs/error.log`
2. Run test setup: `npm run test-setup`
3. Verify RapidAPI subscription is active
4. Test with 1 influencer first
5. Check API documentation for your specific RapidAPI service

## Next Steps

- Monitor the first few runs to ensure everything works correctly
- Set up alerts (email/Slack) for critical failures (optional)
- Adjust cron schedule based on your needs
- Consider setting up monitoring with PM2 Plus (optional)

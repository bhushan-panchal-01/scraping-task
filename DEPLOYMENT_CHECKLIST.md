# Deployment Checklist

Use this checklist to ensure everything is properly configured before running in production.

## Pre-Deployment Checks

### 1. Environment Setup

- [ ] `.env` file created and configured
- [ ] `RAPIDAPI_KEY` set with valid key
- [ ] API hosts match your RapidAPI subscriptions
- [ ] Cron schedule configured appropriately
- [ ] File paths verified (Excel file, backup, logs)

### 2. RapidAPI Setup

- [ ] Signed up for RapidAPI account
- [ ] Subscribed to TikTok API service
- [ ] Subscribed to Instagram API service
- [ ] Verified API plan supports required request volume
- [ ] Tested API endpoints in RapidAPI console
- [ ] Noted exact endpoint paths and parameters

### 3. Dependencies

- [ ] Node.js installed (v14 or higher)
- [ ] All npm packages installed (`npm install`)
- [ ] No critical vulnerabilities (`npm audit`)

### 4. Excel File

- [ ] `influencer names.xlsx` exists in correct location
- [ ] "main" sheet has required columns: username, platform
- [ ] "post link" sheet exists (or will be created automatically)
- [ ] All influencer usernames are correct (no typos)
- [ ] Platforms are correctly specified (tiktok/instagram)

### 5. Initial Testing

- [ ] Setup test passed: `npm run test-setup`
- [ ] Test with 1-2 influencers first
- [ ] Manual run successful: `npm run scrape-now`
- [ ] Excel file updated correctly
- [ ] Logs show no critical errors
- [ ] Data matches actual profiles (spot check)

### 6. Directory Permissions

- [ ] Application can read Excel file
- [ ] Application can write to Excel file
- [ ] Application can create backup files
- [ ] Application can write to logs directory

## API Configuration Checklist

### TikTok API

- [ ] API host correct in `.env`
- [ ] Endpoint path verified
- [ ] Parameter names match API docs
- [ ] Response structure understood
- [ ] Test user scraped successfully

### Instagram API

- [ ] API host correct in `.env`
- [ ] Endpoint path verified
- [ ] Parameter names match API docs
- [ ] Response structure understood
- [ ] Test user scraped successfully

## Performance Tuning

### Concurrency Settings

- [ ] `MAX_CONCURRENT_REQUESTS` set appropriately (default: 3)
- [ ] No rate limit errors during testing
- [ ] Requests completing in reasonable time

### Retry Logic

- [ ] `RETRY_ATTEMPTS` configured (default: 3)
- [ ] `REQUEST_TIMEOUT` appropriate (default: 30000ms)
- [ ] Retries working correctly for transient failures

### Schedule Configuration

- [ ] Cron schedule appropriate for use case
- [ ] Frequency doesn't exceed API quota
- [ ] Schedule validated: check with <https://crontab.guru>

## Production Deployment

### Option 1: Direct Node.js

```bash
# Start scheduler
npm start

# Or run once
npm run scrape-now
```

**Checklist:**

- [ ] Application starts without errors
- [ ] Cron scheduler active
- [ ] Logs being written
- [ ] Process stays running

### Option 2: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Setup auto-restart
pm2 startup
pm2 save
```

**Checklist:**

- [ ] PM2 installed globally
- [ ] Application started with PM2
- [ ] Auto-restart configured
- [ ] PM2 logs accessible
- [ ] Process status is "online"

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor first scheduled run
- [ ] Check logs for errors
- [ ] Verify Excel updates are correct
- [ ] Monitor memory usage
- [ ] Check API usage in RapidAPI dashboard

### First Week

- [ ] Review error patterns in logs
- [ ] Verify data accuracy (spot checks)
- [ ] Check backup files are created
- [ ] Monitor API quota usage
- [ ] Adjust settings if needed

### Ongoing Monitoring

- [ ] Weekly log review
- [ ] Monthly API cost review
- [ ] Quarterly data accuracy audit
- [ ] Monitor disk space (logs, backups)

## Backup Strategy

### Before Deployment

- [ ] Backup original Excel file
- [ ] Document current state
- [ ] Have rollback plan ready

### During Operation

- [ ] Automatic backups before each update
- [ ] Backup retention policy defined
- [ ] Old backups cleaned up periodically

```bash
# Clean old backups (keep last 30 days)
find backups/ -name "*.xlsx" -mtime +30 -delete
```

## Troubleshooting Checklist

If issues occur:

### Step 1: Check Logs

```bash
# View recent errors
tail -100 logs/error.log

# Search for specific issues
grep -i "failed" logs/combined.log
```

### Step 2: Verify Configuration

```bash
# Re-run setup test
npm run test-setup
```

### Step 3: Test Single User

- [ ] Isolate one influencer in Excel
- [ ] Run manually
- [ ] Check specific error message
- [ ] Verify API works in RapidAPI console

### Step 4: Check API Status

- [ ] RapidAPI dashboard for quota
- [ ] API status page (if available)
- [ ] Recent API changes or updates

### Step 5: Restart

```bash
# PM2
pm2 restart scraping-api

# Or direct Node.js
# Ctrl+C to stop, then npm start
```

## Security Checklist

### Credentials

- [ ] `.env` file not committed to git
- [ ] API keys rotated periodically
- [ ] No API keys in logs

### File Permissions

- [ ] `.env` has restricted permissions (600)
- [ ] Excel file has appropriate permissions
- [ ] Logs directory secured

```bash
chmod 600 .env
```

### Updates

- [ ] Dependencies updated regularly
- [ ] Security vulnerabilities patched
- [ ] Node.js kept up to date

```bash
npm audit fix
npm outdated
```

## Scaling Considerations

### Growing Number of Influencers

**Current: <50 influencers**

- Default settings should work

**50-100 influencers**

- [ ] Consider upgrading API plan
- [ ] Increase concurrency to 5
- [ ] Run every 12 hours instead of 6

**100-500 influencers**

- [ ] Professional API plan required
- [ ] Batch processing (split into groups)
- [ ] Consider multiple API keys
- [ ] Run daily instead of multiple times per day

**500+ influencers**

- [ ] Enterprise API plan
- [ ] Distributed processing
- [ ] Database instead of Excel
- [ ] Consider cloud deployment

### Performance Optimization

- [ ] Monitor execution time
- [ ] Optimize if >5 minutes for <100 influencers
- [ ] Consider caching for frequently accessed data
- [ ] Database migration if Excel gets too large (>10MB)

## Success Metrics

Define success criteria:

- [ ] >90% success rate for scraping
- [ ] <5% data discrepancy when spot-checked
- [ ] Zero data loss incidents
- [ ] <5 minutes execution time
- [ ] Logs reviewed weekly
- [ ] No quota exceeded errors

## Emergency Contacts

Document:

- [ ] RapidAPI support contact
- [ ] Technical owner contact
- [ ] Escalation procedure
- [ ] Critical issue definition

## Sign-Off

Before going live:

- [ ] All checklist items completed
- [ ] Test results documented
- [ ] Team trained on monitoring
- [ ] Rollback plan tested
- [ ] Documentation reviewed

**Deployment Date:** _____________

**Deployed By:** _____________

**Verified By:** _____________

## Post-Deployment

After 1 week of successful operation:

- [ ] Review and archive deployment docs
- [ ] Update runbook with lessons learned
- [ ] Document any configuration changes
- [ ] Schedule next review date

---

**Note:** Keep this checklist updated as the system evolves.

# Project Summary

## Overview
A Node.js application that automatically scrapes influencer data from TikTok and Instagram using RapidAPI, calculates average views from the last 10 posts, and updates an Excel file on a scheduled basis.

## Key Features

1. **Multi-Platform Support**: TikTok and Instagram
2. **Scheduled Execution**: Cron-based automatic updates
3. **Data Processing**: Calculates average views from last 10 posts
4. **Excel Integration**: Reads and updates Excel files seamlessly
5. **Error Handling**: Robust retry logic with exponential backoff
6. **Concurrency Control**: Rate limiting to avoid API throttling
7. **Backup System**: Automatic backups before each update
8. **Comprehensive Logging**: Winston-based logging with rotation
9. **Graceful Degradation**: Continues on individual failures
10. **Production Ready**: PM2 support for deployment

## Architecture

### Core Components

1. **Scrapers** (`src/services/scrapers/`)
   - `baseScraper.js`: Common functionality (retry logic, error handling)
   - `tiktokScraper.js`: TikTok-specific scraping via RapidAPI
   - `instagramScraper.js`: Instagram-specific scraping via RapidAPI

2. **Excel Services** (`src/services/excel/`)
   - `excelReader.js`: Read influencers and existing posts
   - `excelWriter.js`: Update average views and post data

3. **Job Orchestration** (`src/jobs/`)
   - `scrapingJob.js`: Main workflow coordinator

4. **Utilities** (`src/utils/`)
   - `logger.js`: Winston logging setup
   - `dataProcessor.js`: Calculate averages, deduplicate posts

5. **Configuration** (`src/config/`)
   - `config.js`: Centralized configuration management

6. **Entry Point** (`src/index.js`)
   - Cron scheduler setup
   - Graceful shutdown handling

## Data Flow

```
1. Read influencers from Excel "main" sheet
2. Read existing posts from "post link" sheet
3. For each influencer:
   a. Get appropriate scraper (TikTok/Instagram)
   b. Fetch last 10 posts via RapidAPI
   c. Calculate average views
   d. Identify new vs existing posts
4. Batch update Excel file:
   a. Update average views in "main" sheet
   b. Append new posts to "post link" sheet
   c. Update views/likes/shares for existing posts
5. Log results and metrics
```

## Excel File Structure

### Sheet 1: "main"
| Column | Type | Description |
|--------|------|-------------|
| username | string | Influencer username (without @) |
| platform | string | "tiktok" or "instagram" |
| average views | number | Average views from last 10 posts |

### Sheet 2: "post link"
| Column | Type | Description |
|--------|------|-------------|
| username | string | Influencer username |
| post link | string | URL to the post (unique identifier) |
| posted date | date | When the post was published |
| views | number | View count |
| likes | number | Like count |
| share | number | Share count |

## Configuration

All configuration is managed through `.env`:

```bash
# Required
RAPIDAPI_KEY=your_api_key

# API Hosts (verify these match your RapidAPI subscriptions)
TIKTOK_API_HOST=tiktok-scraper7.p.rapidapi.com
INSTAGRAM_API_HOST=instagram-scraper-api2.p.rapidapi.com

# Performance
MAX_CONCURRENT_REQUESTS=3    # Number of simultaneous API calls
REQUEST_TIMEOUT=30000        # 30 seconds
RETRY_ATTEMPTS=3             # Number of retries on failure

# Schedule
CRON_SCHEDULE=0 */6 * * *    # Every 6 hours

# Paths
EXCEL_FILE_PATH=./influencer names.xlsx
BACKUP_DIR=./backups
LOG_DIR=./logs

# Logging
LOG_LEVEL=info               # debug, info, warn, error
```

## Key Design Decisions

### Why RapidAPI over Direct Scraping?
1. **Reliability**: No need to handle proxy rotation, CAPTCHAs
2. **Maintenance**: APIs are maintained by providers
3. **Performance**: Faster than browser automation
4. **Scalability**: Built-in rate limiting and CDN
5. **Legal**: Using official APIs reduces legal concerns

### Why Excel over Database?
1. **Simplicity**: Easy to view/edit data manually
2. **Portability**: No database setup required
3. **Backup**: File-based backups are straightforward
4. **User-Friendly**: Non-technical users can access data
5. **Adequate**: For 48 influencers, Excel is sufficient

**Migration to Database**: Consider if:
- Influencers >500
- File size >10MB
- Need for complex queries
- Multiple concurrent users

### Error Handling Strategy
1. **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
2. **Graceful Degradation**: One failure doesn't stop others
3. **Data Preservation**: Atomic writes with temp file + rename
4. **Comprehensive Logging**: All errors logged with context
5. **High Failure Alert**: >50% failure rate triggers warning

### Concurrency Control
- Default: 3 concurrent requests
- Prevents rate limiting
- Configurable based on API plan
- Uses `p-limit` for clean implementation

## Performance Characteristics

### Expected Metrics (48 influencers)
- **Execution Time**: ~3-5 minutes
- **API Calls**: 48 requests (one per influencer)
- **Memory Usage**: <100MB
- **CPU Usage**: Low (I/O bound)
- **Excel File Size**: <5MB

### Scaling Considerations
| Influencers | API Plan | Concurrency | Schedule | Notes |
|-------------|----------|-------------|----------|-------|
| <50 | Basic ($10-30) | 3 | Every 6h | Default setup |
| 50-100 | Pro ($30-50) | 5 | Every 12h | Works well |
| 100-500 | Pro/Ultra | 5-10 | Daily | Consider batching |
| 500+ | Enterprise | 10+ | Daily | Database recommended |

## Deployment Options

### Option 1: Direct Node.js
```bash
npm start                    # Start scheduler
npm run scrape-now           # Run once
```

**Pros**: Simple, no dependencies
**Cons**: No auto-restart, manual process management

### Option 2: PM2 (Recommended)
```bash
pm2 start ecosystem.config.js
```

**Pros**: Auto-restart, monitoring, logs, production-ready
**Cons**: Requires PM2 installation

### Option 3: Docker (Future)
```bash
docker-compose up -d
```

**Pros**: Isolated environment, easy scaling
**Cons**: Requires Docker setup, overkill for current scale

## Monitoring & Maintenance

### Daily
- [ ] Check application is running
- [ ] Verify scheduled runs occurred

### Weekly
- [ ] Review error logs
- [ ] Check failure rate
- [ ] Verify data accuracy (spot check)
- [ ] Monitor API usage

### Monthly
- [ ] Review API costs
- [ ] Clean old backups
- [ ] Update dependencies
- [ ] Performance review

### Quarterly
- [ ] Full data accuracy audit
- [ ] Configuration review
- [ ] Security updates
- [ ] Capacity planning

## Common Use Cases

### Add New Influencer
1. Open Excel file
2. Add row to "main" sheet: username, platform
3. Save file
4. Next run will include new influencer

### Remove Influencer
1. Open Excel file
2. Delete row from "main" sheet
3. Save file
4. Historical data in "post link" sheet remains

### Change Schedule
1. Edit `CRON_SCHEDULE` in `.env`
2. Restart application
3. Verify with logs

### View Historical Data
1. Open Excel file
2. Go to "post link" sheet
3. Filter by username
4. Sort by date

### Check Why Influencer Failed
1. Check logs: `grep "username" logs/error.log`
2. Look for error message
3. Common issues: user not found, private account, rate limit

## Security Considerations

### Credentials
- API keys stored in `.env` (not committed)
- File permissions: `chmod 600 .env`
- Rotate keys periodically

### Data
- Excel file may contain sensitive data
- Restrict file permissions
- Consider encryption at rest for production

### Dependencies
- Regular `npm audit` to check vulnerabilities
- Keep Node.js updated
- Review dependency changes

## Cost Analysis

### RapidAPI Costs
**Assumptions**: 48 influencers, 4 runs/day

- Requests/day: 48 × 4 = 192
- Requests/month: 192 × 30 = 5,760
- With retries (20% buffer): ~7,000/month

**Recommended Plan**: Pro ($30-50/month)

### Infrastructure Costs
- Server: $5-10/month (basic VPS)
- Or: Free (run on existing server)

**Total**: $35-60/month

### ROI Calculation
- Manual data collection: ~2 hours/day @ $20/hr = $1,200/month
- Automated cost: ~$50/month
- **Savings**: $1,150/month (96% reduction)

## Testing Strategy

### Unit Tests (Future)
- Data processing functions
- Excel operations with fixtures
- Scraper transformations (mocked responses)

### Integration Tests (Future)
- End-to-end with test Excel file
- Verify data accuracy
- No data loss

### Manual Testing
1. Test with 1-2 influencers first
2. Verify data against actual profiles
3. Check Excel updates correctly
4. Monitor logs for errors
5. Test error scenarios (invalid username, etc.)

## Future Enhancements

### Short Term
- [ ] Email/Slack notifications on failures
- [ ] Dashboard for monitoring
- [ ] API response caching
- [ ] More detailed error reporting

### Medium Term
- [ ] Support for more platforms (YouTube, Twitter)
- [ ] Historical trend analysis
- [ ] Engagement rate calculations
- [ ] Competitor comparison

### Long Term
- [ ] Database migration
- [ ] Web UI for management
- [ ] API for data access
- [ ] Machine learning for trend prediction
- [ ] Multi-region deployment

## Troubleshooting

### Issue: "Missing required environment variables"
**Cause**: `.env` not configured
**Fix**: Edit `.env` and add `RAPIDAPI_KEY`

### Issue: "Excel file not found"
**Cause**: File missing or wrong path
**Fix**: Verify file exists or update `EXCEL_FILE_PATH` in `.env`

### Issue: High failure rate
**Cause**: API issues, rate limiting, or invalid usernames
**Fix**: Check logs for specific errors, verify API quota, test usernames

### Issue: Slow execution
**Cause**: High concurrency or API latency
**Fix**: Reduce `MAX_CONCURRENT_REQUESTS` or increase timeout

### Issue: Data not updating
**Cause**: Excel file locked or permissions issue
**Fix**: Close Excel file, check file permissions

## Success Metrics

The application is successful if:

- ✅ >90% success rate
- ✅ Data accuracy >95%
- ✅ Zero data loss
- ✅ <5 min execution time
- ✅ No manual intervention needed

## Conclusion

This application provides a robust, automated solution for collecting influencer data from TikTok and Instagram. It's designed for reliability, maintainability, and ease of use, with comprehensive error handling and logging.

The architecture supports scaling from dozens to hundreds of influencers with minimal configuration changes. The Excel-based approach keeps the solution accessible to non-technical users while providing enterprise-grade reliability through automated backups and graceful error handling.

For questions or issues, refer to:
- `QUICKSTART.md` - Setup instructions
- `README.md` - Detailed documentation
- `API_INTEGRATION_NOTES.md` - API customization
- `DEPLOYMENT_CHECKLIST.md` - Production deployment
- Logs: `logs/combined.log` and `logs/error.log`

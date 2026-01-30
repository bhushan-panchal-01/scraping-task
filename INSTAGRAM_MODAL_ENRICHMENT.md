# Instagram Modal Enrichment Guide

## Overview

The Instagram scraper now supports **modal-based enrichment** that opens each post/reel in a modal popup to extract real stats (views, likes, comments, date). This provides accurate data that's not available in the grid view.

## How It Works

1. **Extract post links** from profile grid
2. **Click each post** to open Instagram modal
3. **Extract stats** from modal:
   - `date_post` - Actual post date
   - `views` - View count (for reels)
   - `likes` - Like count
   - `comments` - Comment count (used as share proxy)
4. **Close modal** and move to next post
5. **Random delays** between posts to avoid rate limiting

## Configuration

### Enable/Disable Modal Enrichment

In your `.env` file:

```bash
# Enable modal enrichment (default: enabled)
INSTAGRAM_ENABLE_MODAL_ENRICHMENT=true

# Or disable it
INSTAGRAM_ENABLE_MODAL_ENRICHMENT=false
```

### Limit Number of Posts to Enrich

To avoid rate limiting, you can limit how many posts are enriched:

```bash
# Limit to 10 posts (default: 15)
INSTAGRAM_MAX_MODAL_ENRICHMENT=10
```

## Features

✅ **Works for both posts and reels**
- Handles `/p/` (posts) and `/reel/` (reels) links
- Extracts appropriate stats for each type

✅ **Smart modal detection**
- Waits for modal to appear
- Tries multiple selectors
- Handles different Instagram UI variations

✅ **Robust error handling**
- Gracefully handles failed clicks
- Recovers from stuck modals
- Falls back to direct navigation if needed

✅ **Rate limiting protection**
- Random delays between posts (800-1500ms)
- Configurable post limits
- Gentle throttling to mimic human behavior

## Example Output

Before enrichment (grid view):
```csv
username,platform,post link,posted date,views,likes,share
hablaconlingopanda,instagram,https://www.instagram.com/reel/DTG2UTPAHV_/,2026-01-30T07:41:38.130Z,0,0,0
```

After enrichment (modal):
```csv
username,platform,post link,posted date,views,likes,share
hablaconlingopanda,instagram,https://www.instagram.com/reel/DTG2UTPAHV_/,2024-11-18T10:32:45.000Z,52300,187,45
```

## Performance Considerations

### Speed
- **Grid extraction**: ~2-5 seconds per profile
- **Modal enrichment**: ~2-3 seconds per post
- **Total for 10 posts**: ~25-35 seconds

### Rate Limiting
- Instagram may block if you go too fast
- Default limit: 15 posts per run
- Random delays: 800-1500ms between posts
- **Recommendation**: Keep limit at 10-15 posts

### Best Practices

1. **Use cookies** for authentication
   ```bash
   INSTAGRAM_COOKIES="sessionid=xxx; csrftoken=xxx; ds_user_id=xxx"
   ```

2. **Limit enrichment** for testing
   ```bash
   INSTAGRAM_MAX_MODAL_ENRICHMENT=5
   ```

3. **Run less frequently** in production
   ```bash
   CRON_SCHEDULE=0 */6 * * *  # Every 6 hours
   ```

## Troubleshooting

### Modal doesn't open
- Check if cookies are set correctly
- Verify post links are valid
- Try increasing timeout in code

### Stats still showing 0
- Modal might not have loaded fully
- Try increasing wait times
- Check if account is private

### Rate limiting
- Reduce `INSTAGRAM_MAX_MODAL_ENRICHMENT`
- Increase delays between posts
- Use proxy if available

## Disabling Modal Enrichment

If you want to skip modal enrichment (faster but less accurate):

```bash
INSTAGRAM_ENABLE_MODAL_ENRICHMENT=false
```

This will only extract what's available in the grid view (usually just links, no stats).

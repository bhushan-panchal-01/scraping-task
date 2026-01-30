# API Integration Notes

This document explains how to integrate different RapidAPI services for TikTok and Instagram scraping.

## Important: API Response Variations

Different RapidAPI providers return data in different formats. The scrapers are designed to handle common variations, but you may need to adjust them based on your specific API.

## How to Find Your API Endpoints

1. Go to [RapidAPI](https://rapidapi.com/)
2. Find and subscribe to a TikTok and Instagram API
3. Go to "Endpoints" tab
4. Look for endpoints that fetch user posts/videos
5. Note the exact endpoint path and parameters

## TikTok API Integration

### Recommended Services

- "TikTok Scraper" by Social Media Data
- "TikTok Video No Watermark"
- "TikTok API" (various providers)

### Common Endpoint Patterns

**Pattern 1: /user/posts**

```javascript
GET https://tiktok-scraper7.p.rapidapi.com/user/posts
Parameters:
  - username: string (without @)
  - count: number (10)
```

**Pattern 2: /user/feed**

```javascript
GET https://tiktok-api.p.rapidapi.com/user/feed
Parameters:
  - unique_id: string (username)
  - count: number (10)
```

**Pattern 3: /user/videos**

```javascript
GET https://tiktok-download-video.p.rapidapi.com/user/videos
Parameters:
  - user: string (username)
  - limit: number (10)
```

### Response Format Examples

**Format 1: videos array**

```json
{
  "data": {
    "videos": [
      {
        "id": "7123456789",
        "video_url": "https://...",
        "create_time": 1640000000,
        "play_count": 123456,
        "digg_count": 5678,
        "share_count": 234
      }
    ]
  }
}
```

**Format 2: items array**

```json
{
  "items": [
    {
      "aweme_id": "7123456789",
      "url": "https://...",
      "createTime": 1640000000,
      "playCount": 123456,
      "diggCount": 5678,
      "shareCount": 234
    }
  ]
}
```

### Customizing TikTok Scraper

If your API uses different endpoints or response formats, edit:
`src/services/scrapers/tiktokScraper.js`

**Change endpoint URL** (line ~23):

```javascript
url: `https://${this.apiHost}/your/endpoint/path`,
```

**Change parameters** (line ~24-27):

```javascript
params: {
  your_username_param: cleanUsername,
  your_count_param: count,
},
```

**Change response extraction** (line ~45):

```javascript
let videos = response.your_data_path || [];
```

**Change field mapping** (line ~62-68):

```javascript
return {
  postLink: rawPost.your_url_field,
  postedDate: new Date(rawPost.your_date_field * 1000).toISOString(),
  views: rawPost.your_views_field,
  likes: rawPost.your_likes_field,
  share: rawPost.your_shares_field,
};
```

## Instagram API Integration

### Recommended Services

- "Instagram Scraper API" (various providers)
- "Instagram Profile" API
- "Instagram Data" API

### Common Endpoint Patterns

**Pattern 1: /user/posts**

```javascript
GET https://instagram-scraper-api2.p.rapidapi.com/user/posts
Parameters:
  - username: string (without @)
  - count: number (10)
```

**Pattern 2: /v1/user_posts**

```javascript
GET https://instagram-api.p.rapidapi.com/v1/user_posts
Parameters:
  - username_or_id: string
  - limit: number (10)
```

**Pattern 3: /media/user**

```javascript
GET https://instagram-data.p.rapidapi.com/media/user
Parameters:
  - username: string
  - count: number (10)
```

### Response Format Examples

**Format 1: items array**

```json
{
  "data": {
    "items": [
      {
        "id": "123456789",
        "permalink": "https://instagram.com/p/ABC123/",
        "taken_at": 1640000000,
        "like_count": 1234,
        "video_view_count": 5678
      }
    ]
  }
}
```

**Format 2: GraphQL edges**

```json
{
  "edges": [
    {
      "node": {
        "id": "123456789",
        "shortcode": "ABC123",
        "timestamp": 1640000000,
        "edge_liked_by": { "count": 1234 },
        "video_view_count": 5678
      }
    }
  ]
}
```

### Customizing Instagram Scraper

If your API uses different endpoints or response formats, edit:
`src/services/scrapers/instagramScraper.js`

Follow the same pattern as TikTok customization above.

## Testing Your API Integration

### Step 1: Test with Postman/Insomnia

Before integrating, test your API manually:

1. Make a request to your endpoint with your RapidAPI key
2. Copy the response JSON
3. Identify the path to the posts array
4. Identify field names for: url, date, views, likes, shares

### Step 2: Update Scraper Code

Modify the scraper file based on your API's response structure.

### Step 3: Test with One User

```bash
# Temporarily modify Excel to have just 1 user
npm run scrape-now
```

Check logs for errors:

```bash
cat logs/combined.log | grep -i error
```

### Step 4: Verify Data

1. Check Excel file was updated
2. Verify the data matches the actual profile
3. Check all fields are populated correctly

## Common API Limitations

### Rate Limits

- Most APIs limit requests per minute/hour
- Adjust `MAX_CONCURRENT_REQUESTS` in `.env`
- Default is 3 concurrent requests

### Data Availability

- Some APIs don't provide share counts
- Some APIs only work with public accounts
- Views might not be available for Instagram photos (only videos)

### Handle Missing Data

The scrapers use fallback values:

```javascript
views: rawPost.play_count || rawPost.views || 0,
```

If your API doesn't provide certain fields, they'll default to 0.

## Debugging Tips

### Enable Debug Logging

In `.env`:

```bash
LOG_LEVEL=debug
```

### Check API Response

Add temporary logging in scraper:

```javascript
async getRecentPosts(username, count = 10) {
  // ... existing code ...
  const response = await this.makeRequest({...});

  // Add this line temporarily:
  console.log('API Response:', JSON.stringify(response, null, 2));

  // ... rest of code ...
}
```

### Test Single API Call

Create a test file `test-api.js`:

```javascript
require('dotenv').config();
const axios = require('axios');

async function testApi() {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://your-api-host/endpoint',
      params: {
        username: 'test_user',
        count: 3,
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'your-api-host',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApi();
```

Run: `node test-api.js`

## API Cost Optimization

### Reduce API Calls

- Increase `CRON_SCHEDULE` interval (e.g., every 12 hours instead of 6)
- Reduce `MAX_CONCURRENT_REQUESTS` (slower but fewer parallel calls)
- Only scrape active influencers (remove inactive ones)

### Choose Right Plan

- Calculate: (# influencers) × (posts per influencer) × (runs per day)
- Example: 48 × 10 × 4 = 1,920 requests/day
- Add 20% buffer for retries: ~2,300 requests/day
- Choose plan that supports at least 70,000 requests/month

### Monitor Usage

- Check RapidAPI dashboard regularly
- Set up usage alerts in RapidAPI
- Monitor error logs for quota exceeded errors

## Fallback Strategy

If one API provider has issues, you can configure a fallback:

1. Subscribe to a backup API
2. Add fallback logic in scraper:

```javascript
async getRecentPosts(username, count = 10) {
  try {
    return await this.getPrimaryAPI(username, count);
  } catch (error) {
    logger.warn(`Primary API failed, trying fallback: ${error.message}`);
    return await this.getFallbackAPI(username, count);
  }
}
```

## Support

If you need help configuring a specific API:

1. Share the API name from RapidAPI
2. Share a sample response (with sensitive data removed)
3. Check the API's documentation on RapidAPI
4. Test the API endpoints in RapidAPI's test console first

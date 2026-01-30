# How to Get Instagram Cookies for Authentication

## Quick Method: Browser Developer Tools

### Step-by-Step Instructions

#### For Chrome/Edge (Windows/Linux):
1. **Open Instagram** in your browser
   - Go to https://www.instagram.com
   - **Log in** with your Instagram account

2. **Open Developer Tools**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect"

3. **Go to Application Tab**
   - Click on "Application" tab (at the top)
   - In the left sidebar, expand "Cookies"
   - Click on `https://www.instagram.com`

4. **Find Required Cookies**
   Look for these cookies in the list:
   - `sessionid` - Most important! This is your session token
   - `csrftoken` - CSRF protection token
   - `ds_user_id` - Your Instagram user ID

5. **Copy Cookie Values**
   - Click on each cookie name
   - Copy the "Value" field
   - Note them down

6. **Format for .env file**
   ```bash
   INSTAGRAM_COOKIES="sessionid=YOUR_SESSION_ID_VALUE; csrftoken=YOUR_CSRF_TOKEN_VALUE; ds_user_id=1927248007"
   ```

#### For Chrome/Edge (Mac):
1. **Open Instagram** and log in
2. **Open Developer Tools**
   - Press `Cmd+Option+I`
   - Or right-click → "Inspect"
3. Follow steps 3-6 above

#### For Firefox:
1. **Open Instagram** and log in
2. **Open Developer Tools**
   - Press `F12` or `Cmd+Option+I`
3. **Go to Storage Tab**
   - Click "Storage" tab
   - Expand "Cookies"
   - Click on `https://www.instagram.com`
4. Follow steps 4-6 above

#### For Safari (Mac):
1. **Enable Developer Menu**
   - Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"
2. **Open Instagram** and log in
3. **Open Developer Tools**
   - Develop → Show Web Inspector
   - Or `Cmd+Option+I`
4. **Go to Storage Tab**
   - Click "Storage" tab
   - Expand "Cookies"
   - Click on `https://www.instagram.com`
5. Follow steps 4-6 above

---

## Visual Guide

### What You'll See in Developer Tools:

```
Application Tab
├── Cookies
    └── https://www.instagram.com
        ├── sessionid          → Value: "1234567890%3A..."
        ├── csrftoken          → Value: "AbCdEf123456..."
        ├── ds_user_id         → Value: "1234567890"
        ├── mid                → (optional)
        └── ... (other cookies)
```

### Example Cookie Values:

```
sessionid=1234567890%3Aabc123%3Adef456
csrftoken=AbCdEf123456GhIjKl789
ds_user_id=1234567890
```

### Format in .env:

```bash
INSTAGRAM_COOKIES="sessionid=1234567890%3Aabc123%3Adef456; csrftoken=AbCdEf123456GhIjKl789; ds_user_id=1234567890"
```

---

## Alternative: Browser Extension Method

### Using Cookie Editor Extension

1. **Install Cookie Editor Extension**
   - Chrome: https://chrome.google.com/webstore/detail/cookie-editor
   - Firefox: https://addons.mozilla.org/firefox/addon/cookie-editor/

2. **Open Instagram** and log in

3. **Open Cookie Editor**
   - Click the extension icon
   - Select `instagram.com` domain

4. **Export Cookies**
   - Click "Export" button
   - Copy the JSON output

5. **Extract Required Cookies**
   - Look for `sessionid`, `csrftoken`, `ds_user_id`
   - Copy their values

---

## Using JavaScript Console (Quick Copy)

1. **Open Instagram** and log in
2. **Open Console** (F12 → Console tab)
3. **Run this command**:
   ```javascript
   document.cookie.split(';').filter(c => 
     c.includes('sessionid') || 
     c.includes('csrftoken') || 
     c.includes('ds_user_id')
   ).join('; ')
   ```
4. **Copy the output** - it will give you the cookies in the right format!

---

## Important Notes

### Cookie Security:
- ⚠️ **Never share your cookies** - they give full access to your account
- ⚠️ **Cookies expire** - usually after 30-90 days of inactivity
- ⚠️ **One session at a time** - logging in elsewhere may invalidate cookies

### Cookie Format:
- Must be URL-encoded (browser does this automatically)
- Separate multiple cookies with `; ` (semicolon + space)
- No quotes around individual values
- Quotes around entire string in .env file

### Example .env Entry:

```bash
# Instagram Web Scraping with Cookies
INSTAGRAM_SCRAPING_METHOD=web
INSTAGRAM_COOKIES="sessionid=1234567890%3Aabc123%3Adef456; csrftoken=AbCdEf123456GhIjKl789; ds_user_id=1234567890"
```

---

## Troubleshooting

### Cookies Not Working?
1. **Check if you're logged in** - Open Instagram in browser, make sure you're logged in
2. **Copy fresh cookies** - Old cookies may have expired
3. **Check format** - Make sure there's a space after semicolons: `; `
4. **URL encoding** - Don't manually decode/encode, use as-is from browser

### Cookies Expired?
- Cookies expire after inactivity or when you log out
- Get fresh cookies by logging in again and copying new values

### Still Getting Login Prompts?
- Make sure cookies are set before navigation
- Check that cookie domain is `.instagram.com`
- Verify all three cookies are present: `sessionid`, `csrftoken`, `ds_user_id`

---

## Quick Test

After setting cookies, test if they work:

```bash
npm run scrape-now
```

Check logs for:
- `Set X Instagram cookies for authentication` ✅
- No "authentication required" errors ✅
- Posts are being extracted ✅

---

## Security Best Practices

1. **Don't commit cookies to git** - Add to `.gitignore`
2. **Use environment variables** - Never hardcode in code
3. **Rotate cookies regularly** - Change them periodically
4. **Use separate account** - Consider using a dedicated Instagram account for scraping

---

## Alternative: Use RapidAPI (No Cookies Needed)

If getting cookies is too complicated, use RapidAPI instead:

```bash
# In .env
INSTAGRAM_SCRAPING_METHOD=rapidapi
RAPIDAPI_KEY=your_rapidapi_key
```

This doesn't require cookies or login - just an API key from RapidAPI.

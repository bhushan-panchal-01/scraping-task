const WebScraperStrategy = require('./webScraperStrategy');
const logger = require('../../../utils/logger');

/**
 * Instagram web scraping strategy using Puppeteer
 *
 * Features:
 * - Scrapes public Instagram profiles without authentication
 * - Detects and handles private accounts gracefully
 * - Extracts post data: links, likes, comments, views (for Reels)
 * - Handles pagination via scrolling
 * - Parses relative dates ("2 weeks ago") to ISO format
 *
 * Limitations:
 * - Instagram frequently requires authentication for viewing posts
 * - DOM selectors may change without notice (updated: 2026-01)
 * - Views only available for Reels, not static posts
 * - Comments used as proxy for shares (Instagram doesn't expose share counts)
 *
 * Recommended: Use RapidAPI strategy for Instagram in production
 */
class InstagramWebStrategy extends WebScraperStrategy {
  constructor() {
    super('Instagram');
  }

  /**
   * Get recent posts for an Instagram user via web scraping
   * @param {string} username - Instagram username (without @)
   * @param {number} count - Number of posts to fetch
   * @returns {Promise<Array>} Array of posts
   */
  async getRecentPosts(username, count = 10) {
    try {
      const cleanUsername = username.replace('@', '');

      logger.info(`[Web Scraping] Fetching ${count} posts for Instagram user: ${cleanUsername}`);

      // Initialize page if not already done
      if (!this.page) {
        await this.initialize();
      }

      // Set Instagram cookies if provided (for authentication)
      await this.setInstagramCookies();

      // Intercept network responses to capture post data from GraphQL API
      const postDataFromAPI = [];
      const responseHandler = async (response) => {
        try {
          const url = response.url();
          // Instagram uses GraphQL endpoints for post data
          if (url.includes('/graphql/query/') || url.includes('/api/graphql') || url.includes('query_hash')) {
            try {
              const data = await response.json();
              // Look for post data in response
              if (data && JSON.stringify(data).includes('/p/')) {
                postDataFromAPI.push(data);
                logger.debug(`Captured post data from API: ${url.substring(0, 100)}`);
              }
            } catch (e) {
              // Not JSON or can't parse - ignore
            }
          }
        } catch (error) {
          // Ignore errors
        }
      };
      
      this.page.on('response', responseHandler);

      await this.navigateTo(`https://www.instagram.com/${cleanUsername}/`);

      // Wait for initial page load
      await this.page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 10000 }
      ).catch(() => {});

      // Wait for React/JavaScript to render (Instagram uses React)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if account is private
      const isPrivate = await this.checkIfPrivateAccount();
      if (isPrivate) {
        logger.warn(`Instagram account ${cleanUsername} is private`);
        return [];
      }
      console.log('isPrivate', isPrivate);

      // Check if authentication is required
      const needsAuth = await this.checkAuthenticationRequired();
      if (needsAuth) {
        logger.warn(`Instagram requires authentication for profile: ${cleanUsername}`);
        return [];
      }

      // Wait for posts to load (or timeout) - Instagram loads posts via JavaScript
      const postsLoaded = await this.waitForPosts();
      if (!postsLoaded) {
        // Debug: Check what's actually on the page
        const pageInfo = await this.page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            hasArticle: !!document.querySelector('article'),
            articleCount: document.querySelectorAll('article').length,
            postLinks: document.querySelectorAll('a[href*="/p/"]').length,
            allLinks: document.querySelectorAll('a[href*="/p/"]').length,
            bodyText: document.body.innerText.substring(0, 500),
            hasLoginPrompt: document.body.innerText.includes('Log In') || document.body.innerText.includes('Sign Up'),
            hasPrivateMessage: document.body.innerText.includes('private') || document.body.innerText.includes('Private'),
            selectors: {
              article: document.querySelectorAll('article').length,
              'article a[href*="/p/"]': document.querySelectorAll('article a[href*="/p/"]').length,
              'a[href*="/p/"]': document.querySelectorAll('a[href*="/p/"]').length,
              '._aagw': document.querySelectorAll('._aagw').length,
              '[role="presentation"]': document.querySelectorAll('[role="presentation"]').length,
            }
          };
        });
        
        logger.warn(`No posts loaded for ${cleanUsername}`);
        logger.debug(`Page info: ${JSON.stringify(pageInfo, null, 2)}`);
        
        if (pageInfo.hasLoginPrompt) {
          logger.warn(`Instagram requires login for ${cleanUsername} - set INSTAGRAM_COOKIES in .env`);
        }
        if (pageInfo.hasPrivateMessage) {
          logger.warn(`Account ${cleanUsername} may be private - requires authentication`);
        }
        
        return [];
      }

      console.log('postsLoaded', postsLoaded);

      // Extract posts from DOM
      let posts = await this.extractPosts(cleanUsername, count);

      // If no posts from DOM, try extracting from API responses
      if (posts.length === 0 && postDataFromAPI.length > 0) {
        logger.debug(`Trying to extract posts from API responses (${postDataFromAPI.length} responses captured)`);
        posts = await this.extractPostsFromAPI(postDataFromAPI, cleanUsername, count);
      }

      // Enrich posts with stats via modal (if enabled)
      const enableModalEnrichment = process.env.INSTAGRAM_ENABLE_MODAL_ENRICHMENT !== 'false';
      if (enableModalEnrichment && posts.length > 0) {
        logger.info(`Enriching ${posts.length} posts via modal popups...`);
        posts = await this.enrichPostStatsViaModal(posts);
      }

      logger.info(`[Web Scraping] Successfully fetched ${posts.length} posts for Instagram user: ${cleanUsername}`);
      
      // Remove response handler
      this.page.removeAllListeners('response');
      
      return posts;

    } catch (error) {
      const errorInfo = this.handleError(error, username);
      logger.error(`[Web Scraping] Failed to fetch Instagram posts for ${username}: ${errorInfo.message}`);
      return [];
    } finally {
      // Clean up listeners
      this.page.removeAllListeners('response');
      await this.cleanup();
    }
  }

  /**
   * Set Instagram cookies for authentication
   * @returns {Promise<void>}
   */
  async setInstagramCookies() {
    try {
      const config = require('../../../config/config');
      const { cookies, sessionPath } = config.webScraping.instagram;

      if (cookies && cookies.trim()) {
        // Parse cookies from string format: "sessionid=xxx; csrftoken=xxx"
        const cookieArray = cookies.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=');
          return {
            name: name.trim(),
            value: value ? value.trim() : '',
            domain: '.instagram.com',
            path: '/',
            httpOnly: name.includes('sessionid'),
            secure: true,
            sameSite: 'Lax',
          };
        }).filter(c => c.name && c.value);

        // Set cookies before navigation
        await this.page.setCookie(...cookieArray);
        logger.info(`Set ${cookieArray.length} Instagram cookies for authentication`);
        logger.debug(`Cookies set: ${cookieArray.map(c => c.name).join(', ')}`);
      } else if (sessionPath) {
        // Load cookies from session file
        const fs = require('fs').promises;
        const path = require('path');
        const sessionFile = path.resolve(sessionPath);
        
        try {
          const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'));
          if (sessionData.cookies && Array.isArray(sessionData.cookies)) {
            await this.page.setCookie(...sessionData.cookies);
            logger.info(`Loaded Instagram cookies from session file: ${sessionFile}`);
          }
        } catch (error) {
          logger.warn(`Failed to load session file: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to set Instagram cookies: ${error.message}`);
    }
  }

  /**
   * Check if account is private
   * @returns {Promise<boolean>}
   */
  async checkIfPrivateAccount() {
    try {
      const isPrivate = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('This Account is Private') ||
               bodyText.includes('Private Account') ||
               !!document.querySelector('[aria-label*="private"]');
      });
      return isPrivate;
    } catch (error) {
      logger.warn(`Error checking private account: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if authentication is required
   * @returns {Promise<boolean>}
   */
  async checkAuthenticationRequired() {
    try {
      const needsAuth = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasLoginPrompt = bodyText.includes('Log In') || bodyText.includes('Sign Up');
        const hasNoPosts = document.querySelector('[role="presentation"]') === null &&
                          document.querySelector('article') === null;
        return hasLoginPrompt && hasNoPosts;
      });

      if (needsAuth) {
        logger.warn('Instagram requires authentication for this profile');
      }
      return needsAuth;
    } catch (error) {
      logger.warn(`Error checking authentication: ${error.message}`);
      return false;
    }
  }

  /**
   * Wait for posts to load
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>}
   */
  async waitForPosts(timeout = 15000) {
    try {
      // Wait for page to be fully interactive (JavaScript loaded)
      await this.page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 10000 }
      ).catch(() => {}); // Ignore if already complete

      // Wait for React/JavaScript to render content
      // Instagram loads posts dynamically, so we need to wait longer
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to trigger post loading by scrolling
      await this.page.evaluate(() => {
        window.scrollTo(0, 100);
        setTimeout(() => window.scrollTo(0, 0), 500);
      });
      
      // Wait a bit more for posts to appear after scroll
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try multiple selectors (Instagram changes frequently)
      // Instagram uses various class names and data attributes
      const selectors = [
        'article a[href*="/p/"]',                    // Post links in article (most reliable)
        'a[href*="/p/"]',                             // Any post links
        'article',                                    // Article containers
        '[role="presentation"] a[href*="/p/"]',       // Presentation role with post links
        'div[role="button"] a[href*="/p/"]',          // Button role with post links
        'a[href*="/p/"][href*="/"]',                  // Post links with specific pattern
        'img[alt*="Photo"]',                          // Photo posts
        'div[role="button"][tabindex="0"]',           // Post containers
        // Instagram-specific class patterns (may change)
        '._aagw a[href*="/p/"]',                      // Grid item class
        '._aagu a[href*="/p/"]',                      // Grid link class
        '._aagv a[href*="/p/"]',                      // Grid container class
      ];

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: timeout / selectors.length });
          // Verify we actually found posts, not just the selector
          const count = await this.page.evaluate((sel) => {
            return document.querySelectorAll(sel).length;
          }, selector);
          
          if (count > 0) {
            logger.debug(`Found posts using selector: ${selector} (${count} items)`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      // Final check: look for any post links (including reels) in the page
      // Also check for Instagram's GraphQL data in window object
      const hasPosts = await this.page.evaluate(() => {
        // Check for post links (including reels)
        const postLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
        const validLinks = Array.from(postLinks).filter(link => {
          const href = link.href || link.getAttribute('href') || '';
          return (href.includes('/p/') || href.includes('/reel/')) && !href.includes('/stories/');
        });
        if (validLinks.length > 0) {
          return true;
        }
        
        // Check if posts are in window.__additionalDataLoaded or similar
        // Instagram sometimes stores post data in window object
        if (window.__additionalDataLoaded) {
          try {
            const data = window.__additionalDataLoaded;
            // Check if it contains post data
            const dataStr = JSON.stringify(data);
            if (dataStr.includes('/p/') || dataStr.includes('shortcode')) {
              return true;
            }
          } catch (e) {}
        }
        
        // Check for article elements (posts might be in article tags)
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
          // Check if articles contain post-like content
          for (const article of articles) {
            if (article.innerHTML.includes('/p/') || article.querySelector('a[href*="/p/"]')) {
              return true;
            }
          }
        }
        
        return false;
      });

      return hasPosts;
    } catch (error) {
      logger.debug(`Error waiting for posts: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract posts from API responses (GraphQL)
   * @param {Array} apiResponses - Array of API response data
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async extractPostsFromAPI(apiResponses, username, count) {
    try {
      const posts = [];
      const seenLinks = new Set();

      for (const response of apiResponses) {
        try {
          // Instagram GraphQL responses have nested structure
          const dataStr = JSON.stringify(response);
          const postMatches = dataStr.match(/\/p\/([A-Za-z0-9_-]+)/g);
          
          if (postMatches) {
            for (const match of postMatches) {
              const shortcode = match.split('/p/')[1];
              const postLink = `https://www.instagram.com/p/${shortcode}/`;
              
              if (!seenLinks.has(postLink)) {
                seenLinks.add(postLink);
                // Try to extract more data from the response
                let postedDate = new Date().toISOString();
                let comments = 0;
                let likes = 0;
                
                // Try to find post data in the response
                try {
                  const responseStr = JSON.stringify(response);
                  // Look for timestamp patterns
                  const timestampMatch = responseStr.match(/"taken_at":(\d+)/);
                  if (timestampMatch) {
                    postedDate = new Date(parseInt(timestampMatch[1]) * 1000).toISOString();
                  }
                  // Look for like_count
                  const likesMatch = responseStr.match(/"like_count":(\d+)/);
                  if (likesMatch) {
                    likes = parseInt(likesMatch[1]);
                  }
                  // Look for comment_count
                  const commentsMatch = responseStr.match(/"comment_count":(\d+)/);
                  if (commentsMatch) {
                    comments = parseInt(commentsMatch[1]);
                  }
                } catch (e) {
                  // If parsing fails, use defaults
                }
                
                posts.push({
                  postLink,
                  postedDate,
                  comments,
                  likes,
                });
                
                if (posts.length >= count) break;
              }
            }
          }
        } catch (error) {
          logger.debug(`Error parsing API response: ${error.message}`);
        }
      }

      return posts.slice(0, count);
    } catch (error) {
      logger.warn(`Failed to extract posts from API: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract posts (including reels) from Instagram profile page
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async extractPosts(username, count) {
    try {
      // Let dynamic content render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scroll to load enough items
      await this.scrollToLoadPosts(count);

      // Extract post data from the DOM
      const posts = await this.page.evaluate((maxCount) => {
        const extractedPosts = [];
        const seenLinks = new Set();

        // Accept both /p/ and /reel/
        let links = Array.from(
          document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')
        ).filter(a => {
          const href = a.getAttribute('href') || a.href || '';
          return (href.includes('/p/') || href.includes('/reel/'))
            && !href.includes('/stories/');
        });

        for (const link of links) {
          if (extractedPosts.length >= maxCount) break;

          let postUrl = link.href || link.getAttribute('href');
          if (!postUrl) continue;

          // Normalize URL
          if (!postUrl.startsWith('http')) {
            postUrl = 'https://www.instagram.com' + postUrl;
          }

          if (seenLinks.has(postUrl)) continue;
          seenLinks.add(postUrl);

          const container =
            link.closest('article') ||
            link.closest('div[role="button"]') ||
            link.closest('[role="presentation"]') ||
            link.closest('div') ||
            link.parentElement;

          // Thumbnail + caption-ish text
          const img =
            container?.querySelector('img') ||
            link.querySelector('img');

          const imageUrl = img?.src || null;
          const altText = img?.alt || '';

          // Time (if available)
          const timeEl = container?.querySelector('time');
          const datetime =
            timeEl?.getAttribute('datetime') ||
            timeEl?.getAttribute('title') ||
            null;

          // Try to extract likes, views, comments from aria-labels or text
          const likesText = container?.querySelector('span[aria-label*="like"]')?.textContent ||
                           container?.querySelector('span[aria-label*="Like"]')?.textContent ||
                           '0';
          
          const viewsText = container?.querySelector('span[aria-label*="view"]')?.textContent ||
                           container?.querySelector('span[aria-label*="View"]')?.textContent ||
                           '0';
          
          const commentsText = container?.querySelector('span[aria-label*="comment"]')?.textContent ||
                              container?.querySelector('span[aria-label*="Comment"]')?.textContent ||
                              '0';

          extractedPosts.push({
            type: postUrl.includes('/reel/') ? 'reel' : 'post',
            postLink: postUrl,
            imageUrl,
            altText,
            postedDate: datetime,
            likesText,
            viewsText,
            commentsText,
          });
        }

        return extractedPosts;
      }, count);

      logger.debug(`Extracted ${posts.length} raw posts from page`);

      // Transform to your standard format
      return posts.map(post => ({
        type: post.type, // "reel" or "post"
        postLink: post.postLink,
        postedDate: post.postedDate
          ? this.parseInstagramDate(post.postedDate)
          : new Date().toISOString(), // Fallback to current date if not available
        altText: post.altText,
        imageUrl: post.imageUrl,
        // Extract numbers from text (e.g., "1.2K" -> 1200, "5.3M" -> 5300000)
        comments: this.extractNumber(post.commentsText || '0'), // Comments count
        likes: this.extractNumber(post.likesText || '0'),
      }));

    } catch (error) {
      logger.error(`Failed to extract Instagram posts: ${error.message}`);
      return [];
    }
  }

  /**
   * Scroll page to load more posts
   * @param {number} targetCount - Target number of posts to load
   * @returns {Promise<void>}
   */
  async scrollToLoadPosts(targetCount) {
    try {
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 5;

      while (scrollAttempts < maxScrollAttempts) {
        // Check current post count using multiple selectors
        const currentCount = await this.page.evaluate(() => {
          // Try multiple strategies to count posts
          let count = document.querySelectorAll('article a[href*="/p/"]').length;
          if (count === 0) {
            count = document.querySelectorAll('._aagw a[href*="/p/"], ._aagu a[href*="/p/"], ._aagv a[href*="/p/"]').length;
          }
          if (count === 0) {
            count = document.querySelectorAll('a[href*="/p/"]').length;
          }
          // Filter out non-post links
          if (count > 0) {
            const allLinks = document.querySelectorAll('a[href*="/p/"]');
            count = Array.from(allLinks).filter(link => {
              const href = link.href || link.getAttribute('href') || '';
              return href.includes('/p/') && !href.includes('/reel/') && !href.includes('/stories/');
            }).length;
          }
          return count;
        });

        if (currentCount >= targetCount) {
          break;
        }

        // Scroll down
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load (using setTimeout instead of deprecated waitForTimeout)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if new content loaded
        const newHeight = await this.page.evaluate(() => document.body.scrollHeight);

        if (newHeight === previousHeight) {
          break; // No more content
        }

        previousHeight = newHeight;
        scrollAttempts++;
      }
    } catch (error) {
      logger.warn(`Error during Instagram scroll: ${error.message}`);
    }
  }

  /**
   * Enrich Instagram post/reel stats via modal popup
   * Opens each post in a modal and extracts real stats (views, comments, date)
   * @param {Array<{postLink: string}>} posts - Array of posts with postLink
   * @returns {Promise<Array>} Enriched posts with stats
   */
  async enrichPostStatsViaModal(posts) {
    if (!posts || posts.length === 0) {
      return posts;
    }

    const enriched = [];
    const maxPostsToEnrich = parseInt(process.env.INSTAGRAM_MAX_MODAL_ENRICHMENT) || 15;

    // Limit to avoid rate limiting
    const postsToEnrich = posts.slice(0, maxPostsToEnrich);
    logger.info(`Enriching ${postsToEnrich.length} posts via modal (limited to ${maxPostsToEnrich})`);

    for (let i = 0; i < postsToEnrich.length; i++) {
      const post = postsToEnrich[i];
      
      try {
        logger.debug(`Enriching post ${i + 1}/${postsToEnrich.length}: ${post.postLink}`);

        // Parse URL to get relative path
        let relativePath;
        try {
          const url = new URL(post.postLink);
          relativePath = url.pathname; // /reel/XXXX/ or /p/XXXX/
        } catch (e) {
          // If URL parsing fails, try to extract path from string
          const match = post.postLink.match(/(\/p\/[^\/]+\/|\/reel\/[^\/]+\/)/);
          relativePath = match ? match[1] : null;
        }

        if (!relativePath) {
          logger.warn(`Could not parse path from ${post.postLink}, skipping enrichment`);
          enriched.push({
            ...post,
            comments: post.comments !== undefined ? post.comments : (post.share !== undefined ? post.share : 0),
            likes: post.likes || 0,
          });
          continue;
        }

        // Click post to open modal
        try {
          await this.page.click(`a[href="${relativePath}"]`, { timeout: 5000 });
        } catch (clickError) {
          // Try alternative selector
          try {
            await this.page.click(`a[href*="${relativePath}"]`, { timeout: 5000 });
          } catch (e) {
            logger.warn(`Could not click post link ${relativePath}, trying direct navigation`);
            // Fallback: navigate directly to post
            await this.page.goto(post.postLink, { waitUntil: 'networkidle2', timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Wait for modal to appear
        try {
          await this.page.waitForSelector(
            'div[role="dialog"], div[aria-modal="true"], article[role="presentation"]',
            { timeout: 8000 }
          );
          // Wait a bit more for content to fully load (comments might load asynchronously)
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e) {
          // Modal might not appear, try waiting a bit more
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Extract stats from modal with improved selectors
        const stats = await this.page.evaluate(() => {
          // Try to find modal first
          let modal =
            document.querySelector('div[role="dialog"]') ||
            document.querySelector('div[aria-modal="true"]') ||
            document.querySelector('article[role="presentation"]');

          // If no modal found, we might be on a post page (direct navigation)
          if (!modal) {
            modal = document.querySelector('article') || document.body;
          }

          if (!modal) return null;

          // Helper to get text from aria-label or textContent
          const getTextFromAriaLabel = (selectors) => {
            for (const sel of selectors) {
              const el = modal.querySelector(sel);
              if (el) {
                // Try aria-label first
                const ariaLabel = el.getAttribute('aria-label');
                if (ariaLabel) {
                  // Extract number from aria-label (e.g., "1,234 views" -> "1,234")
                  const match = ariaLabel.match(/([\d,]+(?:\.\d+)?[KMB]?)/);
                  if (match) return match[1];
                }
                // Fallback to textContent
                if (el.textContent) {
                  const text = el.textContent.trim();
                  if (text) return text;
                }
              }
            }
            return null;
          };

          // Helper to find text by pattern (more robust)
          const findTextByPattern = (patterns) => {
            const allText = modal.innerText || modal.textContent || '';
            for (const pattern of patterns) {
              const regex = new RegExp(pattern, 'i');
              const match = allText.match(regex);
              if (match) {
                // Extract number from match
                const numMatch = match[0].match(/([\d,]+(?:\.\d+)?[KMB]?)/);
                if (numMatch) return numMatch[1];
              }
            }
            return null;
          };

          // Try multiple strategies for views (reels have views)
          let viewsText = getTextFromAriaLabel([
            'span[aria-label*="views"]',
            'span[aria-label*="Views"]',
            'span[aria-label*="view"]',
            'span[aria-label*="View"]',
            '[aria-label*="plays"]',
            '[aria-label*="Plays"]',
            'span[aria-label*="play"]',
          ]);

          if (!viewsText) {
            viewsText = findTextByPattern([
              /([\d,]+(?:\.\d+)?[KMB]?)\s*(?:views?|plays?)/i,
              /([\d,]+(?:\.\d+)?[KMB]?)\s*views?/i,
            ]);
          }

          // Try multiple strategies for comments (more comprehensive)
          let commentsText = getTextFromAriaLabel([
            'span[aria-label*="comments"]',
            'span[aria-label*="Comments"]',
            'span[aria-label*="comment"]',
            'span[aria-label*="Comment"]',
            'a[href*="/comments/"] span',
            'a[href*="/comments/"]',
            'button[aria-label*="comment"] span',
            'button[aria-label*="Comment"]',
            'button[aria-label*="comments"]',
            'button[aria-label*="Comments"]',
            // Try more specific selectors
            'section[role="button"] span',
            'div[role="button"] span[aria-label*="comment"]',
            'div[role="button"] span[aria-label*="Comment"]',
          ]);

          if (!commentsText) {
            commentsText = findTextByPattern([
              /([\d,]+(?:\.\d+)?[KMB]?)\s*comments?/i,
              /comments?\s*([\d,]+(?:\.\d+)?[KMB]?)/i,
              /view\s+all\s+([\d,]+(?:\.\d+)?[KMB]?)\s*comments?/i,
              /([\d,]+(?:\.\d+)?[KMB]?)\s*comments?\s*\(/i,
            ]);
          }

          // Additional fallback: search all interactive elements for comment count
          if (!commentsText) {
            const allButtons = modal.querySelectorAll('button, a, [role="button"]');
            for (const btn of allButtons) {
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const text = btn.textContent || '';
              const combined = (ariaLabel + ' ' + text).toLowerCase();
              
              if (combined.includes('comment')) {
                // Try to extract number from aria-label or text
                const numMatch = (ariaLabel || text).match(/([\d,]+(?:\.\d+)?[KMB]?)/);
                if (numMatch) {
                  commentsText = numMatch[1];
                  break;
                }
              }
            }
          }

          // Last resort: search all spans and divs for comment-related text
          if (!commentsText) {
            const allElements = modal.querySelectorAll('span, div, button, a');
            for (const el of allElements) {
              const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
              if (text.includes('comment') && !text.includes('add') && !text.includes('write')) {
                const numMatch = text.match(/([\d,]+(?:\.\d+)?[KMB]?)/);
                if (numMatch) {
                  commentsText = numMatch[1];
                  break;
                }
              }
            }
          }

          // Try to find comment count in the comments section structure
          if (!commentsText) {
            // Look for section or div that contains comments
            const commentSections = modal.querySelectorAll('section, div[role="region"], article section');
            for (const section of commentSections) {
              const sectionText = section.textContent || '';
              // Check if this section looks like it contains comments
              if (sectionText.toLowerCase().includes('comment') || 
                  section.querySelector('ul[role="list"]') || 
                  section.querySelector('[data-testid*="comment"]')) {
                // Try to find a number near "comment" text
                const commentMatch = sectionText.match(/([\d,]+(?:\.\d+)?[KMB]?)\s*comments?/i);
                if (commentMatch) {
                  commentsText = commentMatch[1];
                  break;
                }
                // Or try reverse pattern
                const reverseMatch = sectionText.match(/comments?\s*([\d,]+(?:\.\d+)?[KMB]?)/i);
                if (reverseMatch) {
                  commentsText = reverseMatch[1];
                  break;
                }
              }
            }
          }

          // Final fallback: look for any number that appears near comment-related UI elements
          if (!commentsText) {
            // Find the comment button/link
            const commentButton = Array.from(modal.querySelectorAll('button, a')).find(el => {
              const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
              const text = (el.textContent || '').toLowerCase();
              return ariaLabel.includes('comment') || text.includes('comment');
            });
            
            if (commentButton) {
              // Look for sibling or parent elements that might contain the count
              const parent = commentButton.parentElement;
              if (parent) {
                const parentText = parent.textContent || '';
                const numMatch = parentText.match(/([\d,]+(?:\.\d+)?[KMB]?)/);
                if (numMatch) {
                  commentsText = numMatch[1];
                }
              }
            }
          }

          // Try multiple strategies for likes
          let likesText = getTextFromAriaLabel([
            'span[aria-label*="likes"]',
            'span[aria-label*="Likes"]',
            'span[aria-label*="like"]',
            'span[aria-label*="Like"]',
            'button[aria-label*="like"] span',
            'button[aria-label*="Like"]',
          ]);

          if (!likesText) {
            likesText = findTextByPattern([
              /([\d,]+(?:\.\d+)?[KMB]?)\s*likes?/i,
            ]);
          }

          // Last resort: try to find numbers near action buttons/interactive elements
          if (!likesText || !commentsText || !viewsText) {
            const actionButtons = modal.querySelectorAll('button, a[href*="/"]');
            actionButtons.forEach(btn => {
              const text = btn.textContent || btn.getAttribute('aria-label') || '';
              const numMatch = text.match(/([\d,]+(?:\.\d+)?[KMB]?)/);
              if (numMatch) {
                if (!likesText && /like/i.test(text)) {
                  likesText = numMatch[1];
                }
                if (!commentsText && /comment/i.test(text)) {
                  commentsText = numMatch[1];
                }
                if (!viewsText && /view|play/i.test(text)) {
                  viewsText = numMatch[1];
                }
              }
            });
          }

          // Get date from time element (more robust)
          let date_post = null;
          const timeEl = modal.querySelector('time');
          if (timeEl) {
            date_post = timeEl.getAttribute('datetime') || 
                       timeEl.getAttribute('title') ||
                       timeEl.getAttribute('dateTime') ||
                       null;
          }

          // Fallback: look for date in text
          if (!date_post) {
            const datePatterns = [
              /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
              /(\d{1,2}\/\d{1,2}\/\d{4})/,
            ];
            const modalText = modal.innerText || modal.textContent || '';
            for (const pattern of datePatterns) {
              const match = modalText.match(pattern);
              if (match) {
                date_post = match[1];
                break;
              }
            }
          }

          return {
            viewsText,
            commentsText,
            likesText,
            date_post,
          };
        });

        // Log extracted stats for debugging
        if (stats) {
          logger.info(`Extracted stats for ${post.postLink}:`, {
            viewsText: stats.viewsText,
            likesText: stats.likesText,
            commentsText: stats.commentsText,
            date_post: stats.date_post,
          });
          
          // If comments are missing, log modal structure for debugging
          if (!stats.commentsText) {
            const modalInfo = await this.page.evaluate(() => {
              const modal = document.querySelector('div[role="dialog"]') || 
                           document.querySelector('div[aria-modal="true"]') ||
                           document.querySelector('article[role="presentation"]') ||
                           document.querySelector('article');
              if (!modal) return null;
              
              // Find all elements with "comment" in aria-label or text
              const commentElements = Array.from(modal.querySelectorAll('*')).filter(el => {
                const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                const text = (el.textContent || '').toLowerCase();
                return ariaLabel.includes('comment') || text.includes('comment');
              });
              
              return {
                modalExists: !!modal,
                commentElementsCount: commentElements.length,
                commentElements: commentElements.slice(0, 5).map(el => ({
                  tag: el.tagName,
                  ariaLabel: el.getAttribute('aria-label'),
                  text: el.textContent?.substring(0, 50),
                })),
                allButtons: Array.from(modal.querySelectorAll('button')).map(btn => ({
                  ariaLabel: btn.getAttribute('aria-label'),
                  text: btn.textContent?.substring(0, 30),
                })).slice(0, 10),
              };
            });
            
            logger.debug(`Modal structure for debugging (no comments found):`, JSON.stringify(modalInfo, null, 2));
          }
        } else {
          logger.warn(`No stats extracted from modal for ${post.postLink}`);
        }

        // Close modal (try multiple methods)
        try {
          await this.page.keyboard.press('Escape');
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (e) {
          // Try clicking close button
          try {
            await this.page.click('button[aria-label="Close"], svg[aria-label="Close"]', { timeout: 2000 });
            await new Promise(resolve => setTimeout(resolve, 600));
          } catch (e2) {
            // If we navigated directly, go back
            if (post.postLink.includes('instagram.com')) {
              await this.page.goBack({ waitUntil: 'networkidle2' });
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Build enriched post with proper date parsing
        let postedDate = post.postedDate;
        if (stats?.date_post) {
          try {
            // Try to parse the date
            const parsedDate = new Date(stats.date_post);
            if (!isNaN(parsedDate.getTime())) {
              // Ensure date is not in the future (Instagram bug protection)
              const now = new Date();
              if (parsedDate <= now) {
                postedDate = parsedDate.toISOString();
              } else {
                logger.warn(`Date from Instagram is in the future: ${stats.date_post}, using post date instead`);
                postedDate = post.postedDate || new Date().toISOString();
              }
            } else {
              postedDate = post.postedDate || new Date().toISOString();
            }
          } catch (e) {
            logger.debug(`Failed to parse date: ${stats.date_post}`);
            postedDate = post.postedDate || new Date().toISOString();
          }
        } else {
          // If no date from modal, use post date or current date
          postedDate = post.postedDate || new Date().toISOString();
        }

        // Extract numbers with better error handling
        const extractNumberSafely = (text) => {
          if (!text) return 0;
          try {
            const num = this.extractNumber(text);
            return isNaN(num) ? 0 : num;
          } catch (e) {
            logger.debug(`Failed to extract number from: ${text}`);
            return 0;
          }
        };

        enriched.push({
          ...post,
          postLink: post.postLink,
          postedDate: postedDate,
          comments: extractNumberSafely(stats?.commentsText) || (post.comments !== undefined ? post.comments : (post.share !== undefined ? post.share : 0)),
          likes: extractNumberSafely(stats?.likesText) || (post.likes || 0),
        });

        // Random delay between posts (800-1500ms) to avoid rate limiting
        const delay = 800 + Math.random() * 700;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err) {
        logger.warn(`Failed to enrich post ${post.postLink}: ${err.message}`);

        // Try to recover by closing modal if stuck
        try {
          await this.page.keyboard.press('Escape').catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (e) {
          // Ignore recovery errors
        }

        // Add post with original/default values
        enriched.push({
          ...post,
          comments: post.comments !== undefined ? post.comments : (post.share !== undefined ? post.share : 0),
          likes: post.likes || 0,
        });
      }
    }

    // Add remaining posts that weren't enriched
    if (posts.length > maxPostsToEnrich) {
      enriched.push(...posts.slice(maxPostsToEnrich));
    }

    logger.info(`Enriched ${enriched.length} posts via modal`);
    return enriched;
  }

  /**
   * Parse Instagram date strings (relative or ISO format)
   * @param {string} dateString
   * @returns {string} ISO date string
   */
  parseInstagramDate(dateString) {
    try {
      // If already ISO format
      if (dateString.includes('T')) {
        return dateString;
      }

      // Parse relative dates
      const now = new Date();
      const lowerDate = dateString.toLowerCase();

      // Parse patterns like "2 weeks ago", "3 days ago"
      const weekMatch = lowerDate.match(/(\d+)\s*week/);
      if (weekMatch) {
        now.setDate(now.getDate() - parseInt(weekMatch[1]) * 7);
        return now.toISOString();
      }

      const dayMatch = lowerDate.match(/(\d+)\s*day/);
      if (dayMatch) {
        now.setDate(now.getDate() - parseInt(dayMatch[1]));
        return now.toISOString();
      }

      const hourMatch = lowerDate.match(/(\d+)\s*hour/);
      if (hourMatch) {
        now.setHours(now.getHours() - parseInt(hourMatch[1]));
        return now.toISOString();
      }

      const minuteMatch = lowerDate.match(/(\d+)\s*minute/);
      if (minuteMatch) {
        now.setMinutes(now.getMinutes() - parseInt(minuteMatch[1]));
        return now.toISOString();
      }

      // Default to current date
      return now.toISOString();

    } catch (error) {
      logger.warn(`Failed to parse Instagram date: ${dateString}`);
      return new Date().toISOString();
    }
  }
}

module.exports = InstagramWebStrategy;

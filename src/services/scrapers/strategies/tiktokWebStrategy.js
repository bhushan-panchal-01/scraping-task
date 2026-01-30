const WebScraperStrategy = require('./webScraperStrategy');
const logger = require('../../../utils/logger');

/**
 * TikTok web scraping strategy using Puppeteer
 */
class TikTokWebStrategy extends WebScraperStrategy {
  constructor() {
    super('TikTok');
  }

  /**
   * Get recent posts for a TikTok user via web scraping
   * @param {string} username - TikTok username (without @)
   * @param {number} count - Number of posts to fetch
   * @returns {Promise<Array>} Array of posts
   */
  async getRecentPosts(username, count = 10) {
    try {
      // Remove @ if present
      const cleanUsername = username.replace('@', '');

      logger.info(`[Web Scraping] Fetching ${count} posts for TikTok user: ${cleanUsername}`);

      // Initialize page if not already done
      if (!this.page) {
        await this.initialize();
      }

      // Navigate to TikTok profile
      const profileUrl = `https://www.tiktok.com/@${cleanUsername}`;
      await this.navigateTo(profileUrl);

      // Wait for page to load and check for various TikTok page states
      await this.waitForPageLoad();

      // Try multiple selectors (TikTok changes DOM frequently)
      const postsFound = await this.waitForPosts();
      if (!postsFound) {
        logger.warn(`Could not find posts for ${cleanUsername}, user may not exist, have no posts, or page structure changed`);
        return [];
      }

      // Extract post data from the page
      const posts = await this.extractPosts(cleanUsername, count);

      logger.info(`[Web Scraping] Successfully fetched ${posts.length} posts for TikTok user: ${cleanUsername}`);

      return posts;
    } catch (error) {
      const errorInfo = this.handleError(error, username);
      logger.error(`[Web Scraping] Failed to fetch TikTok posts for ${username}: ${errorInfo.message}`);
      return [];
    } finally {
      // Cleanup page after use
      await this.cleanup();
    }
  }

  /**
   * Wait for TikTok page to fully load
   * @returns {Promise<void>}
   */
  async waitForPageLoad() {
    try {
      // Wait for page to be interactive
      await this.page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 15000 }
      );

      // Wait a bit more for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for common TikTok page elements
      const hasContent = await this.page.evaluate(() => {
        return document.querySelector('main') !== null || 
               document.querySelector('[data-e2e="user-page"]') !== null ||
               document.body.innerText.length > 100;
      });

      if (!hasContent) {
        logger.warn('Page may not have loaded properly');
      }
    } catch (error) {
      logger.debug(`Error waiting for page load: ${error.message}`);
    }
  }

  /**
   * Wait for posts to appear using multiple selector strategies
   * @returns {Promise<boolean>}
   */
  async waitForPosts() {
    try {
      // Try multiple selectors (TikTok changes frequently)
      const selectors = [
        '[data-e2e="user-post-item"]',           // Original selector
        '[data-e2e="user-post-item-list"]',      // Alternative
        'div[class*="DivItemContainer"]',         // Class-based
        'a[href*="/video/"]',                     // Video links
        'div[data-e2e="user-post-item-desc"]',   // Post description
        'article',                                // Generic article
        '[role="listitem"]',                      // List items
      ];

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          logger.debug(`Found posts using selector: ${selector}`);
          return true;
        } catch (e) {
          continue;
        }
      }

      // If no selector worked, check if page has any video links
      const hasVideos = await this.page.evaluate(() => {
        return document.querySelectorAll('a[href*="/video/"]').length > 0;
      });

      return hasVideos;
    } catch (error) {
      logger.debug(`Error waiting for posts: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract post data from TikTok profile page
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async extractPosts(username, count) {
    try {
      // Scroll to load more videos if needed
      await this.scrollToLoadPosts(count);

      // Extract post data using page evaluation with multiple selector strategies
      const posts = await this.evaluate((maxCount) => {
        // Try multiple selectors to find posts
        let postElements = document.querySelectorAll('[data-e2e="user-post-item"]');
        
        if (postElements.length === 0) {
          postElements = document.querySelectorAll('a[href*="/video/"]');
        }
        if (postElements.length === 0) {
          postElements = document.querySelectorAll('div[class*="DivItemContainer"]');
        }
        if (postElements.length === 0) {
          postElements = document.querySelectorAll('[role="listitem"]');
        }

        const extractedPosts = [];
        const seenLinks = new Set();

        for (let i = 0; i < Math.min(postElements.length, maxCount * 2); i++) {
          const element = postElements[i];

          try {
            // Extract post link - try multiple methods
            let postLink = '';
            const linkElement = element.querySelector('a[href*="/video/"]') || 
                              element.closest('a[href*="/video/"]') ||
                              (element.tagName === 'A' ? element : null);
            
            if (linkElement) {
              postLink = linkElement.href || linkElement.getAttribute('href');
              if (postLink && !postLink.startsWith('http')) {
                postLink = 'https://www.tiktok.com' + postLink;
              }
            }

            // Skip if we've seen this link or no link found
            if (!postLink || seenLinks.has(postLink)) {
              continue;
            }
            seenLinks.add(postLink);

            // Extract views - try multiple selectors
            let viewsText = '0';
            const viewsSelectors = [
              'strong[data-e2e="video-views"]',
              '[data-e2e="video-views"]',
              'span[class*="view"]',
              'strong'
            ];
            for (const sel of viewsSelectors) {
              const el = element.querySelector(sel);
              if (el && el.textContent) {
                viewsText = el.textContent.trim();
                break;
              }
            }

            // Extract likes - try multiple selectors
            let likesText = '0';
            const likesSelectors = [
              '[data-e2e="like-count"]',
              'span[class*="like"]',
              '[aria-label*="like"]'
            ];
            for (const sel of likesSelectors) {
              const el = element.querySelector(sel);
              if (el && el.textContent) {
                likesText = el.textContent.trim();
                break;
              }
            }

            // Extract shares - try multiple selectors
            let sharesText = '0';
            const sharesSelectors = [
              '[data-e2e="share-count"]',
              'span[class*="share"]',
              '[aria-label*="share"]'
            ];
            for (const sel of sharesSelectors) {
              const el = element.querySelector(sel);
              if (el && el.textContent) {
                sharesText = el.textContent.trim();
                break;
              }
            }

            extractedPosts.push({
              postLink,
              viewsText,
              likesText,
              sharesText,
              postedDate: new Date().toISOString(),
            });

            if (extractedPosts.length >= maxCount) {
              break;
            }
          } catch (err) {
            console.error('Error extracting post data:', err);
          }
        }

        return extractedPosts;
      }, count);

      // Transform extracted data to standard format
      return posts.map(post => ({
        postLink: post.postLink,
        postedDate: post.postedDate,
        views: this.extractNumber(post.viewsText),
        likes: this.extractNumber(post.likesText),
        share: this.extractNumber(post.sharesText),
      }));
    } catch (error) {
      logger.error(`Failed to extract posts from TikTok page: ${error.message}`);
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
        // Check current number of posts using multiple selectors
        const currentCount = await this.evaluate(() => {
          let count = document.querySelectorAll('[data-e2e="user-post-item"]').length;
          if (count === 0) {
            count = document.querySelectorAll('a[href*="/video/"]').length;
          }
          if (count === 0) {
            count = document.querySelectorAll('div[class*="DivItemContainer"]').length;
          }
          return count;
        });

        if (currentCount >= targetCount) {
          break;
        }

        // Scroll down
        await this.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load (using setTimeout instead of deprecated waitForTimeout)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newHeight = await this.evaluate(() => document.body.scrollHeight);

        // If height hasn't changed, we've reached the end
        if (newHeight === previousHeight) {
          break;
        }

        previousHeight = newHeight;
        scrollAttempts++;
      }
    } catch (error) {
      logger.warn(`Error during scroll: ${error.message}`);
    }
  }
}

module.exports = TikTokWebStrategy;

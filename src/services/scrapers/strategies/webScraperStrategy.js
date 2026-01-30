const ScrapingStrategy = require('./scrapingStrategy');
const browserManager = require('../../browser/browserManager');
const logger = require('../../../utils/logger');

/**
 * Base class for web scraping strategies using Puppeteer
 */
class WebScraperStrategy extends ScrapingStrategy {
  constructor(platformName) {
    super(platformName);
    this.page = null;
  }

  /**
   * Initialize browser and page
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.debug(`Initializing web scraper for ${this.platformName}...`);
      this.page = await browserManager.createPage();
      logger.debug(`Web scraper initialized for ${this.platformName}`);
    } catch (error) {
      logger.error(`Failed to initialize web scraper for ${this.platformName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to URL with error handling
   * @param {string} url
   * @param {Object} options
   * @returns {Promise<void>}
   */
  async navigateTo(url, options = {}) {
    if (!this.page) {
      await this.initialize();
    }

    try {
      logger.debug(`Navigating to ${url}...`);
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        ...options,
      });

      // Random delay for anti-detection
      await browserManager.randomDelay();
    } catch (error) {
      logger.error(`Failed to navigate to ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for selector with timeout
   * @param {string} selector
   * @param {number} timeout
   * @returns {Promise<void>}
   */
  async waitForSelector(selector, timeout = 30000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
    } catch (error) {
      logger.warn(`Selector "${selector}" not found within ${timeout}ms`);
      throw error;
    }
  }

  /**
   * Evaluate JavaScript in page context
   * @param {Function} pageFunction
   * @param  {...any} args
   * @returns {Promise<any>}
   */
  async evaluate(pageFunction, ...args) {
    if (!this.page) {
      throw new Error('Page not initialized. Call initialize() first.');
    }
    return this.page.evaluate(pageFunction, ...args);
  }

  /**
   * Get recent posts (to be implemented by platform-specific subclass)
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async getRecentPosts(username, count) {
    throw new Error('getRecentPosts must be implemented by platform-specific subclass');
  }

  /**
   * Cleanup resources (close page)
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.page) {
      try {
        // Check if page is still connected before closing
        if (this.page.browser() && this.page.browser().isConnected()) {
          await this.page.close();
        }
        this.page = null;
        logger.debug(`Web scraper cleaned up for ${this.platformName}`);
      } catch (error) {
        // Ignore cleanup errors (page might already be closed)
        if (!error.message.includes('Target closed') && 
            !error.message.includes('No target with given id')) {
          logger.warn(`Error cleaning up web scraper: ${error.message}`);
        }
        this.page = null;
      }
    }
  }

  /**
   * Handle web scraping errors
   * @param {Error} error
   * @param {string} username
   * @returns {Object}
   */
  handleError(error, username) {
    if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
      logger.error(`${this.platformName}: Navigation timeout for user "${username}"`);
      return { error: 'timeout', message: 'Navigation timeout' };
    }

    if (error.message.includes('net::ERR_PROXY')) {
      logger.error(`${this.platformName}: Proxy connection failed`);
      return { error: 'proxy_error', message: 'Proxy connection failed' };
    }

    if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      logger.error(`${this.platformName}: Domain not resolved (possible network issue)`);
      return { error: 'network_error', message: 'Network error' };
    }

    return super.handleError(error, username);
  }
}

module.exports = WebScraperStrategy;

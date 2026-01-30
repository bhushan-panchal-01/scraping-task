const logger = require('../../utils/logger');

/**
 * Base scraper class using Strategy pattern
 */
class BaseScraper {
  constructor(platformName, strategy) {
    this.platformName = platformName;
    this.strategy = strategy;
  }

  /**
   * Initialize the scraper strategy
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.strategy && typeof this.strategy.initialize === 'function') {
      await this.strategy.initialize();
    }
  }

  /**
   * Get recent posts for a user (delegates to strategy)
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async getRecentPosts(username, count) {
    if (!this.strategy) {
      throw new Error('No scraping strategy configured');
    }

    try {
      // Ensure strategy is initialized
      if (typeof this.strategy.initialize === 'function') {
        await this.strategy.initialize();
      }

      // Delegate to strategy
      const posts = await this.strategy.getRecentPosts(username, count);
      return posts || [];
    } catch (error) {
      logger.error(`${this.platformName}: Error getting posts for ${username}: ${error.message}`);
      return [];
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.strategy && typeof this.strategy.cleanup === 'function') {
      await this.strategy.cleanup();
    }
  }

  /**
   * Extract numeric value from various formats
   * Helper method for subclasses
   * @param {*} value - Value to extract number from
   * @returns {number}
   */
  extractNumber(value) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Handle formats like "1.2K", "3.5M", etc.
      const lowerValue = value.toLowerCase().trim();

      if (lowerValue.endsWith('k')) {
        return Math.round(parseFloat(lowerValue) * 1000);
      }
      if (lowerValue.endsWith('m')) {
        return Math.round(parseFloat(lowerValue) * 1000000);
      }
      if (lowerValue.endsWith('b')) {
        return Math.round(parseFloat(lowerValue) * 1000000000);
      }

      // Try to parse as regular number
      const parsed = parseFloat(lowerValue.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }
}

module.exports = BaseScraper;

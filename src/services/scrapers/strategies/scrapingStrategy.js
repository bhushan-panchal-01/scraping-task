const logger = require('../../../utils/logger');

/**
 * Abstract base class for scraping strategies
 */
class ScrapingStrategy {
  constructor(platformName) {
    this.platformName = platformName;
  }

  /**
   * Initialize the strategy (setup any required resources)
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override in subclass if needed
  }

  /**
   * Get recent posts for a user
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>} Array of posts in standard format
   */
  async getRecentPosts(username, count) {
    throw new Error('getRecentPosts must be implemented by subclass');
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Override in subclass if needed
  }

  /**
   * Extract numeric value from various formats
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

  /**
   * Handle platform-specific errors
   * @param {Error} error
   * @param {string} username
   * @returns {Object} Error information
   */
  handleError(error, username) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    if (statusCode === 404) {
      logger.error(`${this.platformName}: User "${username}" not found`);
      return { error: 'user_not_found', message: 'User not found' };
    }

    if (statusCode === 403) {
      logger.error(`${this.platformName}: User "${username}" has private account`);
      return { error: 'private_account', message: 'Private account' };
    }

    if (statusCode === 429) {
      logger.error(`${this.platformName}: Rate limit exceeded`);
      return { error: 'rate_limit', message: 'Rate limit exceeded' };
    }

    logger.error(`${this.platformName}: Error for user "${username}": ${errorMessage}`);
    return { error: 'unknown', message: errorMessage };
  }
}

module.exports = ScrapingStrategy;
